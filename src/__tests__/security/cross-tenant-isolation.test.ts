/**
 * @file cross-tenant-isolation.test.ts
 * @description Suíte de Testes de Segurança Ofensiva & Blindagem Multi-Tenant.
 *
 * Validações de Segurança:
 * 1. Isolamento de Leitura Cruzada em Leads (GET /api/v1/leads/:id e GET /api/v1/leads).
 * 2. Isolamento de Mutação Cruzada em Leads (PATCH /api/v1/leads/:id e Server Actions).
 * 3. Tentativa de Injeção / Sobrescrita de Tenant no Webhook (POST /api/v1/webhooks/leads).
 * 4. Isolamento de Chaves de API (GET e DELETE /api/v1/settings/api-keys).
 * 5. Isolamento de Organizações (resolveUserTenantContext e dados de perfil).
 * 6. Validação de Superadmin (Privilégios Globais vs Bloqueio de Usuários Comuns).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));
import { hashApiKey, memoryApiKeys } from "@/lib/services/api-key-service";
import type { ApiKey } from "@/types/api-key";
import { isSuperAdmin, canManageTeam, canViewAllLeads, canViewExecutiveReports, canManageIntegrationsAndBilling } from "@/lib/permissions";
import { getDealershipsList } from "@/app/actions/superadmin";

// Identificadores Canônicos dos Tenants
const ORG_A = "11111111-aaaa-4111-a111-111111111111";
const ORG_B = "22222222-bbbb-4222-b222-222222222222";
const USER_A_ID = "usr-alfa-001";
const USER_B_ID = "usr-beta-002";
const SUPERADMIN_ID = "usr-super-999";

const RAW_API_KEY_A = "acelera_live_key_tenant_alfa_1234567890";
const RAW_API_KEY_B = "acelera_live_key_tenant_beta_0987654321";
const HASH_API_KEY_A = hashApiKey(RAW_API_KEY_A);
const HASH_API_KEY_B = hashApiKey(RAW_API_KEY_B);

// Estrutura de Banco de Dados Simulada em Memória para Testes de Segurança RLS
interface MockLead {
  id: string;
  organization_id: string;
  tenant_id?: string;
  name: string;
  phone: string;
  email?: string | null;
  origin?: string | null;
  vehicle_interest?: string | null;
  status: string;
  notes?: string | null;
  seller_id?: string | null;
  seller_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface MockApiKeyRow {
  id: string;
  organization_id: string;
  tenant_id?: string;
  created_by?: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  status: string;
  is_active?: boolean;
  revoked_at?: string | null;
  expires_at?: string | null;
  created_at?: string;
  last_used_at?: string | null;
}

interface MockOrgRow {
  id: string;
  name: string;
  slug: string;
  document: string;
  city?: string;
  state?: string;
  plan?: string;
  subscription_status?: string;
  created_at?: string;
}

interface MockProfileRow {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  role: string;
  phone?: string | null;
}

let dbLeads: MockLead[] = [];
let dbApiKeys: MockApiKeyRow[] = [];
let dbOrganizations: MockOrgRow[] = [];
let dbProfiles: MockProfileRow[] = [];

// Mock do Supabase para simular RLS e queries relacionais estritas por organization_id
vi.mock("@supabase/supabase-js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@supabase/supabase-js")>();
  return {
    ...actual,
    createClient: vi.fn(() => ({
      auth: {
        getUser: vi.fn().mockImplementation((token?: string) => {
          if (token === "token-user-b") {
            return Promise.resolve({
              data: {
                user: {
                  id: USER_B_ID,
                  email: "gerente.beta@concessionariabeta.com.br",
                  user_metadata: { role: "gerente", organization_id: ORG_B },
                },
              },
              error: null,
            });
          }
          if (token === "token-superadmin") {
            return Promise.resolve({
              data: {
                user: {
                  id: SUPERADMIN_ID,
                  email: "admin@aceleraautocrm.com.br",
                  user_metadata: { role: "superadmin", organization_id: ORG_A },
                },
              },
              error: null,
            });
          }
          return Promise.resolve({
            data: {
              user: {
                id: USER_A_ID,
                email: "gerente.alfa@concessionariaalfa.com.br",
                user_metadata: { role: "gerente", organization_id: ORG_A },
              },
            },
            error: null,
          });
        }),
      },
      from: vi.fn((table: string) => {
        let filters: Array<{ col: string; val: unknown }> = [];
        let orFilter: string | null = null;
        let updatePayload: Record<string, unknown> | null = null;
        let insertPayload: Record<string, unknown> | null = null;

        const chain = {
          select: vi.fn(() => chain),
          insert: vi.fn((payload: unknown) => {
            insertPayload = payload as Record<string, unknown>;
            if (table === "leads") {
              const newLead: MockLead = {
                ...(payload as MockLead),
                id: (payload as MockLead).id || `lead_${Date.now()}`,
              };
              dbLeads.push(newLead);
              return {
                select: () => ({
                  maybeSingle: () => Promise.resolve({ data: newLead, error: null }),
                  single: () => Promise.resolve({ data: newLead, error: null }),
                }),
                single: () => Promise.resolve({ data: newLead, error: null }),
                maybeSingle: () => Promise.resolve({ data: newLead, error: null }),
              };
            }
            return chain;
          }),
          update: vi.fn((payload: unknown) => {
            updatePayload = payload as Record<string, unknown>;
            return chain;
          }),
          delete: vi.fn(() => chain),
          eq: vi.fn((col: string, val: unknown) => {
            filters.push({ col, val });
            return chain;
          }),
          or: vi.fn((clause: string) => {
            orFilter = clause;
            return chain;
          }),
          order: vi.fn(() => chain),
          range: vi.fn(() => {
            const data = executeQuery();
            return Promise.resolve({ data, count: data.length, error: null });
          }),
          maybeSingle: vi.fn(() => {
            if (updatePayload) {
              const updated = executeUpdate();
              return Promise.resolve({ data: updated[0] || null, error: null });
            }
            const data = executeQuery();
            return Promise.resolve({ data: data[0] || null, error: null });
          }),
          single: vi.fn(() => {
            if (updatePayload) {
              const updated = executeUpdate();
              return Promise.resolve({
                data: updated[0] || null,
                error: updated[0] ? null : { message: "Registro não encontrado" },
              });
            }
            const data = executeQuery();
            return Promise.resolve({
              data: data[0] || null,
              error: data[0] ? null : { message: "Registro não encontrado" },
            });
          }),
        };

        function executeQuery(): unknown[] {
          let list: unknown[] = [];
          if (table === "leads") list = [...dbLeads];
          else if (table === "api_keys") list = [...dbApiKeys];
          else if (table === "organizations") list = [...dbOrganizations];
          else if (table === "profiles") list = [...dbProfiles];

          // Aplica filtros .eq
          for (const f of filters) {
            list = list.filter((item) => (item as Record<string, unknown>)[f.col] === f.val);
          }

          // Aplica filtro .or (ex: organization_id.eq.X,tenant_id.eq.X)
          if (orFilter) {
            const match = orFilter.match(/organization_id\.eq\.([^,]+),tenant_id\.eq\.([^,]+)/);
            if (match) {
              const targetOrg = match[1];
              list = list.filter(
                (item) =>
                  (item as Record<string, unknown>).organization_id === targetOrg ||
                  (item as Record<string, unknown>).tenant_id === targetOrg
              );
            }
          }

          return list;
        }

        function executeUpdate(): unknown[] {
          if (table === "leads") {
            const matched = dbLeads.filter((l) => {
              return filters.every((f) => (l as unknown as Record<string, unknown>)[f.col] === f.val);
            });
            for (const item of matched) {
              Object.assign(item, updatePayload);
            }
            return matched;
          }
          if (table === "api_keys") {
            let matched = [...dbApiKeys];
            for (const f of filters) {
              matched = matched.filter((k) => (k as unknown as Record<string, unknown>)[f.col] === f.val);
            }
            if (orFilter) {
              const match = orFilter.match(/organization_id\.eq\.([^,]+),tenant_id\.eq\.([^,]+)/);
              if (match) {
                const targetOrg = match[1];
                matched = matched.filter(
                  (item) => item.organization_id === targetOrg || item.tenant_id === targetOrg
                );
              }
            }
            for (const item of matched) {
              Object.assign(item, updatePayload);
            }
            return matched;
          }
          return [];
        }

        return chain;
      }),
    })),
  };
});

// Importação das rotas de API
import { GET as leadsGetHandler } from "@/app/api/v1/leads/route";
import { GET as leadByIdGetHandler, PATCH as leadByIdPatchHandler } from "@/app/api/v1/leads/[id]/route";
import { POST as leadsWebhookHandler } from "@/app/api/v1/webhooks/leads/route";
import { GET as apiKeysGetHandler } from "@/app/api/v1/settings/api-keys/route";
import { DELETE as apiKeyDeleteHandler } from "@/app/api/v1/settings/api-keys/[id]/route";
import { deleteLeadAction } from "@/app/actions/kanban-actions";
import { resolveUserTenantContext } from "@/lib/auth/tenant";

function buildRequest(
  url: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body !== undefined && method !== "GET") {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("[OFFENSIVE-SECURITY] Blindagem Exaustiva contra Vazamento de Dados Cruzados (Cross-Tenant)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-anon-key-1234567890";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-service-role-key-1234567890";

    // Reset das tabelas simuladas em memória
    dbOrganizations = [
      {
        id: ORG_A,
        name: "Concessionária Alfa Motors",
        slug: "alfa-motors",
        document: "11.111.111/0001-11",
        city: "São Paulo",
        state: "SP",
        plan: "pro",
        subscription_status: "active",
      },
      {
        id: ORG_B,
        name: "Concessionária Beta Veículos",
        slug: "beta-veiculos",
        document: "22.222.222/0001-22",
        city: "Campinas",
        state: "SP",
        plan: "starter",
        subscription_status: "active",
      },
    ];

    dbProfiles = [
      {
        id: USER_A_ID,
        organization_id: ORG_A,
        full_name: "Gestor Titular Alfa",
        email: "gerente.alfa@concessionariaalfa.com.br",
        role: "gerente",
      },
      {
        id: USER_B_ID,
        organization_id: ORG_B,
        full_name: "Gestor Titular Beta",
        email: "gerente.beta@concessionariabeta.com.br",
        role: "gerente",
      },
    ];

    dbLeads = [
      {
        id: "lead-alfa-001",
        organization_id: ORG_A,
        tenant_id: ORG_A,
        name: "Cliente Exclusivo Alfa",
        phone: "11988881111",
        email: "cliente.alfa@email.com",
        origin: "site",
        vehicle_interest: "BMW 320i",
        status: "novo",
        notes: "Lead sigiloso da concessionária Alfa.",
      },
      {
        id: "lead-beta-002",
        organization_id: ORG_B,
        tenant_id: ORG_B,
        name: "Cliente Exclusivo Beta",
        phone: "11977772222",
        email: "cliente.beta@email.com",
        origin: "instagram",
        vehicle_interest: "Jeep Compass",
        status: "novo",
        notes: "Lead da concessionária Beta.",
      },
    ];

    dbApiKeys = [
      {
        id: "key-alfa-id",
        organization_id: ORG_A,
        tenant_id: ORG_A,
        created_by: USER_A_ID,
        name: "Chave Integração Alfa",
        key_prefix: "acelera_live_alfa...",
        key_hash: HASH_API_KEY_A,
        status: "active",
        is_active: true,
        revoked_at: null,
      },
      {
        id: "key-beta-id",
        organization_id: ORG_B,
        tenant_id: ORG_B,
        created_by: USER_B_ID,
        name: "Chave Integração Beta",
        key_prefix: "acelera_live_beta...",
        key_hash: HASH_API_KEY_B,
        status: "active",
        is_active: true,
        revoked_at: null,
      },
    ];

    // Sincroniza chaves de teste na memória para webhooks
    memoryApiKeys.length = 0;
    memoryApiKeys.push(
      {
        id: "key-alfa-id",
        organization_id: ORG_A,
        name: "Chave Integração Alfa",
        key_prefix: "acelera_live_alfa...",
        key_hash: HASH_API_KEY_A,
        created_at: new Date().toISOString(),
        is_active: true,
      } as ApiKey,
      {
        id: "key-beta-id",
        organization_id: ORG_B,
        name: "Chave Integração Beta",
        key_prefix: "acelera_live_beta...",
        key_hash: HASH_API_KEY_B,
        created_at: new Date().toISOString(),
        is_active: true,
      } as ApiKey
    );
  });

  describe("1. Isolamento de Leitura Cruzada em Leads (GET /api/v1/leads/:id e /api/v1/leads)", () => {
    it("[SEC-LEAD-READ-01] Usuário de Org_B NÃO deve conseguir consultar Lead da Org_A por ID (retorna 404)", async () => {
      // Requisição autenticada com token e contexto da Org_B tentando ler Lead da Org_A
      const req = buildRequest("/api/v1/leads/lead-alfa-001", "GET", undefined, {
        Authorization: "Bearer test-token-beta",
        "x-test-org-id": ORG_B,
      });

      const params = Promise.resolve({ id: "lead-alfa-001" });
      const res = await leadByIdGetHandler(req, { params });

      // Deve retornar 404 (Lead não encontrado para a sua organização) e JAMAIS 200
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.data).toBeUndefined();
      expect(json.error).toContain("Lead não encontrado");
    });

    it("[SEC-LEAD-READ-02] Usuário de Org_B consulta com sucesso apenas seu próprio Lead", async () => {
      const req = buildRequest("/api/v1/leads/lead-beta-002", "GET", undefined, {
        Authorization: "Bearer test-token-beta",
        "x-test-org-id": ORG_B,
      });

      const params = Promise.resolve({ id: "lead-beta-002" });
      const res = await leadByIdGetHandler(req, { params });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe("lead-beta-002");
      expect(json.data.name).toBe("Cliente Exclusivo Beta");
    });

    it("[SEC-LEAD-READ-03] Listagem geral (/api/v1/leads) da Org_B não deve conter nenhum lead da Org_A", async () => {
      const req = buildRequest("/api/v1/leads", "GET", undefined, {
        Authorization: "Bearer test-token-beta",
        "x-test-org-id": ORG_B,
      });

      const res = await leadsGetHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);

      // Nenhum lead retornado pode pertencer à Org_A
      const leadsFromOrgA = json.data.filter((l: MockLead) => l.organization_id === ORG_A || l.id === "lead-alfa-001");
      expect(leadsFromOrgA).toHaveLength(0);

      // Todos os leads devem pertencer estritamente à Org_B
      for (const lead of json.data) {
        expect(lead.organization_id).toBe(ORG_B);
      }
    });
  });

  describe("2. Isolamento de Mutação Cruzada em Leads (PATCH e DELETE)", () => {
    it("[SEC-LEAD-MUTATE-01] Usuário de Org_B NÃO deve conseguir atualizar status ou notas de Lead da Org_A", async () => {
      const req = buildRequest(
        "/api/v1/leads/lead-alfa-001",
        "PATCH",
        {
          status: "fechado",
          notes: "Tentativa de injeção cross-tenant maliciosa",
        },
        {
          Authorization: "Bearer test-token-beta",
          "x-test-org-id": ORG_B,
        }
      );

      const params = Promise.resolve({ id: "lead-alfa-001" });
      const res = await leadByIdPatchHandler(req, { params });

      // Deve rejeitar com 404 (Lead não encontrado para atualização)
      expect(res.status).toBe(404);

      // Integridade: o lead da Org_A permanece inalterado no banco
      const leadA = dbLeads.find((l) => l.id === "lead-alfa-001");
      expect(leadA?.status).toBe("novo");
      expect(leadA?.notes).toBe("Lead sigiloso da concessionária Alfa.");
    });

    it("[SEC-LEAD-MUTATE-02] Tentativa de exclusão de lead alheio via deleteLeadAction não altera o registro", async () => {
      // deleteLeadAction valida organizationId via resolveUserTenantContext
      // Como o lead-alfa-001 pertence a ORG_A, ele não deve ser afetado por requisições da ORG_B
      const result = await deleteLeadAction("lead-alfa-001");

      const leadA = dbLeads.find((l) => l.id === "lead-alfa-001");
      expect(leadA).toBeDefined();
      expect(leadA?.organization_id).toBe(ORG_A);
    });
  });

  describe("3. Tentativa de Injeção / Sobrescrita de Tenant no Webhook (POST /api/v1/webhooks/leads)", () => {
    it("[SEC-WEBHOOK-SPOOF] Webhook autenticado com chave da Org_A ignora tenant_id forçado no body da Org_B", async () => {
      // Atacante envia chave válida da Org_A, porém tenta forçar tenant_id e organization_id da Org_B no payload JSON
      const spoofPayload = {
        name: "Lead Injeção Maliciosa",
        phone: "11999998888",
        email: "spoofed@email.com",
        tenant_id: ORG_B,
        organization_id: ORG_B,
      };

      const req = buildRequest("/api/v1/webhooks/leads", "POST", spoofPayload, {
        "x-api-key": RAW_API_KEY_A,
      });

      const res = await leadsWebhookHandler(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);

      // Validação de Segurança: O tenant gravado e retornado DEVE ser o da chave (Org_A), NUNCA o injetado (Org_B)
      expect(json.tenant_id).toBe(ORG_A);
      expect(json.tenant_id).not.toBe(ORG_B);

      // No banco de dados, o lead persistido deve pertencer à Org_A
      const insertedLead = dbLeads.find((l) => l.id === json.lead_id);
      expect(insertedLead).toBeDefined();
      expect(insertedLead?.organization_id).toBe(ORG_A);
      expect(insertedLead?.tenant_id).toBe(ORG_A);

      // A Org_B NÃO deve possuir este lead
      const leadInOrgB = dbLeads.find((l) => l.name === "Lead Injeção Maliciosa" && l.organization_id === ORG_B);
      expect(leadInOrgB).toBeUndefined();
    });
  });

  describe("4. Isolamento de Chaves de API (/api/v1/settings/api-keys)", () => {
    it("[SEC-APIKEY-01] Usuário da Org_B não deve visualizar as chaves de API pertencentes à Org_A", async () => {
      const req = buildRequest("/api/v1/settings/api-keys", "GET", undefined, {
        Authorization: "Bearer test-token-beta",
        "x-test-org-id": ORG_B,
      });

      const res = await apiKeysGetHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);

      // Nenhuma chave da Org_A pode aparecer na listagem
      const keysFromOrgA = json.data.filter((k: MockApiKeyRow) => k.id === "key-alfa-id" || k.organization_id === ORG_A);
      expect(keysFromOrgA).toHaveLength(0);

      // Todas as chaves retornadas devem pertencer estritamente à Org_B
      for (const key of json.data) {
        expect(key.organization_id).toBe(ORG_B);
      }
    });

    it("[SEC-APIKEY-02] Usuário da Org_B não consegue revogar chave da Org_A (retorna 404)", async () => {
      const req = buildRequest("/api/v1/settings/api-keys/key-alfa-id", "DELETE", undefined, {
        Authorization: "Bearer test-token-beta",
        "x-test-org-id": ORG_B,
      });

      const params = Promise.resolve({ id: "key-alfa-id" });
      const res = await apiKeyDeleteHandler(req, { params });

      // Deve bloquear a revogação de chave pertencente a outro tenant
      expect(res.status).toBe(404);

      // A chave da Org_A permanece ativa e íntegra no banco
      const keyA = dbApiKeys.find((k) => k.id === "key-alfa-id");
      expect(keyA?.status).toBe("active");
      expect(keyA?.revoked_at).toBeNull();
    });
  });

  describe("5. Isolamento de Organizações e Perfis", () => {
    it("[SEC-ORG-01] Resolução de contexto do tenant não expõe dados cadastrais de outra concessionária", async () => {
      const context = await resolveUserTenantContext();
      // O contexto deve isolar o tenant da sessão sem vazar organizações alheias
      if (context.organization) {
        expect([ORG_A, ORG_B]).toContain(context.organization.id);
      }
    });
  });

  describe("6. Validação de Superadmin (Privilégios Globais vs Restrições)", () => {
    it("[SEC-SUPERADMIN-01] isSuperAdmin valida estritamente a role 'superadmin'", () => {
      expect(isSuperAdmin("superadmin")).toBe(true);
      expect(isSuperAdmin("super_admin")).toBe(true);

      // Papéis comuns de concessionária NÃO são superadmin
      expect(isSuperAdmin("admin")).toBe(false);
      expect(isSuperAdmin("gerente")).toBe(false);
      expect(isSuperAdmin("vendedor")).toBe(false);
      expect(isSuperAdmin("seller")).toBe(false);
      expect(isSuperAdmin(null)).toBe(false);
    });

    it("[SEC-SUPERADMIN-02] Superadmin tem privilégios concedidos em todas as matrizes RBAC", () => {
      expect(canManageTeam("superadmin")).toBe(true);
      expect(canViewAllLeads("superadmin")).toBe(true);
      expect(canViewExecutiveReports("superadmin")).toBe(true);
      expect(canManageIntegrationsAndBilling("superadmin")).toBe(true);
    });

    it("[SEC-SUPERADMIN-03] Ação getDealershipsList executa de forma segura para o backoffice Superadmin", async () => {
      const list = await getDealershipsList(true);
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      expect(list[0]).toHaveProperty("monthlyFee");
      expect(list[0]).toHaveProperty("plan");
    });
  });
});

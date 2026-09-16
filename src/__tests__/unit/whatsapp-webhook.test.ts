/**
 * @file whatsapp-webhook.test.ts
 * @description Suíte de testes unitários para o webhook multi-gateway de WhatsApp (POST /api/webhooks/whatsapp).
 *
 * Cenários Cobertos:
 * 1. Autenticação Multi-Tenant:
 *    - Requisição sem token (401 Unauthorized).
 *    - Token inválido / organização inexistente (403 Forbidden).
 *    - Autenticação válida via query parameter `?token=...`.
 *    - Autenticação válida via header `x-webhook-token`.
 * 2. Mensagens do Próprio Número / Notificações:
 *    - Mensagem da própria loja (`fromMe: true`) ignorada com 200 { status: "ignored" }.
 *    - Notificação de status de entrega/leitura da Meta Cloud (sem messages) ignorada com 200 { status: "ignored" }.
 * 3. Proteção de Membros da Equipe Interna:
 *    - Remetente com mesmo telefone de vendedor/gerente/dono da loja ignorado com 200 { status: "ignored", reason: ... }.
 * 4. Deduplicação de Contatos:
 *    - Lead já existente na organização: não cria novo lead, anexa evento `WHATSAPP_MESSAGE_RECEIVED` em `lead_history`, retorna 200.
 * 5. Novo Lead & Roleta de Vendedores & SLA:
 *    - Criação de novo lead com atribuição ao vendedor com `last_lead_assigned_at` mais antigo.
 *    - Vendedor com `last_lead_assigned_at` nulo priorizado sobre vendedor já com timestamp.
 *    - Atualização do `last_lead_assigned_at` do vendedor selecionado.
 *    - Inserção do lead com `source: "whatsapp_central"`, `stage: "novos_leads"`, `sla_deadline` de 15 minutos e `assigned_to`.
 *    - Inserção de evento `LEAD_CREATED` em `lead_history`.
 *    - Retorno 201 { status: "created", leadId, assignedTo, slaLimit }.
 * 6. Suporte a Múltiplos Gateways & Sanitização:
 *    - Evolution API (data.key.remoteJid com @s.whatsapp.net e pushName).
 *    - Z-API (phone, senderName, text.message).
 *    - Meta Cloud (entry, changes, value.messages, value.contacts).
 *    - Sanitização de telefone com DDI 55, DDD e pontuações.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, normalizeWhatsAppPhone, parseWhatsAppPayload } from "@/app/api/webhooks/whatsapp/route";
import * as adminModule from "@/lib/supabase/admin";

interface MemberRecord {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  status: string;
  last_lead_assigned_at: string | null;
}

interface LeadRecord {
  id: string;
  organization_id: string;
  phone: string;
  name: string;
  source?: string | null;
  stage?: string | null;
  sla_deadline?: string | null;
  assigned_to?: string | null;
  notes?: string | null;
}

interface HistoryRecord {
  id?: string;
  lead_id: string;
  organization_id: string;
  action: string;
  description: string | null;
  created_at?: string;
}

interface ProfileRecord {
  id: string;
  organization_id: string;
  phone: string | null;
  role: string;
  full_name?: string;
  in_roulette?: boolean;
  status?: string;
  last_lead_assigned_at?: string | null;
}

interface OrgRecord {
  id: string;
  name: string;
  webhook_token: string;
  whatsapp_lead_capture_enabled?: boolean | null;
}

describe("[UNIT-WHATSAPP-WEBHOOK] Webhook WhatsApp Multi-Gateway & Roleta de Vendedores", () => {
  const TEST_ORG_ID = "org-test-1111-2222";
  const VALID_TOKEN = "valid_whatsapp_webhook_token_xyz";

  let dbOrgs: OrgRecord[];
  let dbMembers: MemberRecord[];
  let dbLeads: LeadRecord[];
  let dbHistory: HistoryRecord[];
  let dbProfiles: ProfileRecord[];

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
      text: async () => "",
    });

    dbOrgs = [
      {
        id: TEST_ORG_ID,
        name: "Auto Prime Motors",
        webhook_token: VALID_TOKEN,
        whatsapp_lead_capture_enabled: true,
      },
    ];

    dbMembers = [
      {
        id: "member-seller-1",
        user_id: "user-seller-1",
        organization_id: TEST_ORG_ID,
        role: "seller",
        status: "active",
        last_lead_assigned_at: "2026-09-14T10:00:00.000Z", // mais antigo
      },
      {
        id: "member-seller-2",
        user_id: "user-seller-2",
        organization_id: TEST_ORG_ID,
        role: "seller",
        status: "active",
        last_lead_assigned_at: "2026-09-14T12:00:00.000Z", // mais recente
      },
    ];

    dbLeads = [];
    dbHistory = [];

    dbProfiles = [
      {
        id: "user-seller-1",
        organization_id: TEST_ORG_ID,
        full_name: "Consultor Um",
        phone: "+55 (11) 98888-1111",
        role: "vendedor",
        in_roulette: true,
        status: "active",
        last_lead_assigned_at: "2026-09-14T10:00:00.000Z", // mais antigo
      },
      {
        id: "user-seller-2",
        organization_id: TEST_ORG_ID,
        full_name: "Consultor Dois",
        phone: "11988882222",
        role: "vendedor",
        in_roulette: true,
        status: "active",
        last_lead_assigned_at: "2026-09-14T12:00:00.000Z", // mais recente
      },
      {
        id: "user-manager-1",
        organization_id: TEST_ORG_ID,
        full_name: "Gerente Geral",
        phone: "5511977770000",
        role: "gerente",
        in_roulette: false,
        status: "active",
        last_lead_assigned_at: null,
      },
    ];

    // Mock do Supabase Client retornado por createAdminClient
    const mockSupabase = {
      from: vi.fn((table: string) => {
        const filters: Array<{ col: string; val: unknown }> = [];

        const builder: Record<string, unknown> = {
          select: vi.fn(() => builder),
          eq: vi.fn((col: string, val: unknown) => {
            filters.push({ col, val });
            return builder;
          }),
          maybeSingle: vi.fn(async () => {
            if (table === "organizations") {
              const tokenFilter = filters.find((f) => f.col === "webhook_token");
              const found = dbOrgs.find((o) => o.webhook_token === tokenFilter?.val);
              return { data: found || null, error: null };
            }
            if (table === "profiles") {
              const idFilter = filters.find((f) => f.col === "id");
              const found = dbProfiles.find((p) => p.id === idFilter?.val);
              return { data: found || null, error: null };
            }
            return { data: null, error: null };
          }),
          single: vi.fn(async () => {
            if (table === "leads") {
              const last = dbLeads[dbLeads.length - 1];
              return { data: last ? { id: last.id } : { id: "mock-generated-lead-id" }, error: null };
            }
            return { data: null, error: null };
          }),
          insert: vi.fn((payload: unknown) => {
            if (table === "leads") {
              const p = payload as Record<string, unknown>;
              const leadItem: LeadRecord = {
                id: (p.id as string) || `lead-gen-${Date.now()}`,
                organization_id: p.organization_id as string,
                phone: p.phone as string,
                name: p.name as string,
                source: p.source as string,
                stage: p.stage as string,
                sla_deadline: p.sla_deadline as string,
                assigned_to: p.assigned_to as string,
                notes: (p.notes as string) || null,
              };
              dbLeads.push(leadItem);
              const insertBuilder: Record<string, unknown> = {
                select: vi.fn(() => insertBuilder),
                single: vi.fn(async () => ({ data: { id: leadItem.id }, error: null })),
                then: (resolve: (val: unknown) => void) => {
                  resolve({ data: leadItem, error: null });
                },
              };
              return insertBuilder;
            }
            if (table === "lead_history") {
              const h = payload as HistoryRecord;
              dbHistory.push(h);
              const historyBuilder: Record<string, unknown> = {
                select: vi.fn(() => historyBuilder),
                single: vi.fn(async () => ({ data: h, error: null })),
                then: (resolve: (val: unknown) => void) => {
                  resolve({ data: h, error: null });
                },
              };
              return historyBuilder;
            }
            const defaultBuilder: Record<string, unknown> = {
              select: vi.fn(() => defaultBuilder),
              single: vi.fn(async () => ({ data: {}, error: null })),
              then: (resolve: (val: unknown) => void) => {
                resolve({ data: {}, error: null });
              },
            };
            return defaultBuilder;
          }),
          update: vi.fn((payload: unknown) => {
            const updateData = payload as Record<string, unknown>;
            return {
              eq: vi.fn(async (col: string, val: unknown) => {
                if (table === "profiles" && col === "id") {
                  const target = dbProfiles.find((p) => p.id === val);
                  if (target && updateData.last_lead_assigned_at !== undefined) {
                    target.last_lead_assigned_at = updateData.last_lead_assigned_at as string | null;
                  }
                }
                if (table === "organization_members" && col === "id") {
                  const target = dbMembers.find((m) => m.id === val);
                  if (target && updateData.last_lead_assigned_at !== undefined) {
                    target.last_lead_assigned_at = updateData.last_lead_assigned_at as string | null;
                  }
                }
                return { data: {}, error: null };
              }),
            };
          }),
          // Quando o builder é esperado como Promise (ex: const { data } = await supabase.from(...).select(...).eq(...))
          then: (resolve: (val: unknown) => void) => {
            if (table === "profiles") {
              const orgFilter = filters.find((f) => f.col === "organization_id");
              const res = orgFilter
                ? dbProfiles.filter((p) => p.organization_id === orgFilter.val)
                : dbProfiles;
              resolve({ data: res, error: null });
            } else if (table === "leads") {
              const orgFilter = filters.find((f) => f.col === "organization_id");
              const phoneFilter = filters.find((f) => f.col === "phone");
              let res = dbLeads;
              if (orgFilter) res = res.filter((l) => l.organization_id === orgFilter.val);
              if (phoneFilter) res = res.filter((l) => l.phone === phoneFilter.val);
              resolve({ data: res, error: null });
            } else if (table === "organization_members") {
              const orgFilter = filters.find((f) => f.col === "organization_id");
              const statusFilter = filters.find((f) => f.col === "status");
              let res = dbMembers;
              if (orgFilter) res = res.filter((m) => m.organization_id === orgFilter.val);
              if (statusFilter) res = res.filter((m) => m.status === statusFilter.val);
              resolve({ data: res, error: null });
            } else if (table === "organizations") {
              const tokenFilter = filters.find((f) => f.col === "webhook_token");
              const found = dbOrgs.find((o) => o.webhook_token === tokenFilter?.val);
              resolve({ data: found ? [found] : [], error: null });
            } else {
              resolve({ data: [], error: null });
            }
          },
        };

        return builder;
      }),
    };

    vi.spyOn(adminModule, "createAdminClient").mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof adminModule.createAdminClient>
    );
  });

  function createRequest(
    url: string,
    body?: unknown,
    headers: Record<string, string> = {}
  ): NextRequest {
    const init: { method: string; headers: Record<string, string>; body?: string } = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };
    if (body !== undefined) {
      init.body = typeof body === "string" ? body : JSON.stringify(body);
    }
    return new NextRequest(new URL(url, "http://localhost:3000"), init);
  }

  // =========================================================================
  // 1. Utilitários de Sanitização e Parsing
  // =========================================================================
  describe("Funções Utilitárias: normalizeWhatsAppPhone e parseWhatsAppPayload", () => {
    it("deve normalizar telefones removendo @s.whatsapp.net e adicionando DDI 55 quando necessário", () => {
      expect(normalizeWhatsAppPhone("5511999998888@s.whatsapp.net")).toBe("5511999998888");
      expect(normalizeWhatsAppPhone("11999998888@s.whatsapp.net")).toBe("5511999998888");
      expect(normalizeWhatsAppPhone("(11) 98765-4321")).toBe("5511987654321");
      expect(normalizeWhatsAppPhone("+55 47 99123-4567")).toBe("5547991234567");
      expect(normalizeWhatsAppPhone("")).toBe("");
      expect(normalizeWhatsAppPhone(null)).toBe("");
    });

    it("deve fazer o parse correto de payload da Evolution API", () => {
      const payload = {
        event: "messages.upsert",
        data: {
          key: {
            remoteJid: "5511912345678@s.whatsapp.net",
            fromMe: false,
          },
          pushName: "Rodrigo Silva",
          message: {
            conversation: "Tenho interesse no Corolla",
          },
        },
      };

      const parsed = parseWhatsAppPayload(payload);
      expect(parsed.fromMe).toBe(false);
      expect(parsed.phone).toBe("5511912345678");
      expect(parsed.senderName).toBe("Rodrigo Silva");
      expect(parsed.messageText).toBe("Tenho interesse no Corolla");
    });

    it("deve fazer o parse correto de payload da Z-API", () => {
      const payload = {
        phone: "5511987654321",
        senderName: "Carla Mendes",
        fromMe: false,
        text: {
          message: "Gostaria de agendar um test drive",
        },
      };

      const parsed = parseWhatsAppPayload(payload);
      expect(parsed.fromMe).toBe(false);
      expect(parsed.phone).toBe("5511987654321");
      expect(parsed.senderName).toBe("Carla Mendes");
      expect(parsed.messageText).toBe("Gostaria de agendar um test drive");
    });

    it("deve fazer o parse correto de payload da Meta Cloud", () => {
      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                value: {
                  messaging_product: "whatsapp",
                  contacts: [
                    {
                      profile: { name: "Lucas Fernandes" },
                      wa_id: "5511999994444",
                    },
                  ],
                  messages: [
                    {
                      from: "5511999994444",
                      fromMe: false,
                      text: { body: "Qual o valor à vista do Compass?" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const parsed = parseWhatsAppPayload(payload);
      expect(parsed.fromMe).toBe(false);
      expect(parsed.phone).toBe("5511999994444");
      expect(parsed.senderName).toBe("Lucas Fernandes");
      expect(parsed.messageText).toBe("Qual o valor à vista do Compass?");
      expect(parsed.isStatusUpdate).toBe(false);
    });
  });

  // =========================================================================
  // 2. Autenticação Multi-Tenant
  // =========================================================================
  describe("Autenticação do Webhook", () => {
    it("deve rejeitar com 401 quando nenhum token for fornecido", async () => {
      const req = createRequest("/api/webhooks/whatsapp", {
        phone: "11988887777",
        message: "Olá",
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("Token de webhook ausente");
    });

    it("deve rejeitar com 403 quando o token for inválido ou organização não existir", async () => {
      const req = createRequest("/api/webhooks/whatsapp?token=token_inexistente_999", {
        phone: "11988887777",
        message: "Olá",
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Token de webhook inválido");
    });

    it("deve aceitar autenticação via searchParams (?token=...)", async () => {
      const req = createRequest(`/api/webhooks/whatsapp?token=${VALID_TOKEN}`, {
        fromMe: true, // Ignorado logo após autenticação
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("ignored");
    });

    it("deve aceitar autenticação via header x-webhook-token", async () => {
      const req = createRequest(
        "/api/webhooks/whatsapp",
        { fromMe: true },
        { "x-webhook-token": VALID_TOKEN }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("ignored");
    });
  });

  // =========================================================================
  // 3. Ignorar Mensagens do Próprio Número (fromMe: true) e Status Updates
  // =========================================================================
  describe("Filtro de Mensagens do Próprio Número (fromMe)", () => {
    it("deve retornar 200 { status: 'ignored' } quando fromMe for true na raiz (Z-API)", async () => {
      const req = createRequest(`/api/webhooks/whatsapp?token=${VALID_TOKEN}`, {
        phone: "5511999998888",
        fromMe: true,
        message: "Mensagem enviada pelo atendente da loja",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ status: "ignored" });
      expect(dbLeads.length).toBe(0);
      expect(dbHistory.length).toBe(0);
    });

    it("deve retornar 200 { status: 'ignored' } quando fromMe for true em data.key (Evolution API)", async () => {
      const req = createRequest(`/api/webhooks/whatsapp?token=${VALID_TOKEN}`, {
        event: "messages.upsert",
        data: {
          key: {
            remoteJid: "5511999998888@s.whatsapp.net",
            fromMe: true,
          },
          message: {
            conversation: "Resposta enviada pela loja",
          },
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ status: "ignored" });
      expect(dbLeads.length).toBe(0);
      expect(dbHistory.length).toBe(0);
    });

    it("deve retornar 200 { status: 'ignored' } quando receber notificação de status da Meta Cloud", async () => {
      const req = createRequest(`/api/webhooks/whatsapp?token=${VALID_TOKEN}`, {
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                value: {
                  messaging_product: "whatsapp",
                  statuses: [{ id: "wamid.123", status: "delivered" }],
                },
              },
            ],
          },
        ],
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ status: "ignored" });
    });
  });

  // =========================================================================
  // 4. Segurança: Descarte de Mensagens de Membros da Equipe Interna
  // =========================================================================
  describe("Segurança: Mensagens de Membros da Equipe Interna", () => {
    it("deve retornar 200 { status: 'ignored' } sem criar lead se o remetente for consultor da loja", async () => {
      // Telefone de user-seller-1: +55 (11) 98888-1111 -> normalizado 5511988881111
      const req = createRequest(`/api/webhooks/whatsapp?token=${VALID_TOKEN}`, {
        phone: "11988881111",
        senderName: "Consultor Carlos",
        message: "Recebido o lead, obrigado!",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("ignored");
      expect(json.reason).toContain("membro da equipe interna");
      expect(dbLeads.length).toBe(0);
      expect(dbHistory.length).toBe(0);
    });

    it("deve retornar 200 { status: 'ignored' } se o remetente for o gerente da loja", async () => {
      // Telefone de user-manager-1: 5511977770000
      const req = createRequest(`/api/webhooks/whatsapp?token=${VALID_TOKEN}`, {
        phone: "5511977770000",
        senderName: "Gerente Geral",
        message: "Status da roleta de hoje?",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("ignored");
      expect(json.reason).toContain("membro da equipe interna");
      expect(dbLeads.length).toBe(0);
      expect(dbHistory.length).toBe(0);
    });
  });

  // =========================================================================
  // 5. Deduplicação de Contatos Existentes
  // =========================================================================
  describe("Deduplicação de Contatos", () => {
    it("deve anexar mensagem ao histórico de lead já existente sem criar novo lead (retornando 200)", async () => {
      // Pré-cadastra um lead existente
      const existingLeadId = "lead-existente-001";
      dbLeads.push({
        id: existingLeadId,
        organization_id: TEST_ORG_ID,
        phone: "5511991234567",
        name: "Eduardo Cliente Antigo",
        source: "whatsapp_central",
        stage: "novos_leads",
      });

      const req = createRequest(`/api/webhooks/whatsapp?token=${VALID_TOKEN}`, {
        phone: "11991234567", // Mesmo número sem DDI 55
        senderName: "Eduardo",
        text: {
          message: "Ainda tem o Civic disponível?",
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ status: "updated", action: "message_appended" });

      // Garante que nenhum novo lead foi inserido
      expect(dbLeads.length).toBe(1);

      // Garante que o evento WHATSAPP_MESSAGE_RECEIVED foi registrado em lead_history
      expect(dbHistory.length).toBe(1);
      expect(dbHistory[0].lead_id).toBe(existingLeadId);
      expect(dbHistory[0].organization_id).toBe(TEST_ORG_ID);
      expect(dbHistory[0].action).toBe("WHATSAPP_MESSAGE_RECEIVED");
      expect(dbHistory[0].description).toBe("Ainda tem o Civic disponível?");
    });
  });

  // =========================================================================
  // 6. Criação de Novo Lead, Roleta de Vendedores & SLA de 15 Minutos
  // =========================================================================
  describe("Criação de Novo Lead & Roleta de Vendedores", () => {
    it("deve criar novo lead com SLA de 15 minutos e atribuir ao vendedor com timestamp mais antigo", async () => {
      // dbMembers possui:
      // - member-seller-1 (user-seller-1) com last_lead_assigned_at: "2026-09-14T10:00:00.000Z" (mais antigo)
      // - member-seller-2 (user-seller-2) com last_lead_assigned_at: "2026-09-14T12:00:00.000Z"

      const req = createRequest(`/api/webhooks/whatsapp?token=${VALID_TOKEN}`, {
        event: "messages.upsert",
        data: {
          key: {
            remoteJid: "5511955554444@s.whatsapp.net",
            fromMe: false,
          },
          pushName: "Mariana Costa",
          message: {
            conversation: "Gostaria de simular entrada de R$ 30.000",
          },
        },
      });

      const beforeCall = Date.now();
      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();

      expect(json.status).toBe("created");
      expect(json.leadId).toBeDefined();
      expect(json.assignedTo).toBe("user-seller-1"); // O mais antigo

      // Validação do SLA: deve ser aproximadamente NOW + 15 min (+- 5 segundos)
      expect(json.slaLimit).toBeDefined();
      const slaTime = new Date(json.slaLimit).getTime();
      const expectedSla = beforeCall + 15 * 60 * 1000;
      expect(Math.abs(slaTime - expectedSla)).toBeLessThan(5000);

      // Validação da persistência do lead
      expect(dbLeads.length).toBe(1);
      const created = dbLeads[0];
      expect(created.phone).toBe("5511955554444");
      expect(created.name).toBe("Mariana Costa");
      expect(created.source).toBe("whatsapp_central");
      expect(created.stage).toBe("novos_leads");
      expect(created.assigned_to).toBe("user-seller-1");
      expect(created.notes).toBe("Gostaria de simular entrada de R$ 30.000");

      // Validação do histórico do lead
      expect(dbHistory.length).toBe(1);
      expect(dbHistory[0].action).toBe("LEAD_CREATED");
      expect(dbHistory[0].lead_id).toBe(created.id);
      expect(dbHistory[0].organization_id).toBe(TEST_ORG_ID);

      // Validação de atualização do timestamp do vendedor
      const seller1 = dbProfiles.find((p) => p.id === "user-seller-1") || dbMembers.find((m) => m.id === "member-seller-1");
      expect(seller1?.last_lead_assigned_at).toBeDefined();
      expect(new Date(seller1!.last_lead_assigned_at!).getTime()).toBeGreaterThanOrEqual(beforeCall);
    });

    it("deve priorizar vendedor com last_lead_assigned_at nulo sobre quem já recebeu leads", async () => {
      // Adiciona vendedor 3 novo que nunca recebeu leads (null)
      dbProfiles.push({
        id: "user-seller-3",
        organization_id: TEST_ORG_ID,
        full_name: "Consultor Três",
        phone: "11988883333",
        role: "vendedor",
        in_roulette: true,
        status: "active",
        last_lead_assigned_at: null,
      });
      dbMembers.push({
        id: "member-seller-3",
        user_id: "user-seller-3",
        organization_id: TEST_ORG_ID,
        role: "seller",
        status: "active",
        last_lead_assigned_at: null,
      });

      const req = createRequest(`/api/webhooks/whatsapp?token=${VALID_TOKEN}`, {
        phone: "11944443333",
        senderName: "Felipe Nunes",
        message: "Tenho um seminovo para troca",
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();

      expect(json.status).toBe("created");
      expect(json.assignedTo).toBe("user-seller-3"); // Priorizado por ser nulo

      const seller3 = dbProfiles.find((p) => p.id === "user-seller-3") || dbMembers.find((m) => m.id === "member-seller-3");
      expect(seller3?.last_lead_assigned_at).not.toBeNull();
    });

    it("deve lidar com caso onde a organização não possui membros ativos na roleta", async () => {
      // Zera membros ativos
      dbMembers = [];
      dbProfiles = [];

      const req = createRequest(`/api/webhooks/whatsapp?token=${VALID_TOKEN}`, {
        phone: "11933332222",
        senderName: "Cliente Sem Vendedor",
        message: "Olá, alguém pode me atender?",
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();

      expect(json.status).toBe("created");
      expect(json.assignedTo).toBeNull();
      expect(dbLeads.length).toBe(1);
      expect(dbLeads[0].assigned_to).toBeNull();
    });

    it("deve respeitar a flag in_roulette e ignorar vendedores pausados do plantão", async () => {
      // Configura: seller 1 pausado (in_roulette: false), seller 2 ativo (in_roulette: true)
      dbProfiles = [
        {
          id: "user-seller-paused",
          organization_id: TEST_ORG_ID,
          full_name: "Vendedor Pausado",
          phone: "11988880001",
          role: "vendedor",
          in_roulette: false, // Plantão desligado!
          status: "active",
          last_lead_assigned_at: "2026-09-14T08:00:00.000Z", // Antigo, mas desligado
        },
        {
          id: "user-seller-on-duty",
          organization_id: TEST_ORG_ID,
          full_name: "Vendedor Disponível",
          phone: "11988880002",
          role: "vendedor",
          in_roulette: true, // Disponível!
          status: "active",
          last_lead_assigned_at: "2026-09-14T12:00:00.000Z",
        },
      ];
      dbMembers = [];

      const req = createRequest(`/api/webhooks/whatsapp?token=${VALID_TOKEN}`, {
        phone: "11987659999",
        senderName: "Cliente Teste Plantão",
        message: "Quero agendar test drive",
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();

      expect(json.status).toBe("created");
      expect(json.assignedTo).toBe("user-seller-on-duty");
      expect(dbLeads[dbLeads.length - 1].assigned_to).toBe("user-seller-on-duty");
    });

    it("deve aceitar papéis 'seller' e 'vendedor' indistintamente na roleta comercial", async () => {
      dbProfiles = [
        {
          id: "user-seller-en",
          organization_id: TEST_ORG_ID,
          full_name: "Vendedor Inglês",
          phone: "11988880003",
          role: "seller", // Papel em inglês
          in_roulette: true,
          status: "active",
          last_lead_assigned_at: null,
        },
      ];
      dbMembers = [];

      const req = createRequest(`/api/webhooks/whatsapp?token=${VALID_TOKEN}`, {
        phone: "11987658888",
        senderName: "Cliente Teste Role",
        message: "Tenho proposta",
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();

      expect(json.status).toBe("created");
      expect(json.assignedTo).toBe("user-seller-en");
    });

    it("deve cadastrar com assigned_to: null caso todos os vendedores estejam com in_roulette: false", async () => {
      dbProfiles = [
        {
          id: "user-seller-off-1",
          organization_id: TEST_ORG_ID,
          full_name: "Vendedor Off 1",
          phone: "11988880004",
          role: "vendedor",
          in_roulette: false,
          status: "active",
        },
        {
          id: "user-seller-off-2",
          organization_id: TEST_ORG_ID,
          full_name: "Vendedor Off 2",
          phone: "11988880005",
          role: "seller",
          in_roulette: false,
          status: "active",
        },
      ];
      dbMembers = [];

      const req = createRequest(`/api/webhooks/whatsapp?token=${VALID_TOKEN}`, {
        phone: "11987657777",
        senderName: "Cliente No Duty",
        message: "Alguém de plantão?",
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();

      expect(json.status).toBe("created");
      expect(json.assignedTo).toBeNull();
      expect(dbLeads[dbLeads.length - 1].assigned_to).toBeNull();
    });
  });

  // =========================================================================
  // 7. Validação de Erros de Payload
  // =========================================================================
  describe("Validação de Erros de Payload", () => {
    it("deve retornar 400 se o corpo não for JSON válido", async () => {
      const req = createRequest(
        `/api/webhooks/whatsapp?token=${VALID_TOKEN}`,
        "corpo_invalido_nao_json",
        { "Content-Type": "text/plain" }
      );

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Payload JSON inválido");
    });

    it("deve retornar 400 se o telefone for vazio ou menor que 10 dígitos", async () => {
      const req = createRequest(`/api/webhooks/whatsapp?token=${VALID_TOKEN}`, {
        phone: "123",
        senderName: "Teste Curto",
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Telefone do remetente inválido");
    });
  });

  // =========================================================================
  // 8. Ativação de Captura & Mensagem de Boas-Vindas Humanizada
  // =========================================================================
  describe("Controle de Captura de Leads e Resposta Automática", () => {
    it("deve ignorar mensagem com status 200 quando whatsapp_lead_capture_enabled for false", async () => {
      // Desativa captura para a organização
      dbOrgs[0].whatsapp_lead_capture_enabled = false;

      const req = createRequest(`/api/webhooks/whatsapp?token=${VALID_TOKEN}`, {
        phone: "11988883333",
        senderName: "Cliente Desativado",
        message: "Quero saber o preço do carro",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.status).toBe("ignored");
      expect(json.reason).toContain("Captura de leads desativada");
      expect(dbLeads.length).toBe(0);
      expect(dbHistory.length).toBe(0);
    });

    it("deve disparar mensagem automática de boas-vindas com o nome do vendedor para novo lead criado", async () => {
      process.env.EVOLUTION_API_URL = "https://evolution.aceleraauto.com.br";
      process.env.EVOLUTION_API_KEY = "test_evolution_secret_key";

      dbProfiles[0].full_name = "Juliana Silva Santos";

      const req = createRequest(`/api/webhooks/whatsapp?token=${VALID_TOKEN}`, {
        phone: "11966554433",
        senderName: "Marcos Paulo",
        message: "Olá, tenho interesse no Civic",
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.status).toBe("created");

      // Verifica envio de mensagem de boas-vindas via Evolution API
      const expectedInstance = `org_${TEST_ORG_ID.replace(/-/g, "_")}`;
      expect(global.fetch).toHaveBeenCalledWith(
        `https://evolution.aceleraauto.com.br/message/sendText/${expectedInstance}`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            apikey: "test_evolution_secret_key",
            "Content-Type": "application/json",
          }),
          body: expect.stringContaining("Marcos Paulo"),
        })
      );

      // O texto deve conter o primeiro nome da vendedora escalada ("Juliana")
      const fetchCalls = vi.mocked(global.fetch).mock.calls;
      const evoCall = fetchCalls.find((call) =>
        String(call[0]).includes("/message/sendText")
      );
      expect(evoCall).toBeDefined();
      const bodyJson = JSON.parse(evoCall![1]?.body as string);
      expect(bodyJson.text).toContain("Juliana");
      expect(bodyJson.text).toContain("Auto Prime Motors");
      expect(bodyJson.number).toBe("5511966554433");
    });

    it("não deve enviar mensagem de boas-vindas na deduplicação de lead existente", async () => {
      process.env.EVOLUTION_API_URL = "https://evolution.aceleraauto.com.br";
      process.env.EVOLUTION_API_KEY = "test_evolution_secret_key";

      // Lead já existe
      dbLeads.push({
        id: "lead-existing-001",
        organization_id: TEST_ORG_ID,
        phone: "5511988885555",
        name: "Lead Antigo",
      });

      const req = createRequest(`/api/webhooks/whatsapp?token=${VALID_TOKEN}`, {
        phone: "11988885555",
        senderName: "Lead Antigo",
        message: "Segunda mensagem do cliente",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("updated");

      // Não deve chamar /message/sendText
      const fetchCalls = vi.mocked(global.fetch).mock.calls;
      const evoCall = fetchCalls.find((call) =>
        String(call[0]).includes("/message/sendText")
      );
      expect(evoCall).toBeUndefined();
    });
  });
});

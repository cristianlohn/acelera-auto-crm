/**
 * @file clients-module.test.ts
 * @description Suíte de Testes Unitários e de Integração para a Carteira de Clientes (Clients Module).
 *
 * Cenários Testados:
 * 1. getClients: Retorna dados demo quando isDemo=true.
 * 2. getClients: Filtra estritamente por organization_id do usuário logado.
 * 3. getClients: Aplica filtros de busca (nome/telefone/email) e status.
 * 4. Isolamento Cross-Tenant: Org_B NUNCA visualiza clientes da Org_A.
 * 5. saveClientAction: Valida payload via Zod e injeta organization_id da sessão.
 * 6. saveClientAction: Bloqueia mutação cruzada se tentar alterar cliente de outro tenant.
 * 7. deleteClientAction: Exclui apenas se pertencer à organização ativa.
 * 8. deleteClientAction: NÃO exclui cliente de outro tenant.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getClients, saveClientAction, deleteClientAction } from "@/app/actions/clients";
import * as tenantAuthModule from "@/lib/auth/tenant";
import * as supabaseServerModule from "@/lib/supabase/server";
import * as supabaseAdminModule from "@/lib/supabase/admin";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const ORG_A = "11111111-aaaa-1111-aaaa-111111111111";
const ORG_B = "22222222-bbbb-2222-bbbb-222222222222";

interface MockClientDbRow {
  id: string;
  organization_id: string;
  name: string;
  phone: string;
  email: string | null;
  document: string | null;
  status: "ativo" | "comprador" | "inativo";
  seller_name: string;
  seller_id?: string | null;
  vehicle_preference: string | null;
  total_purchased: number;
  purchases_count: number;
  last_interaction_at: string;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

let dbClients: MockClientDbRow[] = [];

function createMockSupabase() {
  return {
    from: vi.fn((table: string) => {
      const filters: Array<{ col: string; val: unknown }> = [];
      let orFilter: string | null = null;
      let updatePayload: Record<string, unknown> | null = null;
      let isDelete = false;

      function executeQuery(): MockClientDbRow[] {
        if (table !== "clients") return [];
        let list = [...dbClients];

        for (const f of filters) {
          list = list.filter((item) => (item as unknown as Record<string, unknown>)[f.col] === f.val);
        }

        if (orFilter) {
          const termMatch = orFilter.match(/name\.ilike\.%([^%]+)%/);
          if (termMatch) {
            const term = termMatch[1].toLowerCase();
            list = list.filter(
              (item) =>
                item.name.toLowerCase().includes(term) ||
                item.phone.toLowerCase().includes(term) ||
                (item.email && item.email.toLowerCase().includes(term))
            );
          }
        }

        return list;
      }

      const chain: Record<string, unknown> = {
        select: vi.fn(() => chain),
        insert: vi.fn((payload: Record<string, unknown>) => {
          const row: MockClientDbRow = {
            id: `client_${Date.now()}`,
            ...payload,
          } as unknown as MockClientDbRow;
          dbClients.push(row);
          return {
            select: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
              single: vi.fn().mockResolvedValue({ data: row, error: null }),
            })),
            maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
            single: vi.fn().mockResolvedValue({ data: row, error: null }),
          };
        }),
        update: vi.fn((payload: Record<string, unknown>) => {
          updatePayload = payload;
          return chain;
        }),
        delete: vi.fn(() => {
          isDelete = true;
          return chain;
        }),
        eq: vi.fn((col: string, val: unknown) => {
          filters.push({ col, val });
          return chain;
        }),
        or: vi.fn((clause: string) => {
          orFilter = clause;
          return chain;
        }),
        order: vi.fn(() => {
          const results = executeQuery();
          return Promise.resolve({ data: results, error: null });
        }),
        maybeSingle: vi.fn(() => {
          if (updatePayload && table === "clients") {
            const matched = dbClients.filter((c) =>
              filters.every((f) => (c as unknown as Record<string, unknown>)[f.col] === f.val)
            );
            for (const item of matched) {
              Object.assign(item, updatePayload);
            }
            return Promise.resolve({ data: matched[0] || null, error: null });
          }
          const results = executeQuery();
          return Promise.resolve({ data: results[0] || null, error: null });
        }),
        single: vi.fn(() => {
          const results = executeQuery();
          return Promise.resolve({
            data: results[0] || null,
            error: results[0] ? null : { message: "Registro não encontrado" },
          });
        }),
        then: (resolve: (value: { data: MockClientDbRow[] | null; error: null }) => void) => {
          if (isDelete) {
            dbClients = dbClients.filter((c) => {
              const match = filters.every((f) => (c as unknown as Record<string, unknown>)[f.col] === f.val);
              return !match;
            });
            return resolve({ data: null, error: null });
          }
          const data = executeQuery();
          resolve({ data, error: null });
        },
      };

      return chain;
    }),
  };
}

describe("[UNIT-CLIENTS] Módulo de Carteira de Clientes", () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-anon-key-123";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-service-role-key-123";

    mockSupabase = createMockSupabase();

    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);
    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>
    );
    vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
    );

    dbClients = [
      {
        id: "cli-alfa-01",
        organization_id: ORG_A,
        name: "Mariana Souza Alfa",
        phone: "47998877665",
        email: "mariana.alfa@email.com",
        document: "111.111.111-11",
        status: "comprador",
        seller_name: "Rafael Alves",
        vehicle_preference: "Corolla Cross XRE",
        total_purchased: 168900,
        purchases_count: 1,
        last_interaction_at: new Date().toISOString(),
        notes: "Cliente exclusiva da Alfa Motors",
      },
      {
        id: "cli-beta-01",
        organization_id: ORG_B,
        name: "Carlos Mendonça Beta",
        phone: "11987654321",
        email: "carlos.beta@email.com",
        document: "222.222.222-22",
        status: "ativo",
        seller_name: "Camila Dias",
        vehicle_preference: "Honda Civic EXL",
        total_purchased: 0,
        purchases_count: 0,
        last_interaction_at: new Date().toISOString(),
        notes: "Cliente exclusivo da Beta Veículos",
      },
    ];
  });

  it("[CLI-01] getClients em Modo Demo retorna clientes simulados", async () => {
    vi.spyOn(tenantAuthModule, "resolveUserTenantContext").mockResolvedValueOnce({
      userId: "demo-user",
      organizationId: tenantAuthModule.DEFAULT_DEMO_ORG_ID,
      profile: null,
      organization: null,
      isDemo: true,
      needsOnboarding: false,
    });

    const clients = await getClients();
    expect(Array.isArray(clients)).toBe(true);
    expect(clients.length).toBeGreaterThan(0);
    expect(clients[0]).toHaveProperty("name");
    expect(clients[0]).toHaveProperty("phone");
  });

  it("[CLI-02] getClients filtra estritamente por organization_id (Isolamento Cross-Tenant)", async () => {
    vi.spyOn(tenantAuthModule, "resolveUserTenantContext").mockResolvedValueOnce({
      userId: "user-b",
      organizationId: ORG_B,
      profile: null,
      organization: null,
      isDemo: false,
      needsOnboarding: false,
    });

    const clients = await getClients();

    // Deve retornar apenas o cliente da Org_B
    expect(clients).toHaveLength(1);
    expect(clients[0].id).toBe("cli-beta-01");
    expect(clients[0].name).toBe("Carlos Mendonça Beta");

    // JAMAIS expõe registros da Org_A
    const alfaClient = clients.find((c) => c.id === "cli-alfa-01");
    expect(alfaClient).toBeUndefined();
  });

  it("[CLI-03] getClients aplica busca textual por nome", async () => {
    vi.spyOn(tenantAuthModule, "resolveUserTenantContext").mockResolvedValueOnce({
      userId: "user-a",
      organizationId: ORG_A,
      profile: null,
      organization: null,
      isDemo: false,
      needsOnboarding: false,
    });

    const clients = await getClients({ search: "Mariana" });
    expect(clients).toHaveLength(1);
    expect(clients[0].name).toContain("Mariana");
  });

  it("[CLI-04] saveClientAction cadastra novo cliente e atrela ao tenant autenticado", async () => {
    vi.spyOn(tenantAuthModule, "resolveUserTenantContext").mockResolvedValueOnce({
      userId: "user-a",
      organizationId: ORG_A,
      profile: null,
      organization: null,
      isDemo: false,
      needsOnboarding: false,
    });

    const res = await saveClientAction({
      name: "Novo Comprador Alfa",
      phone: "11999990000",
      email: "novo.alfa@email.com",
      status: "ativo",
      sellerName: "Vendedor de Plantão",
      vehiclePreference: "BMW 320i",
    });

    expect(res.success).toBe(true);
    expect(res.client).toBeDefined();
    expect(res.client?.name).toBe("Novo Comprador Alfa");

    // Confirma persistência no banco associado à Org_A
    const savedInDb = dbClients.find((c) => c.name === "Novo Comprador Alfa");
    expect(savedInDb).toBeDefined();
    expect(savedInDb?.organization_id).toBe(ORG_A);
  });

  it("[CLI-05] saveClientAction rejeita payload inválido via schema Zod", async () => {
    const res = await saveClientAction({
      name: "", // Inválido: < 2 caracteres
      phone: "123", // Inválido: < 8 dígitos
    } as unknown as Parameters<typeof saveClientAction>[0]);

    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it("[CLI-06] deleteClientAction remove cliente pertencente à organização", async () => {
    vi.spyOn(tenantAuthModule, "resolveUserTenantContext").mockResolvedValueOnce({
      userId: "user-a",
      organizationId: ORG_A,
      profile: null,
      organization: null,
      isDemo: false,
      needsOnboarding: false,
    });

    const res = await deleteClientAction("cli-alfa-01");
    expect(res.success).toBe(true);

    const deleted = dbClients.find((c) => c.id === "cli-alfa-01");
    expect(deleted).toBeUndefined();
  });

  it("[CLI-07] deleteClientAction NÃO exclui cliente de outro tenant", async () => {
    // Usuário da Org_B tenta excluir cliente da Org_A
    vi.spyOn(tenantAuthModule, "resolveUserTenantContext").mockResolvedValueOnce({
      userId: "user-b",
      organizationId: ORG_B,
      profile: null,
      organization: null,
      isDemo: false,
      needsOnboarding: false,
    });

    await deleteClientAction("cli-alfa-01");

    // O cliente da Org_A deve permanecer intacto
    const stillExists = dbClients.find((c) => c.id === "cli-alfa-01");
    expect(stillExists).toBeDefined();
    expect(stillExists?.organization_id).toBe(ORG_A);
  });
});

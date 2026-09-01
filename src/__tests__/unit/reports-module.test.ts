/**
 * @file reports-module.test.ts
 * @description Suíte de Testes Unitários e de Integração para o Módulo de Relatórios Executivos (Analytics).
 *
 * Cenários Testados:
 * 1. getExecutiveReportData: Retorna 100% das fixtures no Modo Demonstração sem acessar banco de dados.
 * 2. getExecutiveReportData: Filtra estritamente por organization_id do usuário logado (Isolamento Cross-Tenant).
 * 3. getExecutiveReportData: Permite consolidação global de todos os tenants para papel 'superadmin'.
 * 4. getExecutiveReportData: Retorna EMPTY_METRICS com contadores zerados quando não há registros no período.
 * 5. getExecutiveReportData: Agrega funil, faturamento, ticket médio, canais e ranking de consultores corretamente.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getExecutiveReportData } from "@/app/actions/reports";
import { PERIOD_METRICS } from "@/lib/reports/fixtures";
import * as tenantAuthModule from "@/lib/auth/tenant";
import * as supabaseServerModule from "@/lib/supabase/server";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

const ORG_A = "11111111-aaaa-1111-aaaa-111111111111";
const ORG_B = "22222222-bbbb-2222-bbbb-222222222222";

interface MockLeadRow {
  id: string;
  organization_id: string;
  name: string;
  status: "novo" | "atendimento" | "visita" | "proposta" | "fechado";
  origin: string;
  seller_name: string;
  seller_id?: string | null;
  vehicle_interest: string;
  custom_fields?: Record<string, unknown> | null;
  created_at: string;
}

let dbLeads: MockLeadRow[] = [];

function createMockSupabase() {
  return {
    from: vi.fn((table: string) => {
      const filters: Array<{ col: string; val: unknown }> = [];
      const gteFilters: Array<{ col: string; val: string }> = [];
      const lteFilters: Array<{ col: string; val: string }> = [];

      function executeQuery(): MockLeadRow[] {
        if (table !== "leads") return [];
        let list = [...dbLeads];

        for (const f of filters) {
          list = list.filter((item) => (item as unknown as Record<string, unknown>)[f.col] === f.val);
        }

        for (const g of gteFilters) {
          list = list.filter((item) => String((item as unknown as Record<string, unknown>)[g.col]) >= g.val);
        }

        for (const l of lteFilters) {
          list = list.filter((item) => String((item as unknown as Record<string, unknown>)[l.col]) <= l.val);
        }

        return list;
      }

      const chain: Record<string, unknown> = {
        select: vi.fn(() => chain),
        eq: vi.fn((col: string, val: unknown) => {
          filters.push({ col, val });
          return chain;
        }),
        gte: vi.fn((col: string, val: string) => {
          gteFilters.push({ col, val });
          return chain;
        }),
        lte: vi.fn((col: string, val: string) => {
          lteFilters.push({ col, val });
          return chain;
        }),
        then: (resolve: (value: { data: MockLeadRow[] | null; error: null }) => void) => {
          const data = executeQuery();
          resolve({ data, error: null });
        },
      };

      return chain;
    }),
  };
}

describe("[UNIT-REPORTS] Módulo de Relatórios Executivos", () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabase();

    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);
    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>
    );

    const now = new Date().toISOString();

    dbLeads = [
      // Org A Leads
      {
        id: "lead-a-1",
        organization_id: ORG_A,
        name: "Comprador A1",
        status: "fechado",
        origin: "whatsapp",
        seller_name: "Rafael Alves",
        seller_id: "usr-rafael",
        vehicle_interest: "Honda Civic EXL",
        custom_fields: { sale_value: 150000 },
        created_at: now,
      },
      {
        id: "lead-a-2",
        organization_id: ORG_A,
        name: "Lead A2",
        status: "proposta",
        origin: "instagram",
        seller_name: "Rafael Alves",
        seller_id: "usr-rafael",
        vehicle_interest: "Toyota Corolla Cross",
        custom_fields: { sale_value: 170000 },
        created_at: now,
      },
      {
        id: "lead-a-3",
        organization_id: ORG_A,
        name: "Lead A3",
        status: "novo",
        origin: "site",
        seller_name: "Camila Dias",
        seller_id: "usr-camila",
        vehicle_interest: "Jeep Compass",
        created_at: now,
      },
      // Org B Leads
      {
        id: "lead-b-1",
        organization_id: ORG_B,
        name: "Comprador B1",
        status: "fechado",
        origin: "olx",
        seller_name: "Vendedor Beta",
        seller_id: "usr-beta",
        vehicle_interest: "BMW 320i",
        custom_fields: { sale_value: 280000 },
        created_at: now,
      },
    ];
  });

  it("[REP-01] Em Modo Demo retorna 100% das fixtures com 0 chamadas ao banco", async () => {
    vi.spyOn(tenantAuthModule, "resolveUserTenantContext").mockResolvedValueOnce({
      userId: "demo-user",
      organizationId: tenantAuthModule.DEFAULT_DEMO_ORG_ID,
      profile: null,
      organization: null,
      isDemo: true,
      needsOnboarding: false,
    });

    const data = await getExecutiveReportData("month");

    // Deve ser idêntico à fixture de Este Mês
    expect(data.kpis.revenue).toBe(PERIOD_METRICS.month.kpis.revenue);
    expect(data.kpis.conversionRate).toBe(PERIOD_METRICS.month.kpis.conversionRate);
    expect(data.funnel).toHaveLength(5);
    expect(data.channels).toHaveLength(5);
    expect(data.sellers).toHaveLength(4);

    // Nunca invoca createServerSupabaseClient
    expect(supabaseServerModule.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("[REP-02] Filtra estritamente por organization_id (Isolamento Cross-Tenant em Produção)", async () => {
    vi.spyOn(tenantAuthModule, "resolveUserTenantContext").mockResolvedValueOnce({
      userId: "user-a",
      organizationId: ORG_A,
      profile: { id: "user-a", role: "admin", organization_id: ORG_A, full_name: "Admin Alfa", email: "admin@alfa.com", phone: null, avatar_url: null, created_at: "", updated_at: "" },
      organization: null,
      isDemo: false,
      needsOnboarding: false,
    });

    const data = await getExecutiveReportData("month");

    // Org A tem 3 leads e 1 venda fechada de R$ 150.000
    expect(data.kpis.revenue).toBe(150000);
    expect(data.kpis.averageTicket).toBe(150000);
    expect(data.funnel[0].count).toBe(3); // total de leads da Org A
    expect(data.funnel[4].count).toBe(1); // 1 venda fechada

    // JAMAIS agrega dados da Org B (que tem venda de R$ 280.000)
    expect(data.kpis.revenue).not.toBe(430000);
    const betaSeller = data.sellers.find((s) => s.name === "Vendedor Beta");
    expect(betaSeller).toBeUndefined();
  });

  it("[REP-03] Permite consolidação global de todos os tenants para papel 'superadmin'", async () => {
    vi.spyOn(tenantAuthModule, "resolveUserTenantContext").mockResolvedValueOnce({
      userId: "super-id",
      organizationId: null,
      profile: { id: "super-id", role: "superadmin" as unknown as import("@/types/database.types").UserRole, organization_id: "", full_name: "Superadmin Global", email: "super@crm.com", phone: null, avatar_url: null, created_at: "", updated_at: "" },
      organization: null,
      isDemo: false,
      needsOnboarding: false,
    });

    const data = await getExecutiveReportData("month");

    // Superadmin consolida Org A (150k) + Org B (280k) = 430k
    expect(data.kpis.revenue).toBe(430000);
    expect(data.funnel[0].count).toBe(4); // 3 da Org A + 1 da Org B
    expect(data.funnel[4].count).toBe(2); // 2 vendas fechadas no total
    expect(data.kpis.averageTicket).toBe(215000); // 430.000 / 2
  });

  it("[REP-04] Retorna EMPTY_METRICS estruturado quando não há registros no período", async () => {
    vi.spyOn(tenantAuthModule, "resolveUserTenantContext").mockResolvedValueOnce({
      userId: "user-empty",
      organizationId: "org-empty-999",
      profile: { id: "user-empty", role: "admin", organization_id: "org-empty-999", full_name: "Admin Vazio", email: "vazio@loja.com", phone: null, avatar_url: null, created_at: "", updated_at: "" },
      organization: null,
      isDemo: false,
      needsOnboarding: false,
    });

    const data = await getExecutiveReportData("month");

    expect(data.kpis.revenue).toBe(0);
    expect(data.kpis.conversionRate).toBe(0);
    expect(data.kpis.averageTicket).toBe(0);
    expect(data.channels).toEqual([]);
    expect(data.sellers).toEqual([]);
    expect(data.topVehicles).toEqual([]);
    expect(data.funnel.every((f) => f.count === 0)).toBe(true);
  });

  it("[REP-05] Calcula ranking de consultores ordenado por vendas e faturamento", async () => {
    vi.spyOn(tenantAuthModule, "resolveUserTenantContext").mockResolvedValueOnce({
      userId: "user-a",
      organizationId: ORG_A,
      profile: { id: "user-a", role: "admin", organization_id: ORG_A, full_name: "Admin Alfa", email: "admin@alfa.com", phone: null, avatar_url: null, created_at: "", updated_at: "" },
      organization: null,
      isDemo: false,
      needsOnboarding: false,
    });

    const data = await getExecutiveReportData("month");

    expect(data.sellers).toHaveLength(2);
    // Rafael Alves teve 1 venda fechada (R$ 150.000) e 2 leads no total
    expect(data.sellers[0].name).toBe("Rafael Alves");
    expect(data.sellers[0].dealsCount).toBe(1);
    expect(data.sellers[0].revenue).toBe(150000);

    // Camila Dias teve 0 vendas fechadas e 1 lead
    expect(data.sellers[1].name).toBe("Camila Dias");
    expect(data.sellers[1].dealsCount).toBe(0);
    expect(data.sellers[1].revenue).toBe(0);
  });
});

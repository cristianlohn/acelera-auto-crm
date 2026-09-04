/**
 * @file manager-cockpit.test.ts
 * @description Suíte de Testes Unitários para o Cockpit do Gestor, Agregação Analítica e Cálculo de SLAs.
 *
 * Cenários Testados:
 * - [TEST-COCKPIT-PIPELINE-SUM]: Soma precisa do pipeline de vendas considerando apenas leads em etapas ativas.
 * - [TEST-COCKPIT-SLA-CALCULATION]: Cálculo exato do tempo médio de primeiro contato e taxa percentual de conformidade.
 * - [TEST-COCKPIT-VALUE-AT-RISK]: Contabilização de leads estourados (> 15 min sem contato ou > 48h parados) como valor em risco.
 * - [TEST-COCKPIT-TENANT-ISOLATION]: Validação de isolamento estrito por organization_id na Server Action.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateManagerCockpitMetrics,
  estimateLeadVehicleValue,
  type LeadAnalyticsInput,
} from "@/lib/crm/analytics";
import { getManagerCockpitMetrics } from "@/app/actions/cockpit";
import * as tenantModule from "@/lib/auth/tenant";
import * as supabaseServerModule from "@/lib/supabase/server";

describe("[UNIT-COCKPIT] Cockpit do Gestor & Agregação Analítica", () => {
  const referenceNow = new Date("2026-08-26T20:00:00.000Z");

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("[TEST-COCKPIT-PIPELINE-SUM] Cálculo do Valor do Pipeline Comercial", () => {
    it("deve somar os valores apenas de leads em etapas ativas (desconsiderando fechados/perdidos)", () => {
      const leads: LeadAnalyticsInput[] = [
        {
          id: "l1",
          status: "novo",
          vehicleInterest: "Toyota Corolla Cross 2024",
          estimatedValue: 175000,
          createdAt: new Date(referenceNow.getTime() - 5 * 60000).toISOString(),
        },
        {
          id: "l2",
          status: "visita",
          vehicleInterest: "Jeep Compass Longitude 2023",
          estimatedValue: 185000,
          createdAt: new Date(referenceNow.getTime() - 60 * 60000).toISOString(),
        },
        {
          id: "l3",
          status: "proposta",
          vehicleInterest: "Honda Civic 2022",
          estimatedValue: 145000,
          createdAt: new Date(referenceNow.getTime() - 120 * 60000).toISOString(),
        },
        {
          id: "l4",
          status: "fechado",
          vehicleInterest: "BMW 320i 2024",
          estimatedValue: 320000,
          createdAt: new Date(referenceNow.getTime() - 300 * 60000).toISOString(),
        },
      ];

      const metrics = calculateManagerCockpitMetrics(leads, { now: referenceNow });

      // Pipeline ativo deve ser l1 + l2 + l3 = 175k + 185k + 145k = 505.000 (l4 fechado não entra no pipeline ativo)
      expect(metrics.totalPipelineValue).toBe(505000);
      expect(metrics.totalActiveLeads).toBe(3);
      expect(metrics.wonLeadsCount).toBe(1);
    });

    it("deve retornar 0 quando estimatedValue não for fornecido e respeitar defaultTicket quando informado", () => {
      const leadCompass: LeadAnalyticsInput = {
        status: "atendimento",
        vehicleInterest: "Jeep Compass Série S",
      };
      const leadStrada: LeadAnalyticsInput = {
        status: "atendimento",
        vehicleInterest: "Fiat Strada Volcano",
      };

      expect(estimateLeadVehicleValue(leadCompass)).toBe(0);
      expect(estimateLeadVehicleValue(leadStrada, 105000)).toBe(105000);
    });
  });

  describe("[TEST-COCKPIT-SLA-CALCULATION] Tempo Médio de Resposta e Taxa de Conformidade", () => {
    it("deve calcular o tempo médio de resposta em minutos e a taxa de conformidade (< 15 min)", () => {
      const leads: LeadAnalyticsInput[] = [
        // Lead 1: Criado há 20 min, atendido em 5 min (em conformidade)
        {
          id: "l1",
          status: "atendimento",
          createdAt: new Date(referenceNow.getTime() - 20 * 60000).toISOString(),
          lastContactAt: new Date(referenceNow.getTime() - 15 * 60000).toISOString(),
          sellerName: "Rafael Alves",
        },
        // Lead 2: Criado há 30 min, atendido em 10 min (em conformidade)
        {
          id: "l2",
          status: "atendimento",
          createdAt: new Date(referenceNow.getTime() - 30 * 60000).toISOString(),
          lastContactAt: new Date(referenceNow.getTime() - 20 * 60000).toISOString(),
          sellerName: "Juliana Costa",
        },
        // Lead 3: Criado há 50 min, atendido em 30 min (estouro de SLA > 15 min)
        {
          id: "l3",
          status: "visita",
          createdAt: new Date(referenceNow.getTime() - 50 * 60000).toISOString(),
          lastContactAt: new Date(referenceNow.getTime() - 20 * 60000).toISOString(),
          sellerName: "Marcos Ferreira",
        },
      ];

      const metrics = calculateManagerCockpitMetrics(leads, { now: referenceNow });

      // Tempos: 5 min, 10 min, 30 min -> Média = (5 + 10 + 30) / 3 = 15.0 min
      expect(metrics.averageFirstContactMinutes).toBe(15.0);

      // Conformidade: 2 em 3 leads atendidos em <= 15 min -> 66.7%
      expect(metrics.slaComplianceRate).toBe(66.7);
    });
  });

  describe("[TEST-COCKPIT-VALUE-AT-RISK] Identificação de Oportunidades em Risco", () => {
    it("deve somar como valor em risco leads novos há mais de 15 min sem atendimento ou parados há mais de 48h", () => {
      const leads: LeadAnalyticsInput[] = [
        // Lead 1: Novo há 25 min sem contato (ESTOUROU SLA -> Em Risco)
        {
          id: "l1",
          status: "novo",
          estimatedValue: 120000,
          createdAt: new Date(referenceNow.getTime() - 25 * 60000).toISOString(),
          lastContactAt: null,
        },
        // Lead 2: Novo há 5 min (Dentro do SLA -> NÃO está em risco)
        {
          id: "l2",
          status: "novo",
          estimatedValue: 100000,
          createdAt: new Date(referenceNow.getTime() - 5 * 60000).toISOString(),
          lastContactAt: null,
        },
        // Lead 3: Proposta ativa sem contato há 60 horas (Parado > 48h -> Em Risco)
        {
          id: "l3",
          status: "proposta",
          estimatedValue: 200000,
          createdAt: new Date(referenceNow.getTime() - 72 * 3600000).toISOString(),
          lastContactAt: new Date(referenceNow.getTime() - 60 * 3600000).toISOString(),
        },
      ];

      const metrics = calculateManagerCockpitMetrics(leads, { now: referenceNow });

      // Valor em risco: l1 (120k) + l3 (200k) = 320.000
      expect(metrics.valueAtRisk).toBe(320000);
      expect(metrics.overdueLeadsCount).toBe(1);
    });
  });

  describe("[TEST-COCKPIT-TENANT-ISOLATION] Isolamento Multi-Tenant por Organização", () => {
    it("deve consultar o Supabase filtrando estritamente pelo organization_id do tenant autenticado", async () => {
      vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
        isDemo: false,
        needsOnboarding: false,
        organizationId: "org-alpha-777",
        userId: "user-alpha",
        userEmail: "gestor@alpha.com",
        profile: { full_name: "Gestor Alpha", role: "admin", email: "gestor@alpha.com", phone: null, id: "u1", organization_id: "org-alpha-777", created_at: "", updated_at: "", avatar_url: null },
        organization: { id: "org-alpha-777", name: "Concessionária Alpha", slug: "alpha", document: null, created_at: "", updated_at: "" },
      });

      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockSupabaseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              id: "l-alpha-1",
              organization_id: "org-alpha-777",
              seller_name: "Vendedor Alpha",
              name: "Cliente Alpha",
              phone: "11988887777",
              status: "proposta",
              vehicle_interest: "Toyota Corolla Cross 2024",
              last_contact_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            },
          ],
          error: null,
        }),
      };

      const mockSupabase = {
        from: vi.fn().mockReturnValue(mockSupabaseQuery),
      };

      vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue(
        mockSupabase as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>
      );

      const metrics = await getManagerCockpitMetrics();

      expect(mockSupabase.from).toHaveBeenCalledWith("leads");
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith("organization_id", "org-alpha-777");
      expect(metrics.totalActiveLeads).toBe(1);
      expect(metrics.sellerRanking[0].sellerName).toBe("Vendedor Alpha");
    });

    it("deve retornar estado estritamente zerado (R$ 0, 0%, 0 leads) para organização real sem leads no banco", async () => {
      vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
        isDemo: false,
        needsOnboarding: false,
        organizationId: "org-empty-999",
        userId: "user-empty",
        userEmail: "gestor@empty.com",
        profile: { full_name: "Gestor Vazio", role: "admin", email: "gestor@empty.com", phone: null, id: "u2", organization_id: "org-empty-999", created_at: "", updated_at: "", avatar_url: null },
        organization: { id: "org-empty-999", name: "Loja Nova Sem Leads", slug: "nova", document: null, created_at: "", updated_at: "" },
      });

      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockSupabaseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
        from: vi.fn().mockReturnValue(mockSupabaseQuery),
      } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

      const metrics = await getManagerCockpitMetrics();

      expect(metrics.totalPipelineValue).toBe(0);
      expect(metrics.valueAtRisk).toBe(0);
      expect(metrics.totalActiveLeads).toBe(0);
      expect(metrics.totalLeads).toBe(0);
      expect(metrics.wonLeadsCount).toBe(0);
      expect(metrics.overdueLeadsCount).toBe(0);
      expect(metrics.conversionRate).toBe(0);
      expect(metrics.averageFirstContactMinutes).toBe(0);
      expect(metrics.sellerRanking).toEqual([]);
      expect(metrics.bottlenecks?.withoutReturnCount).toBe(0);
      expect(metrics.bottlenecks?.proposalsWithoutFollowupCount).toBe(0);
      expect(metrics.bottlenecks?.pendingFinancingCount).toBe(0);
      expect(metrics.bottlenecks?.hotLeadsCount).toBe(0);
    });
  });

  describe("[TEST-COCKPIT-RECOMMENDATIONS-ENGINE] Motor de Recomendações Operacionais (SystemRecommendation)", () => {
    it("deve gerar recomendações dinâmicas de SLA estourado, vendedores críticos e negociações quentes", () => {
      const leads: LeadAnalyticsInput[] = [
        // 14 leads em status 'novo' criados há 20 min sem contato (Risco de R$ 1.400.000)
        ...Array.from({ length: 14 }, (_, i) => ({
          id: `lead-new-${i}`,
          status: "novo",
          stage: "primeiro_contato",
          vehicle_price: 100000,
          createdAt: new Date(referenceNow.getTime() - 20 * 60000).toISOString(),
          sellerName: "Cris Test of",
        })),
        // 6 leads em estágio quente (proposta) sem contato há mais de 24h
        ...Array.from({ length: 6 }, (_, i) => ({
          id: `lead-hot-${i}`,
          status: "proposta",
          stage: "proposal",
          vehicle_price: 120000,
          createdAt: new Date(referenceNow.getTime() - 48 * 3600000).toISOString(),
          lastContactAt: new Date(referenceNow.getTime() - 30 * 3600000).toISOString(),
          sellerName: "Cris Test of",
        })),
      ];

      const metrics = calculateManagerCockpitMetrics(leads, {
        now: referenceNow,
        activeSellers: ["Cris Test of", "Rafael Alves", "Juliana Lima"],
      });

      expect(metrics.valueAtRisk).toBe(1400000);
      expect(metrics.bottlenecks?.withoutReturnCount).toBe(14);
      expect(metrics.bottlenecks?.hotLeadsCount).toBe(6);

      const recs = metrics.systemRecommendations || [];
      expect(recs.length).toBeGreaterThanOrEqual(3);

      // 1. Alerta crítico de SLA
      const slaRec = recs.find((r) => r.id === "sla-breached");
      expect(slaRec).toBeDefined();
      expect(slaRec?.type).toBe("critical");
      expect(slaRec?.count).toBe(14);
      expect(slaRec?.title).toContain("14 leads aguardando primeiro contato urgente");
      expect(slaRec?.actionLabel).toBe("Reatribuir na Roleta");
      expect(slaRec?.actionType).toBe("reassign_roleta");

      // 2. Alerta de vendedor com SLA crítico (> 15 min)
      const sellerRec = recs.find((r) => r.id === "seller-sla-alert");
      expect(sellerRec).toBeDefined();
      expect(sellerRec?.type).toBe("warning");
      expect(sellerRec?.actionLabel).toBe("Auditar Vendedores");
      expect(sellerRec?.actionType).toBe("notify_seller");

      // 3. Oportunidade de negociações quentes
      const hotRec = recs.find((r) => r.id === "hot-leads-followup");
      expect(hotRec).toBeDefined();
      expect(hotRec?.type).toBe("opportunity");
      expect(hotRec?.count).toBe(6);
      expect(hotRec?.title).toContain("6 negociações quentes sem interação hoje");
      expect(hotRec?.actionLabel).toBe("Ver no Kanban");
      expect(hotRec?.actionType).toBe("filter_kanban");
    });

    it("deve retornar 0 recomendações pendentes quando toda a equipe estiver em dia e sem gargalos", () => {
      const leads: LeadAnalyticsInput[] = [
        {
          id: "l-ok-1",
          status: "atendimento",
          vehicle_price: 150000,
          createdAt: new Date(referenceNow.getTime() - 10 * 60000).toISOString(),
          firstContactAt: new Date(referenceNow.getTime() - 5 * 60000).toISOString(),
          lastContactAt: new Date(referenceNow.getTime() - 2 * 3600000).toISOString(),
          sellerName: "Rafael Alves",
        },
      ];

      const metrics = calculateManagerCockpitMetrics(leads, {
        now: referenceNow,
        activeSellers: ["Rafael Alves"],
      });

      expect(metrics.systemRecommendations).toEqual([]);
      expect(metrics.valueAtRisk).toBe(0);
    });
  });

  describe("[TEST-COCKPIT-SELLER-ROSTER-RANKING] Exibição de Todos os Vendedores Ativos (Mesmo com 0 Leads)", () => {
    it("deve incluir vendedores ativos com 0 leads com métricas zeradas e status verde (Em dia)", () => {
      const leads: LeadAnalyticsInput[] = [
        {
          id: "l1",
          status: "atendimento",
          vehicle_price: 120000,
          sellerName: "Cris Test of",
          createdAt: new Date(referenceNow.getTime() - 5 * 60000).toISOString(),
          firstContactAt: new Date(referenceNow.getTime() - 2 * 60000).toISOString(),
        },
      ];

      const activeSellers = ["Cris Test of", "Rafael Alves", "Juliana Lima"];

      const metrics = calculateManagerCockpitMetrics(leads, {
        now: referenceNow,
        activeSellers,
      });

      expect(metrics.sellerRanking.length).toBe(3);

      const cris = metrics.sellerRanking.find((s) => s.sellerName === "Cris Test of");
      const rafael = metrics.sellerRanking.find((s) => s.sellerName === "Rafael Alves");
      const juliana = metrics.sellerRanking.find((s) => s.sellerName === "Juliana Lima");

      expect(cris).toBeDefined();
      expect(cris?.leadsCount).toBe(1);

      expect(rafael).toBeDefined();
      expect(rafael?.leadsCount).toBe(0);
      expect(rafael?.activeDeals).toBe(0);
      expect(rafael?.wonDeals).toBe(0);
      expect(rafael?.avgResponseMinutes).toBe(0);
      expect(rafael?.slaBadge).toBe("verde");

      expect(juliana).toBeDefined();
      expect(juliana?.leadsCount).toBe(0);
      expect(juliana?.slaBadge).toBe("verde");
    });
  });
});

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
});

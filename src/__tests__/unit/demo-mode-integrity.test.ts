/**
 * @file demo-mode-integrity.test.ts
 * @description Suíte de integridade para validação das regras reais de negócio, SLA desacoplado,
 * dados canônicos e restauração do Modo Demonstração (Auto Prime Veículos).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveUserTenantContext, DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import { mockVehicles } from "@/lib/mock-data";
import {
  getDemoDataset,
  getNextBusinessAppointment,
} from "@/lib/demo/demo-dataset";
import { resetDemoStateAction } from "@/app/actions/demo-reset-actions";
import { getKanbanLeadsAction } from "@/app/actions/kanban-actions";
import {
  calculateCockpitMetrics,
  calculateManagerCockpitMetrics,
  generatePrescriptiveActions,
  type LeadAnalyticsInput,
} from "@/lib/crm/analytics";
import { getTeamSummaryMetricsAction } from "@/app/actions/team-actions";
import * as teamActionsModule from "@/app/actions/team-actions";
import * as supabaseServerModule from "@/lib/supabase/server";
import { cookies } from "next/headers";
import type { TeamMember } from "@/types/team";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("[UNIT-DEMO-INTEGRITY] Integridade Canônica do Modo Demonstração e Regras de SLA", () => {
  const mockCookieStore = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockCookieStore.get.mockReturnValue(undefined);
    (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookieStore);
  });

  it("1. analytics.ts: Lead aberto há mais de 10 dias sem atendimento continua pontuando como pendência crítica de SLA", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const leadOverdue10Days: LeadAnalyticsInput = {
      id: "lead-old-unanswered",
      name: "Carlos Alberto Antigo",
      phone: "+5547991112222",
      status: "novo",
      stage: "new",
      createdAt: tenDaysAgo,
      firstContactAt: null,
      lastContactAt: null,
      estimatedValue: 120000,
      sellerName: "Rafael Martins",
      sellerPhone: "+5547999883300",
      vehicleInterest: "Toyota Corolla 2.0 XEi",
    };

    // 1A. calculateCockpitMetrics: não deve ignorar o lead antigo sem atendimento
    const cockpitMetrics = calculateCockpitMetrics([leadOverdue10Days], 15);
    expect(cockpitMetrics.unansweredLeadsCount).toBe(1);
    expect(cockpitMetrics.slaPercentage).toBe(0);
    expect(cockpitMetrics.averageResponseMinutes).toBeGreaterThanOrEqual(14000); // 10 dias em minutos

    // 1B. calculateManagerCockpitMetrics: pendência crítica acumulada em bottlenecks e valueAtRisk
    const managerMetrics = calculateManagerCockpitMetrics([leadOverdue10Days], {
      slaLimitMinutes: 15,
      defaultTicket: 120000,
    });
    expect(managerMetrics.bottlenecks?.withoutReturnCount).toBe(1);
    expect(managerMetrics.overdueLeadsCount).toBe(1);
    expect(managerMetrics.valueAtRisk).toBe(120000);

    // 1C. generatePrescriptiveActions: gera card prescritivo com urgência 'danger' e texto de tempo em dias
    const prescriptiveActions = generatePrescriptiveActions([leadOverdue10Days], {
      slaLimitMinutes: 15,
    });
    expect(prescriptiveActions.length).toBe(1);
    expect(prescriptiveActions[0].urgencyType).toBe("danger");
    expect(prescriptiveActions[0].timeText).toContain("10 dias");
  });

  it("2. getDemoDataset(t): Timestamps gerados com precisão relativa em tempos arbitrários t", () => {
    // Timestamp fixo para validação determinística
    const arbitraryTime = new Date("2026-06-15T14:30:00.000Z").getTime();
    const dataset = getDemoDataset(arbitraryTime);

    // Lead novo (Felipe Albuquerque): exatamente 8 minutos atrás
    const newLead = dataset.leadItems.find((l) => l.id === "lead-k-101");
    expect(newLead).toBeDefined();
    const expectedNewLeadCreatedAt = new Date(arbitraryTime - 8 * 60 * 1000).toISOString();
    expect(newLead?.createdAt).toBe(expectedNewLeadCreatedAt);

    // Lead follow-up vencido (Rodrigo Mendes): exatamente 2 horas atrás
    const followupLead = dataset.leadItems.find((l) => l.id === "lead-k-103");
    expect(followupLead).toBeDefined();
    const expectedFollowupTime = new Date(arbitraryTime - 2 * 3600 * 1000).toISOString();
    expect(followupLead?.scheduledFollowUpAt).toBe(expectedFollowupTime);

    // Lead recém-atendido (Camila Duarte): criado há 35 min, atendido aos 9 min (26 min atrás)
    const attendedLead = dataset.leadItems.find((l) => l.id === "lead-k-102");
    expect(attendedLead).toBeDefined();
    const expectedAttendedCreatedAt = new Date(arbitraryTime - 35 * 60 * 1000).toISOString();
    const expectedFirstContactAt = new Date(arbitraryTime - 26 * 60 * 1000).toISOString();
    expect(attendedLead?.createdAt).toBe(expectedAttendedCreatedAt);
    expect(attendedLead?.firstContactAt).toBe(expectedFirstContactAt);
  });

  it("3. getNextBusinessAppointment: Retorna invariavelmente uma data no futuro em relação ao momento de execução", () => {
    // Cenário A: Dia útil antes das 15:30 (ex: Segunda-feira 10:00 BRT) -> 2 horas à frente no mesmo dia
    const weekdayMorning = new Date("2026-06-15T13:00:00.000Z"); // 10:00 horário local
    const apptWeekdayMorning = getNextBusinessAppointment(weekdayMorning);
    expect(apptWeekdayMorning.getTime()).toBeGreaterThan(weekdayMorning.getTime());
    expect(apptWeekdayMorning.getTime()).toBe(weekdayMorning.getTime() + 2 * 60 * 60 * 1000);

    // Cenário B: Dia útil após as 15:30 (ex: Segunda-feira 16:30 BRT) -> Próximo dia útil às 10:00 da manhã
    const weekdayAfternoon = new Date("2026-06-15T19:30:00.000Z"); // 16:30 horário local
    const apptWeekdayAfternoon = getNextBusinessAppointment(weekdayAfternoon);
    expect(apptWeekdayAfternoon.getTime()).toBeGreaterThan(weekdayAfternoon.getTime());
    expect(apptWeekdayAfternoon.getHours()).toBe(10);
    expect(apptWeekdayAfternoon.getMinutes()).toBe(0);

    // Cenário C: Fim de semana (ex: Sábado 14:00 BRT) -> Próxima segunda-feira às 10:00
    const saturday = new Date("2026-06-20T17:00:00.000Z"); // Sábado
    const apptWeekend = getNextBusinessAppointment(saturday);
    expect(apptWeekend.getTime()).toBeGreaterThan(saturday.getTime());
    expect(apptWeekend.getDay()).toBe(1); // Segunda-feira
    expect(apptWeekend.getHours()).toBe(10);

    // Cenário D: Execução no momento presente atual
    const nowAppt = getNextBusinessAppointment(new Date());
    expect(nowAppt.getTime()).toBeGreaterThan(Date.now());
  });

  it("4. Coerência relacional da Fiat Toro: Eduardo Rocha como comprador do veículo vendido e Gustavo Pinheiro com lead perdido sem colisão de vínculos", () => {
    const dataset = getDemoDataset(Date.now());

    // 4A. Veículo no estoque vendido para Eduardo Rocha através de Rafael Martins
    const toro = mockVehicles.find((v) => v.id === "v-010");
    expect(toro).toBeDefined();
    expect(toro?.status).toBe("vendido");
    expect(toro?.buyerName).toBe("Eduardo Rocha");
    expect(toro?.sellerName).toBe("Rafael Martins");
    expect(toro?.price).toBe(152000);

    // 4B. Lead Ganho de Eduardo Rocha vinculado à Fiat Toro Volcano
    const eduardoLead = dataset.leadItems.find((l) => l.name === "Eduardo Rocha");
    expect(eduardoLead).toBeDefined();
    expect(eduardoLead?.stage).toBe("won");
    expect(eduardoLead?.status).toBe("fechado");
    expect(eduardoLead?.sellerName).toBe("Rafael Martins");
    expect(eduardoLead?.estimatedValue).toBe(152000);
    expect(eduardoLead?.vehicleInterest).toContain("Fiat Toro");

    // 4C. Lead Perdido de Gustavo Pinheiro com narrativa explícita de oportunidade perdida
    const gustavoLead = dataset.leadItems.find((l) => l.name === "Gustavo Pinheiro");
    expect(gustavoLead).toBeDefined();
    expect(gustavoLead?.stage).toBe("lost");
    expect(gustavoLead?.status).toBe("fechado");
    expect(gustavoLead?.lostReason).toBe("comprou_concorrente");
    expect(gustavoLead?.notes).toContain("Eduardo Rocha");
    expect(gustavoLead?.notes).toContain("concessionária concorrente");

    // 4D. Sem colisão de identificadores
    expect(eduardoLead?.id).not.toBe(gustavoLead?.id);

    // 4E. Carteira de Clientes (/clients)
    const eduardoClient = dataset.clients.find((c) => c.name === "Eduardo Rocha");
    expect(eduardoClient).toBeDefined();
    expect(eduardoClient?.status).toBe("comprador");
    expect(eduardoClient?.totalPurchased).toBe(152000);

    const gustavoClient = dataset.clients.find((c) => c.name === "Gustavo Pinheiro");
    expect(gustavoClient).toBeDefined();
    expect(gustavoClient?.status).toBe("inativo");
    expect(gustavoClient?.notes).toContain("Eduardo Rocha");
  });

  it("5. Membro com SLA de 0 minutos e sla_sample_count > 0 considerado no cálculo da média da equipe", async () => {
    // Simula membros da equipe onde um vendedor atendeu instantaneamente (SLA = 0.0 min com 1 atendimento válido)
    const mockMembers: TeamMember[] = [
      {
        id: "m-001",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Vendedor 1 (10 min)",
        email: "v1@autoprime.com.br",
        phone: "+5547999881111",
        role: "vendedor",
        segment: "all",
        in_roulette: true,
        status: "ativo",
        monthly_goal_units: 10,
        current_sales_units: 2,
        avg_sla_minutes: 10.0,
        sla_sample_count: 2,
        attended_leads_count: 2,
        created_at: "2026-07-01T10:00:00.000Z",
      },
      {
        id: "m-002",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Vendedor 2 (Instantâneo 0 min)",
        email: "v2@autoprime.com.br",
        phone: "+5547999882222",
        role: "vendedor",
        segment: "all",
        in_roulette: true,
        status: "ativo",
        monthly_goal_units: 10,
        current_sales_units: 1,
        avg_sla_minutes: 0.0,
        sla_sample_count: 1, // Possui amostra válida, não deve ser descartado
        attended_leads_count: 1,
        created_at: "2026-07-01T10:00:00.000Z",
      },
      {
        id: "m-003",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Diretor (Sem histórico comercial)",
        email: "dir@autoprime.com.br",
        phone: "+5547999883333",
        role: "admin",
        segment: "all",
        in_roulette: false,
        status: "ativo",
        monthly_goal_units: 0,
        current_sales_units: 0,
        avg_sla_minutes: 0.0,
        sla_sample_count: 0, // Sem amostras
        attended_leads_count: 0,
        created_at: "2026-07-01T10:00:00.000Z",
      },
    ];

    vi.spyOn(teamActionsModule, "getTeamMembersAction").mockResolvedValue(mockMembers);

    const metrics = await getTeamSummaryMetricsAction(DEFAULT_DEMO_ORG_ID, mockMembers);

    // Média esperada: (10.0 + 0.0) / 2 membros com amostra válida = 5.0 minutos
    // Se o vendedor de 0.0 minutos fosse descartado (avg_sla_minutes > 0), a média seria 10.0
    expect(metrics.teamAvgSlaMinutes).toBe(5.0);
    expect(metrics.totalMembers).toBe(3);
    expect(metrics.activeInRoulette).toBe(2);
  });

  it("6. resolveUserTenantContext com cookie acelera_demo_mode=true retorna tenant DEFAULT_DEMO_ORG_ID", async () => {
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === "acelera_demo_mode") return { value: "true" };
      return undefined;
    });

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    };

    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>
    );

    const context = await resolveUserTenantContext();

    expect(context.isDemo).toBe(true);
    expect(context.organizationId).toBe(DEFAULT_DEMO_ORG_ID);
    expect(context.needsOnboarding).toBe(false);
    expect(context.organization?.name).toBe("Auto Prime Veículos");
  });

  it("7. resetDemoStateAction restaura o funil e o estoque determinístico", async () => {
    // 1. Simula mutação no estoque
    mockVehicles[0].price = 999999;
    mockVehicles.push({
      ...mockVehicles[0],
      id: "v-temp-mutate",
      plate: "MUT9A99",
    });
    expect(mockVehicles.length).toBe(11);

    // 2. Executa restauração
    const result = await resetDemoStateAction();
    expect(result.success).toBe(true);

    // 3. Valida restauração do estoque
    expect(mockVehicles.length).toBe(10);
    expect(mockVehicles[0].price).toBe(138900);
    expect(mockVehicles.find((v) => v.id === "v-temp-mutate")).toBeUndefined();

    // 4. Valida leads no kanban
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === "acelera_demo_mode") return { value: "true" };
      return undefined;
    });
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(false);

    const leads = await getKanbanLeadsAction(DEFAULT_DEMO_ORG_ID);
    expect(leads.length).toBeGreaterThanOrEqual(8);
    expect(leads.some((l) => l.name === "Felipe Albuquerque")).toBe(true);
    expect(leads.some((l) => l.name === "Eduardo Rocha")).toBe(true);
    expect(leads.some((l) => l.name === "Gustavo Pinheiro")).toBe(true);
  });
});

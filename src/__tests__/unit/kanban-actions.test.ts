/**
 * @file kanban-actions.test.ts
 * @description Suíte de testes unitários para as Server Actions do Funil de Vendas Kanban.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getKanbanLeadsAction,
  getKanbanBoardAction,
  updateLeadStageAction,
  updateLeadLostReasonAction,
  resetMemoryKanbanLeads,
} from "@/app/actions/kanban-actions";
import { DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import * as supabaseServerModule from "@/lib/supabase/server";
import * as tenantAuthModule from "@/lib/auth/tenant";

describe("[UNIT-KANBAN] Server Actions do Funil Kanban de Leads", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await resetMemoryKanbanLeads();
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(false);
  });

  it("[TEST-KANBAN-01] Deve agrupar corretamente os leads por coluna/estágio e calcular métricas no multi-tenant", async () => {
    const board = await getKanbanBoardAction(DEFAULT_DEMO_ORG_ID);

    expect(board).toBeDefined();
    expect(board.columns).toHaveLength(6);
    expect(board.totalLeadsCount).toBeGreaterThan(0);
    expect(typeof board.totalPipelineValue).toBe("number");
    expect(typeof board.conversionRate).toBe("number");

    // Valida que as 6 colunas padrão existem
    const stageIds = board.columns.map((c) => c.id);
    expect(stageIds).toContain("new");
    expect(stageIds).toContain("in_contact");
    expect(stageIds).toContain("test_drive");
    expect(stageIds).toContain("proposal");
    expect(stageIds).toContain("won");
    expect(stageIds).toContain("lost");

    // Valida que a soma de leads nas colunas bate com o total
    const sumOfColumnLeads = board.columns.reduce((acc, col) => acc + col.leads.length, 0);
    expect(sumOfColumnLeads).toBe(board.totalLeadsCount);
  });

  it("[TEST-KANBAN-02] Deve rejeitar atualização de estágio se o usuário pertencer a outra organização (RLS)", async () => {
    // Simula contexto de usuário de outra organização (não demo)
    vi.spyOn(tenantAuthModule, "resolveUserTenantContext").mockResolvedValue({
      userId: "user-attacker",
      userEmail: "attacker@email.com",
      organizationId: "org-foreign-456",
      isDemo: false,
      profile: null,
      organization: {
        id: "org-foreign-456",
        name: "Concessionária Estranha",
        slug: "concessionaria-estranha",
        document: "12345678000199",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        plan: "pro",
        subscription_status: "active",
      },
      needsOnboarding: false,
    });

    const result = await updateLeadStageAction("lead-k-101", "in_contact");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/acesso negado/i);
  });

  it("[TEST-KANBAN-03] Deve exigir motivo de perda obrigatório ao mover lead para 'lost'", async () => {
    // Tentativa de mover para 'lost' sem motivo
    const resultWithoutReason = await updateLeadStageAction("lead-k-101", "lost");
    expect(resultWithoutReason.success).toBe(false);
    expect(resultWithoutReason.error).toMatch(/motivo de descarte é obrigatório/i);

    // Tentativa com motivo muito curto
    const resultShortReason = await updateLeadStageAction("lead-k-101", "lost", "ab");
    expect(resultShortReason.success).toBe(false);
    expect(resultShortReason.error).toMatch(/motivo de descarte é obrigatório/i);
  });

  it("[TEST-KANBAN-04] Deve atualizar estágio com sucesso e persistir motivo quando válido", async () => {
    const validReason = "Cliente optou por veículo seminovo de particular.";
    const result = await updateLeadLostReasonAction("lead-k-101", validReason);

    expect(result.success).toBe(true);
    expect(result.lead?.stage).toBe("lost");
    expect(result.lead?.lost_reason).toBe(validReason);

    const leads = await getKanbanLeadsAction(DEFAULT_DEMO_ORG_ID);
    const updatedLead = leads.find((l) => l.id === "lead-k-101");
    expect(updatedLead?.stage).toBe("lost");
    expect(updatedLead?.lost_reason).toBe(validReason);
  });
});

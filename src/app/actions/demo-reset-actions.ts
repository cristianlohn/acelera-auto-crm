/**
 * @file demo-reset-actions.ts
 * @description Server Action para restauração determinística do estado em memória do Modo Demonstração.
 */

"use server";

import { revalidatePath } from "next/cache";
import { resetMemoryKanbanLeads } from "@/app/actions/kanban-actions";
import { resetMockVehicles } from "@/lib/mock-data";
import { resetMemoryClients } from "@/app/actions/clients";
import { resetMemoryTeamMembers } from "@/lib/crm/team-memory";

export interface ResetDemoStateResult {
  success: boolean;
  message: string;
}

/**
 * Restaura o estado em memória do Modo Demonstração para os dados canônicos iniciais da Auto Prime Veículos.
 */
export async function resetDemoStateAction(): Promise<ResetDemoStateResult> {
  try {
    await resetMemoryKanbanLeads();
    resetMockVehicles();
    await resetMemoryClients();
    resetMemoryTeamMembers();

    revalidatePath("/");
    revalidatePath("/leads");
    revalidatePath("/vehicles");
    revalidatePath("/clients");
    revalidatePath("/customers");
    revalidatePath("/reports");
    revalidatePath("/team");

    return {
      success: true,
      message: "Ambiente de demonstração restaurado para o estado inicial com sucesso!",
    };
  } catch (error) {
    console.error("[Reset Demo State Error]", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro ao restaurar demonstração.",
    };
  }
}

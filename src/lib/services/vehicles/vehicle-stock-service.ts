/**
 * @file vehicle-stock-service.ts
 * @description Serviço de sincronização e baixa automática de estoque de veículos
 * quando um lead atinge a etapa de fechamento ("won" / "fechado") ou sofre rollback.
 */

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createServerSupabaseClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { mockVehicles } from "@/lib/mock-data";

/**
 * Identifica se uma etapa/status do pipeline representa uma venda concluída / ganho.
 */
export function isWonStageOrStatus(stageOrStatus?: string | null): boolean {
  if (!stageOrStatus) return false;
  const s = String(stageOrStatus).toLowerCase().trim();
  return (
    s === "won" ||
    s === "fechado" ||
    s === "ganho" ||
    s === "venda_concluida" ||
    s === "venda-concluida" ||
    s === "sold"
  );
}

export interface SyncVehicleStockParams {
  organizationId: string;
  vehicleId?: string | null;
  targetStage: string;
  previousStage?: string | null;
  isDemo?: boolean;
}

/**
 * Atualiza o status do veículo no estoque conforme a transição de etapa do lead:
 * - Se movido para Ganho (won): marca o veículo como "vendido".
 * - Se movido de Ganho para uma etapa anterior (rollback): reverte o veículo para "disponivel".
 */
export async function syncVehicleStockOnStageChange({
  organizationId,
  vehicleId,
  targetStage,
  previousStage,
  isDemo,
}: SyncVehicleStockParams): Promise<{ updated: boolean; newVehicleStatus?: "vendido" | "disponivel" }> {
  if (!vehicleId) {
    return { updated: false };
  }

  const isNewStageWon = isWonStageOrStatus(targetStage);
  const wasPrevStageWon = isWonStageOrStatus(previousStage);

  // Se não houve alteração no estado de ganho/fechamento, não há baixa de estoque necessária
  if (isNewStageWon === wasPrevStageWon && previousStage !== undefined && previousStage !== null) {
    return { updated: false };
  }

  const targetVehicleStatus: "vendido" | "disponivel" = isNewStageWon ? "vendido" : "disponivel";
  const nowIso = new Date().toISOString();

  // 1. Atualização em Memória / Modo Demonstração
  if (isDemo || !isSupabaseServerConfigured()) {
    const mockVehicle = mockVehicles.find((v) => v.id === vehicleId);
    if (mockVehicle) {
      mockVehicle.status = targetVehicleStatus;
    }
  }

  // 2. Atualização Relacional no Supabase (Produção / Multi-tenant)
  if (isSupabaseServerConfigured() && !isDemo) {
    try {
      let client;
      try {
        client = createAdminClient();
      } catch {
        client = await createServerSupabaseClient();
      }

      await client
        .from("vehicles")
        .update({
          status: targetVehicleStatus,
          updated_at: nowIso,
        })
        .eq("id", vehicleId)
        .eq("organization_id", organizationId);
    } catch (err) {
      console.warn("[syncVehicleStockOnStageChange] Falha ao atualizar status do veículo no estoque:", err);
    }
  }

  // 3. Invalidação de Cache das Telas de Estoque e Leads
  try {
    revalidatePath("/vehicles");
    revalidatePath("/estoque");
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard");
    revalidatePath("/leads");
  } catch {
    // Revalidação silenciosa em testes
  }

  return {
    updated: true,
    newVehicleStatus: targetVehicleStatus,
  };
}

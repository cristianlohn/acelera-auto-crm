/**
 * @file vehicle-stock-sync.test.ts
 * @description Testes unitários para a sincronização e baixa automática de estoque na mudança de etapa do Kanban.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isWonStageOrStatus,
  syncVehicleStockOnStageChange,
} from "@/lib/services/vehicles/vehicle-stock-service";
import { mockVehicles } from "@/lib/mock-data";

describe("[UNIT-VEHICLE-STOCK-SYNC] Baixa e Rollback de Estoque de Veículos no Kanban", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[TEST-STOCK-1] isWonStageOrStatus deve identificar corretamente etapas de fechamento", () => {
    expect(isWonStageOrStatus("won")).toBe(true);
    expect(isWonStageOrStatus("fechado")).toBe(true);
    expect(isWonStageOrStatus("ganho")).toBe(true);
    expect(isWonStageOrStatus("venda_concluida")).toBe(true);
    expect(isWonStageOrStatus("venda-concluida")).toBe(true);
    expect(isWonStageOrStatus("sold")).toBe(true);

    expect(isWonStageOrStatus("new")).toBe(false);
    expect(isWonStageOrStatus("in_contact")).toBe(false);
    expect(isWonStageOrStatus("test_drive")).toBe(false);
    expect(isWonStageOrStatus("proposal")).toBe(false);
    expect(isWonStageOrStatus("lost")).toBe(false);
    expect(isWonStageOrStatus(null)).toBe(false);
    expect(isWonStageOrStatus(undefined)).toBe(false);
  });

  it("[TEST-STOCK-2] deve marcar o veículo como 'vendido' quando o lead for movido para 'won'", async () => {
    const testVehicle = mockVehicles[0];
    testVehicle.status = "disponivel";

    const result = await syncVehicleStockOnStageChange({
      organizationId: "org-test-123",
      vehicleId: testVehicle.id,
      targetStage: "won",
      previousStage: "proposal",
      isDemo: true,
    });

    expect(result.updated).toBe(true);
    expect(result.newVehicleStatus).toBe("vendido");
    expect(testVehicle.status).toBe("vendido");
  });

  it("[TEST-STOCK-3] deve reverter o veículo para 'disponivel' quando o lead sofrer rollback de 'won'", async () => {
    const testVehicle = mockVehicles[0];
    testVehicle.status = "vendido";

    const result = await syncVehicleStockOnStageChange({
      organizationId: "org-test-123",
      vehicleId: testVehicle.id,
      targetStage: "proposal",
      previousStage: "won",
      isDemo: true,
    });

    expect(result.updated).toBe(true);
    expect(result.newVehicleStatus).toBe("disponivel");
    expect(testVehicle.status).toBe("disponivel");
  });

  it("[TEST-STOCK-4] deve ignorar baixa caso o lead não possua veículo vinculado", async () => {
    const result = await syncVehicleStockOnStageChange({
      organizationId: "org-test-123",
      vehicleId: null,
      targetStage: "won",
      previousStage: "proposal",
      isDemo: true,
    });

    expect(result.updated).toBe(false);
    expect(result.newVehicleStatus).toBeUndefined();
  });

  it("[TEST-STOCK-5] não deve alterar status do veículo em transições que não envolvam 'won'", async () => {
    const testVehicle = mockVehicles[1];
    testVehicle.status = "disponivel";

    const result = await syncVehicleStockOnStageChange({
      organizationId: "org-test-123",
      vehicleId: testVehicle.id,
      targetStage: "test_drive",
      previousStage: "in_contact",
      isDemo: true,
    });

    expect(result.updated).toBe(false);
    expect(testVehicle.status).toBe("disponivel");
  });
});

/**
 * @file demo-mode-integrity.test.ts
 * @description Suíte de integridade para validação das regras de negócio, dados canônicos e restauração do Modo Demonstração (Auto Prime Veículos).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveUserTenantContext, DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import { mockVehicles } from "@/lib/mock-data";
import { DEMO_LEADS, DEMO_LEAD_ITEMS } from "@/lib/demo/demo-dataset";
import { resetDemoStateAction } from "@/app/actions/demo-reset-actions";
import { getKanbanLeadsAction } from "@/app/actions/kanban-actions";
import * as supabaseServerModule from "@/lib/supabase/server";
import { cookies } from "next/headers";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("[UNIT-DEMO-INTEGRITY] Integridade Canônica do Modo Demonstração (Auto Prime Veículos)", () => {
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

  it("1. resolveUserTenantContext com cookie acelera_demo_mode=true retorna tenant DEFAULT_DEMO_ORG_ID com nome 'Auto Prime Veículos'", async () => {
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
    expect(context.organization).toBeDefined();
    expect(context.organization?.name).toBe("Auto Prime Veículos");
  });

  it("2. Os 10 veículos do mock possuem enums em minúsculas, placas Mercosul válidas e preços positivos", () => {
    expect(mockVehicles).toHaveLength(10);

    const validFuels = new Set(["flex", "gasolina", "diesel", "eletrico", "hibrido"]);
    const validTransmissions = new Set(["automatico", "manual", "cvt"]);
    const validStatuses = new Set(["disponivel", "reservado", "vendido"]);

    mockVehicles.forEach((vehicle) => {
      expect(vehicle.price).toBeGreaterThan(0);
      expect(vehicle.fipePrice).toBeGreaterThan(0);
      expect(vehicle.km).toBeGreaterThanOrEqual(0);
      expect(validFuels.has(vehicle.fuel ?? "")).toBe(true);
      expect(validTransmissions.has(vehicle.transmission ?? "")).toBe(true);
      expect(validStatuses.has(vehicle.status)).toBe(true);

      // Placas sem hífen no padrão Mercosul (ex: BRA2E23, BCT4H22)
      expect(vehicle.plate).toMatch(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/);
    });
  });

  it("3. Todos os 8 leads possuem datas dinâmicas sem horas negativas e sem datas com mais de 24h para leads em aberto", () => {
    expect(DEMO_LEADS).toHaveLength(8);
    expect(DEMO_LEAD_ITEMS).toHaveLength(8);

    const now = Date.now();

    DEMO_LEADS.forEach((lead) => {
      const createdAtTime = new Date(lead.createdAt ?? "").getTime();
      expect(createdAtTime).toBeLessThanOrEqual(now + 1000); // Sem datas futuras

      // Leads abertos devem ser recentes (últimas 24 horas)
      if (lead.status === "novo" || lead.status === "atendimento") {
        const hoursAgo = (now - createdAtTime) / (1000 * 60 * 60);
        expect(hoursAgo).toBeLessThanOrEqual(24);
        expect(hoursAgo).toBeGreaterThanOrEqual(0);
      }
    });
  });

  it("4. resetDemoStateAction restaura o funil e o estoque para o estado inicial determinístico", async () => {
    // 1. Simula mutação no estoque
    mockVehicles[0].price = 999999;
    mockVehicles.push({
      ...mockVehicles[0],
      id: "v-temp-mutate",
      plate: "MUT9A99",
    });
    expect(mockVehicles.length).toBe(11);

    // 2. Executa a restauração da demo
    const result = await resetDemoStateAction();
    expect(result.success).toBe(true);

    // 3. Valida restauração do estoque
    expect(mockVehicles.length).toBe(10);
    expect(mockVehicles[0].price).toBe(138900);
    expect(mockVehicles.find((v) => v.id === "v-temp-mutate")).toBeUndefined();

    // 4. Valida restauração dos leads no kanban
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === "acelera_demo_mode") return { value: "true" };
      return undefined;
    });
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(false);

    const leads = await getKanbanLeadsAction(DEFAULT_DEMO_ORG_ID);
    expect(leads.length).toBe(8);
    expect(leads.some((l) => l.name === "Felipe Albuquerque")).toBe(true);
    expect(leads.some((l) => l.name === "Renata Silveira")).toBe(true);
  });
});

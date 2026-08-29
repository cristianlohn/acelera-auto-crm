/**
 * @file roleta-plantao.test.ts
 * @description Testes unitários para a distribuição da Roleta Automática focando em membros de plantão (in_roulette).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  resolveAssignedSellerInfo,
  resolveAssignedSeller,
  resetRoundRobinCursor,
} from "@/lib/crm/roleta";
import {
  toggleRouletteStatusAction,
  memoryTeamMembers,
} from "@/app/actions/team-actions";
import { getRouletteStatusMap } from "@/lib/services/team-status";
import * as supabaseServerModule from "@/lib/supabase/server";

describe("[UNIT-ROLETA-PLANTAO] Distribuição da Roleta Automática para Membros de Plantão", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetRoundRobinCursor(0);
    const statusMap = getRouletteStatusMap();
    statusMap.clear();
  });

  it("deve distribuir leads exclusivamente para vendedores que estão com plantão ativo (in_roulette: true)", async () => {
    const orgId = "org-custom-123";
    const statusMap = getRouletteStatusMap();

    // Vendedor 1: Ativo no plantão
    statusMap.set(`${orgId}:vendedor-01`, true);
    // Vendedor 2: Fora do plantão
    statusMap.set(`${orgId}:vendedor-02`, false);
    // Vendedor 3: Ativo no plantão
    statusMap.set(`${orgId}:vendedor-03`, true);

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { id: "vendedor-01", full_name: "Lucas Vendedor", role: "seller", in_roulette: true },
                  { id: "vendedor-02", full_name: "Bruno Vendedor", role: "seller", in_roulette: false },
                  { id: "vendedor-03", full_name: "Carla Vendedora", role: "seller", in_roulette: true },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === "leads") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);
    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue(
      mockSupabase as any
    );

    // 1º lead deve ir para Lucas ou Carla (nunca Bruno)
    const res1 = await resolveAssignedSellerInfo("roleta", orgId);
    expect(["Lucas Vendedor", "Carla Vendedora"]).toContain(res1.sellerName);
    expect(res1.sellerName).not.toBe("Bruno Vendedor");
    expect(res1.sellerName).not.toBe("Fila Geral");
    expect(res1.sellerName).not.toBe("Fila de Atendimento");

    // 2º lead
    const res2 = await resolveAssignedSellerInfo("roleta", orgId);
    expect(["Lucas Vendedor", "Carla Vendedora"]).toContain(res2.sellerName);
    expect(res2.sellerName).not.toBe("Bruno Vendedor");
  });

  it("quando apenas 1 membro estiver de plantão na concessionária, todos os leads vão diretamente para ele", async () => {
    const orgId = "org-single-duty";
    const statusMap = getRouletteStatusMap();

    statusMap.set(`${orgId}:vendedor-01`, true);
    statusMap.set(`${orgId}:vendedor-02`, false);

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { id: "vendedor-01", full_name: "Vendedor Único de Plantão", role: "seller", in_roulette: true },
                  { id: "vendedor-02", full_name: "Vendedor de Folga", role: "seller", in_roulette: false },
                ],
                error: null,
              }),
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);
    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue(
      mockSupabase as any
    );

    const res = await resolveAssignedSellerInfo("roleta", orgId);
    expect(res.sellerName).toBe("Vendedor Único de Plantão");
    expect(res.sellerId).toBe("vendedor-01");
  });

  it("se a loja possuir apenas o dono/administrador de plantão, distribui para ele sem cair em fila", async () => {
    const orgId = "org-owner-only";

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { id: "usr-admin-1", full_name: "Dono da Loja", role: "admin", in_roulette: true },
                ],
                error: null,
              }),
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);
    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue(
      mockSupabase as any
    );

    const res = await resolveAssignedSellerInfo("roleta", orgId);
    expect(res.sellerName).toBe("Dono da Loja");
    expect(res.sellerId).toBe("usr-admin-1");
  });

  it("quando a string informada contiver 'Fila' ou 'Roleta', trata como distribuição e não salva como nome de vendedor", async () => {
    const orgId = "org-fila-check";

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { id: "vendedor-10", full_name: "Vendedora Mariana", role: "seller", in_roulette: true },
                ],
                error: null,
              }),
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);
    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue(
      mockSupabase as any
    );

    const resFila = await resolveAssignedSellerInfo("Fila de Atendimento", orgId);
    expect(resFila.sellerName).toBe("Vendedora Mariana");
    expect(resFila.sellerId).toBe("vendedor-10");

    const resFilaGeral = await resolveAssignedSellerInfo("Fila Geral", orgId);
    expect(resFilaGeral.sellerName).toBe("Vendedora Mariana");
  });
});

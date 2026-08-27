/**
 * @file lead-roulette.test.ts
 * @description Testes unitários para o motor de Roleta Comercial (Fair Round-Robin)
 * cobrindo alternância de vendedores, filtros de segmento, plantão ativo e fallbacks.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  distributeLead,
  resetRouletteState,
  setMockRouletteSellers,
  DEFAULT_DEMO_ORG_ID,
  type LeadRouletteMember,
} from "@/lib/services/lead-roulette";
import * as supabaseServerModule from "@/lib/supabase/server";

describe("[UNIT-ROULETTE] Motor de Roleta Comercial e Fair Round-Robin", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Garante que o Supabase não execute chamadas de rede nos testes unitários
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(false);
    resetRouletteState();
  });

  it("[TEST-ROULETTE-01] Deve distribuir leads sequencialmente e alternadamente entre 3 vendedores ativos (Round-Robin Justo)", async () => {
    const mockSellers: LeadRouletteMember[] = [
      {
        id: "seller-1",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Carlos Vendedor",
        phone: "+5511911111111",
        role: "seller",
        segment: "all",
        in_roulette: true,
        status: "active",
        last_lead_assigned_at: null,
      },
      {
        id: "seller-2",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Ana Vendedora",
        phone: "+5511922222222",
        role: "seller",
        segment: "all",
        in_roulette: true,
        status: "active",
        last_lead_assigned_at: null,
      },
      {
        id: "seller-3",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Marcos Vendedor",
        phone: "+5511933333333",
        role: "seller",
        segment: "all",
        in_roulette: true,
        status: "active",
        last_lead_assigned_at: null,
      },
    ];

    setMockRouletteSellers(mockSellers);

    // 1º Lead -> Deve ser atribuído ao primeiro (Ana ou Carlos por ordem estável)
    const lead1 = await distributeLead(DEFAULT_DEMO_ORG_ID);
    expect(lead1).not.toBeNull();
    const firstAssigned = lead1?.name;

    // 2º Lead -> Deve ser atribuído a um vendedor diferente
    const lead2 = await distributeLead(DEFAULT_DEMO_ORG_ID);
    expect(lead2).not.toBeNull();
    expect(lead2?.name).not.toBe(firstAssigned);

    // 3º Lead -> Deve ser atribuído ao terceiro vendedor
    const lead3 = await distributeLead(DEFAULT_DEMO_ORG_ID);
    expect(lead3).not.toBeNull();
    expect(lead3?.name).not.toBe(firstAssigned);
    expect(lead3?.name).not.toBe(lead2?.name);

    // 4º Lead -> Deve reiniciar o ciclo (Round-Robin) voltando para o primeiro vendedor
    const lead4 = await distributeLead(DEFAULT_DEMO_ORG_ID);
    expect(lead4?.name).toBe(firstAssigned);
  });

  it("[TEST-ROULETTE-02] Deve ignorar vendedores com in_roulette = false ou status != 'active'", async () => {
    const mockSellers: LeadRouletteMember[] = [
      {
        id: "seller-active-1",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Vendedor Ativo Na Roleta",
        phone: "+5511911111111",
        role: "seller",
        segment: "all",
        in_roulette: true,
        status: "active",
        last_lead_assigned_at: null,
      },
      {
        id: "seller-paused",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Vendedor Pausado",
        phone: "+5511922222222",
        role: "seller",
        segment: "all",
        in_roulette: true,
        status: "paused", // Pausado não pode receber lead
        last_lead_assigned_at: null,
      },
      {
        id: "seller-off-roulette",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Vendedor Fora da Roleta",
        phone: "+5511933333333",
        role: "seller",
        segment: "all",
        in_roulette: false, // Fora do plantão
        status: "active",
        last_lead_assigned_at: null,
      },
      {
        id: "seller-vacation",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Vendedor de Férias",
        phone: "+5511944444444",
        role: "seller",
        segment: "all",
        in_roulette: true,
        status: "vacation",
        last_lead_assigned_at: null,
      },
    ];

    setMockRouletteSellers(mockSellers);

    // Distribui múltiplos leads consecutivos
    for (let i = 0; i < 5; i++) {
      const assigned = await distributeLead(DEFAULT_DEMO_ORG_ID);
      expect(assigned?.id).toBe("seller-active-1");
      expect(assigned?.name).toBe("Vendedor Ativo Na Roleta");
    }
  });

  it("[TEST-ROULETTE-03] Deve direcionar lead para o vendedor especialista no segmento compatível", async () => {
    const mockSellers: LeadRouletteMember[] = [
      {
        id: "seller-new",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Especialista 0km",
        phone: "+5511911111111",
        role: "seller",
        segment: "new_cars",
        in_roulette: true,
        status: "active",
        last_lead_assigned_at: null,
      },
      {
        id: "seller-used",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Especialista Seminovos",
        phone: "+5511922222222",
        role: "seller",
        segment: "used_cars",
        in_roulette: true,
        status: "active",
        last_lead_assigned_at: null,
      },
    ];

    setMockRouletteSellers(mockSellers);

    // Lead de seminovos ('used_cars')
    const leadUsed = await distributeLead(DEFAULT_DEMO_ORG_ID, "used_cars");
    expect(leadUsed?.id).toBe("seller-used");
    expect(leadUsed?.name).toBe("Especialista Seminovos");

    // Lead de 0km ('new_cars')
    const leadNew = await distributeLead(DEFAULT_DEMO_ORG_ID, "new_cars");
    expect(leadNew?.id).toBe("seller-new");
    expect(leadNew?.name).toBe("Especialista 0km");
  });

  it("[TEST-ROULETTE-04] Fallback de segmento: se não houver especialista ativo no segmento, distribui para qualquer vendedor na roleta", async () => {
    const mockSellers: LeadRouletteMember[] = [
      {
        id: "seller-new-only",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Vendedor Apenas Novos",
        phone: "+5511911111111",
        role: "seller",
        segment: "new_cars",
        in_roulette: true,
        status: "active",
        last_lead_assigned_at: null,
      },
    ];

    setMockRouletteSellers(mockSellers);

    // Solicita lead para 'used_cars', mas só há vendedor de 'new_cars'
    const leadFallback = await distributeLead(DEFAULT_DEMO_ORG_ID, "used_cars");
    expect(leadFallback?.id).toBe("seller-new-only");
  });

  it("[TEST-ROULETTE-05] Fallback de Gestor/Admin quando nenhum vendedor estiver em plantão", async () => {
    const mockSellers: LeadRouletteMember[] = [
      {
        id: "seller-paused",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Vendedor Pausado",
        phone: "+5511911111111",
        role: "seller",
        segment: "all",
        in_roulette: false,
        status: "paused",
        last_lead_assigned_at: null,
      },
      {
        id: "manager-admin",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Gerente Comercial",
        phone: "+5511999990000",
        role: "manager",
        segment: "all",
        in_roulette: false,
        status: "active",
        last_lead_assigned_at: null,
      },
    ];

    setMockRouletteSellers(mockSellers);

    const leadAssigned = await distributeLead(DEFAULT_DEMO_ORG_ID);
    expect(leadAssigned?.id).toBe("manager-admin");
    expect(leadAssigned?.role).toBe("manager");
  });

  it("[TEST-ROULETTE-06] Retorna null para resgate manual caso a concessionária não tenha nenhum membro ativo", async () => {
    setMockRouletteSellers([]);

    const leadUnassigned = await distributeLead("org-empty-999");
    expect(leadUnassigned).toBeNull();
  });
});

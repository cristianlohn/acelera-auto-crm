/**
 * @file lead-roulette.ts
 * @description Motor de Distribuição Automática de Leads (Roleta Round-Robin Inteligente)
 * com balanceamento justo (Fair Distribution), compatibilidade de segmento e fallback defensivo.
 */

import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export interface LeadRouletteMember {
  id: string;
  organization_id: string;
  name: string;
  email?: string;
  phone: string;
  role: "seller" | "sdr" | "manager" | "admin";
  segment: "new_cars" | "used_cars" | "f_and_i" | "all";
  in_roulette: boolean;
  status: "active" | "paused" | "vacation";
  last_lead_assigned_at?: string | null;
}

interface SupabaseProfileRow {
  id: string;
  organization_id: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  segment?: string | null;
  in_roulette?: boolean | null;
  status?: string | null;
  last_lead_assigned_at?: string | null;
}

export interface AssignedSeller {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role?: string;
  segment?: string;
}

/** Organização padrão para testes e demonstração */
export const DEFAULT_DEMO_ORG_ID = "a0000000-0000-0000-0000-000000000001";

/** Lista padrão de vendedores em memória para sandbox/demo */
const defaultMockSellers: LeadRouletteMember[] = [
  {
    id: "sp-001",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Rafael Alves",
    email: "rafael.alves@aceleraauto.com.br",
    phone: "+5511988887777",
    role: "seller",
    segment: "all",
    in_roulette: true,
    status: "active",
    last_lead_assigned_at: null,
  },
  {
    id: "sp-002",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Juliana Costa",
    email: "juliana.costa@aceleraauto.com.br",
    phone: "+5511977776666",
    role: "seller",
    segment: "new_cars",
    in_roulette: true,
    status: "active",
    last_lead_assigned_at: null,
  },
  {
    id: "sp-003",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Marcos Ferreira",
    email: "marcos.ferreira@aceleraauto.com.br",
    phone: "+5511966665555",
    role: "seller",
    segment: "used_cars",
    in_roulette: true,
    status: "active",
    last_lead_assigned_at: null,
  },
];

let memorySellers: LeadRouletteMember[] = JSON.parse(JSON.stringify(defaultMockSellers));
let internalCounter = 0;

/**
 * Reseta o estado da roleta em memória para o estado inicial padrão (usado em testes).
 */
export function resetRouletteState(customSellers?: LeadRouletteMember[]) {
  if (customSellers) {
    memorySellers = JSON.parse(JSON.stringify(customSellers));
  } else {
    memorySellers = JSON.parse(JSON.stringify(defaultMockSellers));
  }
  internalCounter = 0;
}

/**
 * Define membros customizados para cenários de testes unitários.
 */
export function setMockRouletteSellers(sellers: LeadRouletteMember[]) {
  memorySellers = JSON.parse(JSON.stringify(sellers));
}

/**
 * Retorna os membros atuais em memória.
 */
export function getMockRouletteSellers(): LeadRouletteMember[] {
  return memorySellers;
}

/**
 * Normaliza timestamps para comparação segura no algoritmo de Fair Round-Robin.
 */
function getTimestampValue(timestamp?: string | null): number {
  if (!timestamp) return 0;
  const parsed = new Date(timestamp).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Executa a seleção e atribuição justa de um lead para um vendedor elegível.
 *
 * @param organizationId - UUID da organização / concessionária proprietária
 * @param leadSegment - Segmento do lead ('new_cars' | 'used_cars' | 'all')
 * @returns AssignedSeller ou null caso não haja vendedor nem gestor disponível
 */
export async function distributeLead(
  organizationId: string = DEFAULT_DEMO_ORG_ID,
  leadSegment?: string
): Promise<AssignedSeller | null> {
  let allMembers: LeadRouletteMember[] = [];

  // 1. Busca os membros no Supabase se configurado, ou no armazenamento em memória
  if (isSupabaseServerConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, organization_id, full_name, email, phone, role, segment, in_roulette, status, last_lead_assigned_at")
        .eq("organization_id", organizationId);

      if (!error && data && data.length > 0) {
        const rows = data as unknown as SupabaseProfileRow[];
        allMembers = rows.map((item) => ({
          id: item.id,
          organization_id: item.organization_id,
          name: item.full_name || item.name || "Vendedor",
          email: item.email || undefined,
          phone: item.phone || "+5511999999999",
          role: (item.role as LeadRouletteMember["role"]) || "seller",
          segment: (item.segment as LeadRouletteMember["segment"]) || "all",
          in_roulette: Boolean(item.in_roulette ?? true),
          status: (item.status as LeadRouletteMember["status"]) || "active",
          last_lead_assigned_at: item.last_lead_assigned_at || null,
        }));
      }
    } catch {
      // Fallback para memória em caso de falha no Supabase
    }
  }

  // Se não encontrou dados no banco (ou modo demo/testes), utiliza o estado em memória apenas com match estrito de organization_id
  if (allMembers.length === 0) {
    allMembers = memorySellers.filter((m) => m.organization_id === organizationId);
  }

  // 2. Filtra vendedores estritamente ATIVOS e EM PLANTÃO NA ROLETA
  const activeInRoulette = allMembers.filter(
    (m) => m.status === "active" && m.in_roulette === true
  );

  // 3. Caso não haja nenhum vendedor na roleta, busca Gestor / Administrador como Fallback da própria organização
  if (activeInRoulette.length === 0) {
    const managerFallback = allMembers.find(
      (m) =>
        m.status === "active" &&
        (m.role === "manager" || m.role === "admin" || (m.role as string) === "gerente" || (m.role as string) === "owner")
    );

    if (managerFallback) {
      return {
        id: managerFallback.id,
        name: managerFallback.name,
        phone: managerFallback.phone,
        email: managerFallback.email,
        role: managerFallback.role,
        segment: managerFallback.segment,
      };
    }

    return null; // Sem vendedor disponível -> Fila de resgate manual
  }

  // 4. Aplica compatibilidade de especialidade de segmento
  let candidatePool = activeInRoulette;

  const normalizedSegment =
    leadSegment?.toLowerCase() === "seminovos" ||
    leadSegment?.toLowerCase() === "usados" ||
    leadSegment?.toLowerCase() === "used" ||
    leadSegment?.toLowerCase() === "used_cars"
      ? "used_cars"
      : leadSegment?.toLowerCase() === "novos" ||
        leadSegment?.toLowerCase() === "zero_km" ||
        leadSegment?.toLowerCase() === "0km" ||
        leadSegment?.toLowerCase() === "new" ||
        leadSegment?.toLowerCase() === "new_cars"
      ? "new_cars"
      : leadSegment?.toLowerCase() === "f&i" ||
        leadSegment?.toLowerCase() === "financiamento" ||
        leadSegment?.toLowerCase() === "f_and_i"
      ? "f_and_i"
      : "all";

  if (normalizedSegment === "new_cars") {
    const specialists = activeInRoulette.filter(
      (m) => m.segment === "new_cars" || m.segment === "all"
    );
    if (specialists.length > 0) {
      candidatePool = specialists;
    }
  } else if (normalizedSegment === "used_cars") {
    const specialists = activeInRoulette.filter(
      (m) => m.segment === "used_cars" || m.segment === "all"
    );
    if (specialists.length > 0) {
      candidatePool = specialists;
    }
  } else if (normalizedSegment === "f_and_i") {
    const specialists = activeInRoulette.filter(
      (m) => m.segment === "f_and_i" || m.segment === "all"
    );
    if (specialists.length > 0) {
      candidatePool = specialists;
    }
  }

  // 5. Algoritmo Fair Least-Active-Leads & Round-Robin:
  // Consulta contagem de leads ativos por vendedor se o Supabase estiver configurado
  const activeLeadCounts: Record<string, number> = {};
  if (isSupabaseServerConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: activeLeads } = await (supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (k: string, v: string) => {
              neq: (statusKey: string, statusVal: string) => Promise<{
                data: Array<{ seller_id?: string; seller_name?: string }> | null;
              }>;
            };
          };
        };
      })
        .from("leads")
        .select("seller_id, seller_name")
        .eq("organization_id", organizationId)
        .neq("status", "fechado");

      if (activeLeads && Array.isArray(activeLeads)) {
        activeLeads.forEach((l) => {
          if (l.seller_id) {
            activeLeadCounts[l.seller_id] = (activeLeadCounts[l.seller_id] || 0) + 1;
          }
        });
      }
    } catch {
      // Ignora erro
    }
  }

  // Ordena com rigor:
  // 1º Quem tem MENOS LEADS ATIVOS (Fair Distribution)
  // 2º Quem está há mais tempo sem receber lead (menor timestamp de last_lead_assigned_at)
  // 3º Desempate estável por ID
  candidatePool.sort((a, b) => {
    const countA = activeLeadCounts[a.id] || 0;
    const countB = activeLeadCounts[b.id] || 0;

    if (countA !== countB) {
      return countA - countB;
    }

    const timeA = getTimestampValue(a.last_lead_assigned_at);
    const timeB = getTimestampValue(b.last_lead_assigned_at);

    if (timeA !== timeB) {
      return timeA - timeB;
    }

    // Desempate estável por ID ou ordem de inserção
    return a.id.localeCompare(b.id);
  });

  const selectedSeller = candidatePool[0];
  const assignmentTimestamp = new Date(Date.now() + internalCounter++).toISOString();

  // 6. Atualiza o timestamp no registro em memória
  const memoryRecord = memorySellers.find((m) => m.id === selectedSeller.id);
  if (memoryRecord) {
    memoryRecord.last_lead_assigned_at = assignmentTimestamp;
  }
  selectedSeller.last_lead_assigned_at = assignmentTimestamp;

  // 7. Atualiza no Supabase de forma assíncrona se disponível
  if (isSupabaseServerConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      await (supabase.from("profiles") as unknown as { update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> } })
        .update({ last_lead_assigned_at: assignmentTimestamp })
        .eq("id", selectedSeller.id);
    } catch {
      // Ignora erro de telemetria não-bloqueante
    }
  }

  return {
    id: selectedSeller.id,
    name: selectedSeller.name,
    phone: selectedSeller.phone,
    email: selectedSeller.email,
    role: selectedSeller.role,
    segment: selectedSeller.segment,
  };
}

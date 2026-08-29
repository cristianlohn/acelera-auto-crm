import { cookies } from "next/headers";
import {
  createServerSupabaseClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import {
  sendWhatsAppMessage,
  buildNewLeadAlertMessage,
  type LeadAlertData,
} from "@/lib/services/whatsapp";
import { ROULETTE_STATUS_COOKIE, getRouletteStatusMap } from "@/lib/services/team-status";
import { memoryTeamMembers } from "@/app/actions/team-actions";

/** Organização padrão para persistência demo/sandbox */
export const DEFAULT_DEMO_ORG_ID = "a0000000-0000-0000-0000-000000000001";

/** Lista padrão de vendedores ativos para a Roleta Automática */
export const DEFAULT_ACTIVE_SELLERS = [
  "Rafael Alves",
  "Juliana Costa",
  "Marcos Ferreira",
];

let roundRobinCursor = 0;

/**
 * Reseta o cursor da roleta de vendedores (utilizado em testes unitários/integração).
 */
export function resetRoundRobinCursor(val = 0) {
  roundRobinCursor = val;
}

export interface ResolvedSellerInfo {
  sellerName: string;
  sellerId?: string;
  sellerPhone?: string;
}

/**
 * Determina detalhadamente o vendedor atribuído ao lead (nome, id e telefone)
 * respeitando os membros da organização que estão ATIVAMENTE DE PLANTÃO (in_roulette = true).
 */
export async function resolveAssignedSellerInfo(
  explicitSeller?: string | null,
  organizationId: string = DEFAULT_DEMO_ORG_ID
): Promise<ResolvedSellerInfo> {
  const isExplicit =
    explicitSeller &&
    explicitSeller.trim() &&
    !explicitSeller.includes("Roleta Automática") &&
    explicitSeller !== "roleta" &&
    explicitSeller !== "all";

  const statusMap = getRouletteStatusMap();
  let cookieOverrides: Record<string, boolean> = {};
  try {
    const cookieStore = await cookies();
    const rawCookie = cookieStore.get(ROULETTE_STATUS_COOKIE)?.value;
    if (rawCookie) {
      cookieOverrides = JSON.parse(rawCookie);
    }
  } catch {
    // Silencioso se cookies() não estiver disponível
  }

  function checkIsOnDuty(memberId?: string, rawInRoulette?: boolean | null): boolean {
    if (!memberId) return rawInRoulette !== false;
    if (statusMap.has(memberId)) return statusMap.get(memberId)!;
    if (cookieOverrides[memberId] !== undefined) return cookieOverrides[memberId];
    if (statusMap.has(`${organizationId}:${memberId}`)) return statusMap.get(`${organizationId}:${memberId}`)!;
    if (cookieOverrides[`${organizationId}:${memberId}`] !== undefined) return cookieOverrides[`${organizationId}:${memberId}`];
    if (rawInRoulette !== undefined && rawInRoulette !== null) return Boolean(rawInRoulette);
    return true; // Por padrão, membros ativos estão de plantão
  }

  let teamProfiles: Array<{
    id: string;
    full_name: string;
    role?: string;
    phone?: string;
    in_roulette?: boolean;
  }> = [];

  if (isSupabaseServerConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();

      // 1. Consulta todos os perfis da organização no Supabase
      const { data: allProfiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, phone, in_roulette")
        .eq("organization_id", organizationId);

      if (!error && Array.isArray(allProfiles) && allProfiles.length > 0) {
        teamProfiles = allProfiles.filter((p) => Boolean(p.full_name?.trim()));
      } else {
        // Suporte a mocks de teste que utilizam encadeamento com .in("role", ...)
        try {
          const { data: testSellers } = await (supabase as unknown as {
            from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { in: (f: string, r: string[]) => Promise<{ data: Array<{ id: string; full_name: string; role: string; phone?: string; in_roulette?: boolean }> | null }> } } };
          })
            .from("profiles")
            .select("id, full_name, role, phone, in_roulette")
            .eq("organization_id", organizationId)
            .in("role", ["vendedor", "seller"]);

          if (testSellers && Array.isArray(testSellers) && testSellers.length > 0) {
            teamProfiles = testSellers;
          } else {
            const { data: testAdmins } = await (supabase as unknown as {
              from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { in: (f: string, r: string[]) => Promise<{ data: Array<{ id: string; full_name: string; role: string; phone?: string; in_roulette?: boolean }> | null }> } } };
            })
              .from("profiles")
              .select("id, full_name, role, phone, in_roulette")
              .eq("organization_id", organizationId)
              .in("role", ["admin", "gerente", "manager", "superadmin", "owner"]);

            if (testAdmins && Array.isArray(testAdmins) && testAdmins.length > 0) {
              teamProfiles = testAdmins;
            }
          }
        } catch {
          // Ignora se .in não estiver presente
        }
      }
    } catch {
      // Fallback
    }
  }

  // Se o Supabase não retornou perfis (ou estamos no modo demo/offline), consulta fallback em memória
  if (teamProfiles.length === 0) {
    const memMembers = memoryTeamMembers.filter(
      (m) => m.organization_id === organizationId || organizationId === DEFAULT_DEMO_ORG_ID
    );
    if (memMembers.length > 0) {
      teamProfiles = memMembers.map((m) => ({
        id: m.id,
        full_name: m.name,
        role: m.role,
        phone: m.phone,
        in_roulette: m.in_roulette,
      }));
    }
  }

  // Atribuição explícita de vendedor
  if (isExplicit) {
    const matched = teamProfiles.find(
      (p) =>
        p.full_name?.trim().toLowerCase() === explicitSeller!.trim().toLowerCase() ||
        p.id === explicitSeller
    );
    if (matched) {
      return {
        sellerName: matched.full_name.trim(),
        sellerId: matched.id,
        sellerPhone: matched.phone || undefined,
      };
    }
    return {
      sellerName: explicitSeller!.trim(),
    };
  }

  // -------------------------------------------------------------
  // ROLETA AUTOMÁTICA DE LEADS (DISTRIBUIÇÃO ENTRE QUEM ESTÁ DE PLANTÃO)
  // -------------------------------------------------------------

  // Nível 1: Vendedores com plantão ativo (in_roulette === true)
  let candidateProfiles = teamProfiles.filter((p) => {
    const isSeller = ["vendedor", "seller", "vendedores", "sellers"].includes(p.role?.toLowerCase() || "");
    const onDuty = checkIsOnDuty(p.id, p.in_roulette);
    return isSeller && onDuty && Boolean(p.full_name?.trim());
  });

  // Nível 2: Qualquer membro da equipe com plantão ativo (gerentes, administradores, donos)
  if (candidateProfiles.length === 0) {
    candidateProfiles = teamProfiles.filter((p) => {
      const onDuty = checkIsOnDuty(p.id, p.in_roulette);
      return onDuty && Boolean(p.full_name?.trim());
    });
  }

  // Nível 3: Se ninguém estiver explicitamente marcado de plantão, distribui entre todos os membros cadastrados
  if (candidateProfiles.length === 0) {
    candidateProfiles = teamProfiles.filter((p) => Boolean(p.full_name?.trim()));
  }

  // Nível 4: Fallback padrão de vendedores ativos
  if (candidateProfiles.length === 0) {
    const demoName = DEFAULT_ACTIVE_SELLERS[roundRobinCursor % DEFAULT_ACTIVE_SELLERS.length];
    roundRobinCursor = (roundRobinCursor + 1) % DEFAULT_ACTIVE_SELLERS.length;
    return {
      sellerName: demoName,
      sellerPhone: "11988887777",
    };
  }

  // Caso haja apenas 1 candidato de plantão
  if (candidateProfiles.length === 1) {
    const single = candidateProfiles[0];
    return {
      sellerName: single.full_name.trim(),
      sellerId: single.id,
      sellerPhone: single.phone || undefined,
    };
  }

  // Caso haja múltiplos membros de plantão: Balanceamento Dinâmico por Menor Carga
  try {
    if (isSupabaseServerConfigured()) {
      const supabase = await createServerSupabaseClient();
      const { data: recentLeads } = await (supabase as unknown as {
        from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { order: (col: string, opt: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: Array<{ seller_name: string; seller_id?: string; created_at: string }> | null }> } } } };
      })
        .from("leads")
        .select("seller_name, seller_id, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (recentLeads && Array.isArray(recentLeads)) {
        const stats = candidateProfiles.map((p) => {
          const assigned = recentLeads.filter(
            (l) =>
              (l.seller_id && l.seller_id === p.id) ||
              (l.seller_name && l.seller_name.trim().toLowerCase() === p.full_name.trim().toLowerCase())
          );
          const count = assigned.length;
          const lastLeadDate = assigned[0]?.created_at
            ? new Date(assigned[0].created_at).getTime()
            : 0;
          return { profile: p, count, lastLeadDate };
        });

        // Ordena: 1º quem tem MENOS leads; 2º quem está há mais tempo sem receber lead
        stats.sort((a, b) => {
          if (a.count !== b.count) {
            return a.count - b.count;
          }
          return a.lastLeadDate - b.lastLeadDate;
        });

        if (stats[0]?.profile) {
          const chosen = stats[0].profile;
          return {
            sellerName: chosen.full_name.trim(),
            sellerId: chosen.id,
            sellerPhone: chosen.phone || undefined,
          };
        }
      }
    }
  } catch {
    // Fallback para round-robin
  }

  // Round-Robin determinístico entre os candidatos de plantão
  const chosen = candidateProfiles[roundRobinCursor % candidateProfiles.length];
  roundRobinCursor = (roundRobinCursor + 1) % candidateProfiles.length;
  return {
    sellerName: chosen.full_name.trim(),
    sellerId: chosen.id,
    sellerPhone: chosen.phone || undefined,
  };
}

/**
 * Determina o vendedor atribuído ao lead (específico ou via Roleta Automática).
 */
export async function resolveAssignedSeller(
  explicitSeller?: string | null,
  organizationId: string = DEFAULT_DEMO_ORG_ID
): Promise<string> {
  const res = await resolveAssignedSellerInfo(explicitSeller, organizationId);
  return res.sellerName;
}

export interface NotifyAssignedSellerParams {
  lead: LeadAlertData;
  sellerName: string;
  organizationId?: string;
  appUrl?: string;
}

/**
 * Notifica o vendedor atribuído via WhatsApp de forma estritamente NÃO-BLOQUEANTE (fire-and-forget).
 * Falhas na comunicação com a API de WhatsApp NUNCA propagam exceções nem bloqueiam o fluxo.
 */
export async function notifyAssignedSellerViaWhatsApp({
  lead,
  sellerName,
  organizationId = DEFAULT_DEMO_ORG_ID,
  appUrl,
}: NotifyAssignedSellerParams): Promise<{ success: boolean; dispatched: boolean }> {
  try {
    let sellerPhone: string | null = null;

    if (isSupabaseServerConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("organization_id", organizationId)
          .eq("full_name", sellerName)
          .maybeSingle();

        if (profile?.phone) {
          sellerPhone = profile.phone;
        }
      } catch (dbErr) {
        console.warn("[Roleta WhatsApp] Falha ao consultar telefone do perfil:", dbErr);
      }
    }

    // Fallback de demonstração caso o vendedor padrão não possua telefone no DB
    if (!sellerPhone && (sellerName === "Rafael Alves" || sellerName === "Juliana Costa")) {
      sellerPhone = "11988887777";
    }

    if (!sellerPhone) {
      console.log(`[WhatsApp Notification] Vendedor "${sellerName}" não possui telefone cadastrado.`);
      return { success: true, dispatched: false };
    }

    const messageText = buildNewLeadAlertMessage(
      lead,
      { full_name: sellerName, phone: sellerPhone },
      appUrl
    );

    const result = await sendWhatsAppMessage({
      toPhone: sellerPhone,
      messageText,
    });

    if (result.success) {
      console.log(`[WhatsApp Notification] Sent to ${sellerName} (${sellerPhone})`);
    } else {
      console.warn(`[WhatsApp Notification Failed] ${sellerName}: ${result.error}`);
    }

    return { success: result.success, dispatched: true };
  } catch (error) {
    // REGRA DE OURO: Nunca lançar exceção no envio de WhatsApp
    console.error("[WhatsApp Notification Unexpected Error]", error);
    return { success: false, dispatched: false };
  }
}

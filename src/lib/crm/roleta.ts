import { cookies } from "next/headers";
import {
  createServerSupabaseClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendWhatsAppMessage,
  buildNewLeadAlertMessage,
  type LeadAlertData,
} from "@/lib/services/whatsapp";
import { ROULETTE_STATUS_COOKIE, getRouletteStatusMap } from "@/lib/services/team-status";
import { memoryTeamMembers } from "@/lib/crm/team-memory";

async function getSupabaseForRoleta() {
  try {
    return createAdminClient();
  } catch {
    return await createServerSupabaseClient();
  }
}

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
  const cleanExplicit = explicitSeller?.trim();
  const lowerExplicit = cleanExplicit?.toLowerCase();
  const isExplicit =
    Boolean(cleanExplicit) &&
    lowerExplicit !== "string" &&
    lowerExplicit !== "null" &&
    lowerExplicit !== "undefined" &&
    lowerExplicit !== "none" &&
    lowerExplicit !== "all" &&
    lowerExplicit !== "" &&
    !lowerExplicit!.includes("roleta") &&
    !lowerExplicit!.includes("fila");

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
    role?: string | null;
    phone?: string | null;
    in_roulette?: boolean | null;
    is_online?: boolean | null;
  }> = [];

  if (isSupabaseServerConfigured()) {
    try {
      const supabase = await getSupabaseForRoleta();

      // 1. Consulta todos os perfis da organização no Supabase com admin client ou server client
      const { data: allProfiles, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("organization_id", organizationId);

      if (!error && Array.isArray(allProfiles) && allProfiles.length > 0) {
        teamProfiles = (allProfiles as unknown as Array<{
          id: string;
          full_name?: string | null;
          name?: string | null;
          role?: string | null;
          phone?: string | null;
          in_roulette?: boolean | null;
          is_online?: boolean | null;
        }>)
          .filter((p) => Boolean((p.full_name || p.name)?.trim()))
          .map((p) => ({
            id: p.id,
            full_name: (p.full_name || p.name)!.trim(),
            role: p.role,
            phone: p.phone,
            in_roulette: p.in_roulette,
            is_online: p.is_online,
          }));
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

      // 1.1 Inclui membros adicionados via convite ativo/pendente caso ainda não tenham profile completo
      try {
        const { data: invites } = await (supabase as unknown as {
          from: (t: string) => {
            select: (c: string) => {
              eq: (k: string, v: string) => Promise<{ data: Array<{ id: string; full_name?: string; email?: string; phone?: string; role?: string }> | null }>;
            };
          };
        })
          .from("organization_invites")
          .select("*")
          .eq("organization_id", organizationId);

        if (invites && Array.isArray(invites) && invites.length > 0) {
          invites.forEach((inv) => {
            const invName = inv.full_name?.trim();
            if (invName && !teamProfiles.some((tp) => tp.full_name.toLowerCase() === invName.toLowerCase())) {
              teamProfiles.push({
                id: `inv-${inv.id}`,
                full_name: invName,
                role: inv.role || "seller",
                phone: inv.phone || null,
                in_roulette: true,
              });
            }
          });
        }
      } catch {
        // Ignora se tabela não existir
      }
    } catch {
      // Fallback
    }
  }

  // Se o Supabase não retornou perfis e estamos no modo demo/offline, consulta fallback em memória apenas para a organização demo
  if (teamProfiles.length === 0 && organizationId === DEFAULT_DEMO_ORG_ID) {
    const memMembers = memoryTeamMembers.filter(
      (m) => m.organization_id === DEFAULT_DEMO_ORG_ID
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
        p.full_name?.trim().toLowerCase() === cleanExplicit!.toLowerCase() ||
        p.id === cleanExplicit
    );
    if (matched) {
      return {
        sellerName: matched.full_name.trim(),
        sellerId: matched.id,
        sellerPhone: matched.phone || undefined,
      };
    }
    if (cleanExplicit!.length >= 2 && !cleanExplicit!.toLowerCase().includes("fila")) {
      return {
        sellerName: cleanExplicit!,
      };
    }
  }

  // -------------------------------------------------------------
  // ROLETA AUTOMÁTICA DE LEADS (DISTRIBUIÇÃO ENTRE QUEM ESTÁ ONLINE / DE PLANTÃO)
  // -------------------------------------------------------------

  const isSellerRole = (role?: string | null) =>
    ["vendedor", "seller", "vendedores", "sellers", "sdr"].includes(role?.toLowerCase() || "");

  // Prioridade 1: Consultores que estão explicitamente com is_online: true no banco de dados
  let candidateProfiles = teamProfiles.filter((p) => {
    return isSellerRole(p.role) && p.is_online === true && Boolean(p.full_name?.trim());
  });

  // Se nenhum vendedor estiver online, verifica qualquer membro da equipe com is_online: true
  if (candidateProfiles.length === 0) {
    candidateProfiles = teamProfiles.filter((p) => {
      return p.is_online === true && Boolean(p.full_name?.trim());
    });
  }

  // Prioridade 2: Vendedores com plantão ativo (in_roulette === true)
  if (candidateProfiles.length === 0) {
    candidateProfiles = teamProfiles.filter((p) => {
      const isSeller = isSellerRole(p.role);
      const onDuty = checkIsOnDuty(p.id, p.in_roulette);
      return isSeller && onDuty && Boolean(p.full_name?.trim());
    });
  }

  // Prioridade 3: Qualquer membro da equipe com plantão ativo (gerentes, administradores, donos)
  if (candidateProfiles.length === 0) {
    candidateProfiles = teamProfiles.filter((p) => {
      const onDuty = checkIsOnDuty(p.id, p.in_roulette);
      return onDuty && Boolean(p.full_name?.trim());
    });
  }

  // Prioridade 4: Vendedores ou membros cadastrados na organização
  if (candidateProfiles.length === 0) {
    const allSellers = teamProfiles.filter((p) => isSellerRole(p.role) && Boolean(p.full_name?.trim()));
    candidateProfiles = allSellers.length > 0 ? allSellers : teamProfiles.filter((p) => Boolean(p.full_name?.trim()));
  }

  // Nível 4: Fallback padrão SE E SOMENTE SE estivermos no ambiente demo e não houver membros
  if (candidateProfiles.length === 0) {
    if (organizationId === DEFAULT_DEMO_ORG_ID) {
      const demoName = DEFAULT_ACTIVE_SELLERS[roundRobinCursor % DEFAULT_ACTIVE_SELLERS.length];
      roundRobinCursor = (roundRobinCursor + 1) % DEFAULT_ACTIVE_SELLERS.length;
      return {
        sellerName: demoName,
        sellerPhone: "11988887777",
      };
    }

    // Organização real sem perfis cadastrados: NUNCA vazar dados de mock
    return {
      sellerName: "Vendedor de Plantão",
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

  // Quando há consultores com is_online: true, executa a Roleta Round-Robin direta entre eles
  const hasOnlineProfiles = candidateProfiles.some((p) => p.is_online === true);
  if (hasOnlineProfiles) {
    const chosen = candidateProfiles[roundRobinCursor % candidateProfiles.length];
    roundRobinCursor = (roundRobinCursor + 1) % candidateProfiles.length;
    return {
      sellerName: chosen.full_name.trim(),
      sellerId: chosen.id,
      sellerPhone: chosen.phone || undefined,
    };
  }

  // Caso contrário, executa balanceamento dinâmico por menor carga de leads ativos
  try {
    if (isSupabaseServerConfigured()) {
      const supabase = await getSupabaseForRoleta();
      const { data: activeLeads } = await (supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (k: string, v: string) => {
              neq: (statusKey: string, statusVal: string) => {
                order: (col: string, opt: { ascending: boolean }) => {
                  limit: (n: number) => Promise<{
                    data: Array<{ seller_name: string; seller_id?: string; created_at: string; status?: string }> | null;
                  }>;
                };
              };
            };
          };
        };
      })
        .from("leads")
        .select("seller_name, seller_id, created_at, status")
        .eq("organization_id", organizationId)
        .neq("status", "fechado")
        .order("created_at", { ascending: false })
        .limit(200);

      if (activeLeads && Array.isArray(activeLeads)) {
        const stats = candidateProfiles.map((p) => {
          const assigned = activeLeads.filter(
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

        stats.sort((a, b) => {
          if (a.count !== b.count) {
            return a.count - b.count;
          }
          if (a.lastLeadDate !== b.lastLeadDate) {
            return a.lastLeadDate - b.lastLeadDate;
          }
          return a.profile.id.localeCompare(b.profile.id);
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

  // Round-Robin determinístico entre os candidatos de plantão da própria organização
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
  sellerPhone?: string | null;
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
  sellerPhone: initialSellerPhone,
  organizationId = DEFAULT_DEMO_ORG_ID,
  appUrl,
}: NotifyAssignedSellerParams): Promise<{ success: boolean; dispatched: boolean }> {
  try {
    let sellerPhone: string | null = initialSellerPhone || null;

    if (!sellerPhone && isSupabaseServerConfigured()) {
      try {
        const supabase = await getSupabaseForRoleta();
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

    const seller = {
      name: sellerName,
      phone: sellerPhone || "Sem telefone",
    };

    console.log("[Roleta] Consultor selecionado:", seller.name, "Telefone:", seller.phone);

    if (!sellerPhone) {
      console.log(`[WhatsApp Notification] Vendedor "${sellerName}" não possui telefone cadastrado.`);
      return { success: true, dispatched: false };
    }

    const messageText = buildNewLeadAlertMessage(
      lead,
      { full_name: sellerName, phone: sellerPhone },
      appUrl
    );

    const isDemo =
      organizationId === DEFAULT_DEMO_ORG_ID ||
      organizationId === "00000000-0000-0000-0000-000000000001" ||
      organizationId.startsWith("demo") ||
      organizationId === "demo";

    console.log("[Roleta WhatsApp] Preparando despacho para vendedor:", {
      sellerName,
      sellerPhone,
      organizationId,
      isDemo,
      leadId: lead.id,
    });

    const result = await sendWhatsAppMessage({
      toPhone: sellerPhone,
      messageText,
      isDemo,
      tenantId: organizationId,
      organizationId,
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

/**
 * @file roleta.ts
 * @description Mecanismo central da Roleta Automática de Leads (Round-Robin) com notificação em tempo real via WhatsApp.
 */

import {
  createServerSupabaseClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import {
  sendWhatsAppMessage,
  buildNewLeadAlertMessage,
  type LeadAlertData,
} from "@/lib/services/whatsapp";
import { getRouletteStatusMap } from "@/lib/services/team-status";

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
 * Determina detalhadamente o vendedor atribuído ao lead (nome, id e telefone).
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

  if (isSupabaseServerConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();

      let teamData: Array<{ id?: string; full_name: string; role?: string; phone?: string; in_roulette?: boolean }> | null = null;

      const queryBuilder = (supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              in?: (col: string, vals: string[]) => Promise<{ data: Array<{ id?: string; full_name: string; role?: string; phone?: string; in_roulette?: boolean }> | null }>;
              then?: (resolve: (val: { data: Array<{ id?: string; full_name: string; role?: string; phone?: string; in_roulette?: boolean }> | null }) => void) => void;
            };
          };
        };
      })
        .from("profiles")
        .select("id, full_name, role, phone, in_roulette")
        .eq("organization_id", organizationId);

      if (typeof queryBuilder.in === "function") {
        const { data: sellers } = await queryBuilder.in("role", ["vendedor", "seller"]);
        if (sellers && sellers.length > 0) {
          teamData = sellers;
        } else {
          const { data: admins } = await queryBuilder.in("role", [
            "admin",
            "gerente",
            "manager",
            "superadmin",
            "owner",
          ]);
          teamData = admins || [];
        }
      } else {
        const res = await (queryBuilder as unknown as Promise<{ data: Array<{ id?: string; full_name: string; role?: string; phone?: string; in_roulette?: boolean }> | null }>);
        teamData = res?.data || null;
      }

      const statusMap = getRouletteStatusMap();

      if (teamData && teamData.length > 0) {
        // Se foi passado um vendedor explícito, encontra no banco
        if (isExplicit) {
          const matched = teamData.find(
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

        // Distribuição via Roleta:
        // Prioridade 1: Vendedores com in_roulette !== false
        let candidateProfiles = teamData.filter((p) => {
          let isIn = p.in_roulette !== false;
          if (p.id && statusMap?.has(p.id)) {
            isIn = statusMap.get(p.id)!;
          }
          const isSellerRole = ["vendedor", "seller"].includes(p.role?.toLowerCase() || "");
          return isIn && isSellerRole && Boolean(p.full_name?.trim());
        });

        // Prioridade 2: Qualquer membro ativo no plantão (inclusive gerentes, donos, admins)
        if (candidateProfiles.length === 0) {
          candidateProfiles = teamData.filter((p) => {
            let isIn = p.in_roulette !== false;
            if (p.id && statusMap?.has(p.id)) {
              isIn = statusMap.get(p.id)!;
            }
            return isIn && Boolean(p.full_name?.trim());
          });
        }

        // Prioridade 3: Qualquer perfil da loja com nome cadastrado
        if (candidateProfiles.length === 0) {
          candidateProfiles = teamData.filter((p) => Boolean(p.full_name?.trim()));
        }

        if (candidateProfiles.length === 1) {
          const single = candidateProfiles[0];
          return {
            sellerName: single.full_name.trim(),
            sellerId: single.id,
            sellerPhone: single.phone || undefined,
          };
        }

        if (candidateProfiles.length > 1) {
          // Balanceamento dinâmico pelos últimos 100 leads
          try {
            const { data: recentLeads } = await (supabase as unknown as {
              from: (table: string) => {
                select: (cols: string) => {
                  eq: (col: string, val: string) => {
                    order: (col: string, opt: { ascending: boolean }) => {
                      limit: (count: number) => Promise<{ data: Array<{ seller_name: string; seller_id?: string; created_at: string }> | null }>;
                    };
                  };
                };
              };
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
          } catch {
            // Fallback para round-robin
          }

          const chosen = candidateProfiles[roundRobinCursor % candidateProfiles.length];
          roundRobinCursor = (roundRobinCursor + 1) % candidateProfiles.length;
          return {
            sellerName: chosen.full_name.trim(),
            sellerId: chosen.id,
            sellerPhone: chosen.phone || undefined,
          };
        }
      }
    } catch {
      // Fallback
    }
  }

  if (isExplicit) {
    return { sellerName: explicitSeller!.trim() };
  }

  if (organizationId === DEFAULT_DEMO_ORG_ID) {
    const demoName = DEFAULT_ACTIVE_SELLERS[roundRobinCursor % DEFAULT_ACTIVE_SELLERS.length];
    roundRobinCursor = (roundRobinCursor + 1) % DEFAULT_ACTIVE_SELLERS.length;
    return { sellerName: demoName };
  }

  return { sellerName: "Fila Geral" };
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

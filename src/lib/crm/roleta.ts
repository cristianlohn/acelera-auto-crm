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

/**
 * Determina o vendedor atribuído ao lead (específico ou via Roleta Automática).
 */
export async function resolveAssignedSeller(
  explicitSeller?: string | null,
  organizationId: string = DEFAULT_DEMO_ORG_ID
): Promise<string> {
  if (
    explicitSeller &&
    explicitSeller.trim() &&
    !explicitSeller.includes("Roleta Automática") &&
    explicitSeller !== "roleta"
  ) {
    return explicitSeller.trim();
  }

  let activeSellers: string[] = [];

  if (isSupabaseServerConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();

      // 1. Busca vendedores da loja
      const { data: teamData } = await (supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              in: (col: string, vals: string[]) => Promise<{ data: Array<{ full_name: string; role: string; in_roulette?: boolean }> | null }>;
            };
          };
        };
      })
        .from("profiles")
        .select("full_name, role, in_roulette")
        .eq("organization_id", organizationId)
        .in("role", ["vendedor", "seller"]);

      if (teamData && teamData.length > 0) {
        const onDutySellers = teamData
          .filter((p) => p.in_roulette !== false && Boolean(p.full_name?.trim()))
          .map((p) => p.full_name.trim());

        if (onDutySellers.length > 0) {
          activeSellers = onDutySellers;
        }
      }

      // 2. Se não houver vendedores ativos no plantão, busca gestores/admins
      if (activeSellers.length === 0) {
        const { data: adminData } = await (supabase as unknown as {
          from: (table: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                in: (col: string, vals: string[]) => Promise<{ data: Array<{ full_name: string; role: string; in_roulette?: boolean }> | null }>;
              };
            };
          };
        })
          .from("profiles")
          .select("full_name, role, in_roulette")
          .eq("organization_id", organizationId)
          .in("role", ["admin", "gerente", "manager", "superadmin"]);

        if (adminData && adminData.length > 0) {
          const onDutyAdmins = adminData
            .filter((p) => p.in_roulette !== false && Boolean(p.full_name?.trim()))
            .map((p) => p.full_name.trim());

          if (onDutyAdmins.length > 0) {
            activeSellers = onDutyAdmins;
          } else {
            const firstAdmin = adminData.find((p) => Boolean(p.full_name?.trim()));
            if (firstAdmin?.full_name) {
              return firstAdmin.full_name.trim();
            }
          }
        }
      }

      // 3. Distribuição Inteligente por Menor Carga (Equilíbrio Dinâmico de Leads)
      if (activeSellers.length > 1 && organizationId !== DEFAULT_DEMO_ORG_ID) {
        try {
          const { data: recentLeads } = await (supabase as unknown as {
            from: (table: string) => {
              select: (cols: string) => {
                eq: (col: string, val: string) => {
                  order: (col: string, opt: { ascending: boolean }) => {
                    limit: (count: number) => Promise<{ data: Array<{ seller_name: string; created_at: string }> | null }>;
                  };
                };
              };
            };
          })
            .from("leads")
            .select("seller_name, created_at")
            .eq("organization_id", organizationId)
            .order("created_at", { ascending: false })
            .limit(100);

          if (recentLeads && Array.isArray(recentLeads)) {
            const sellerStats = activeSellers.map((seller) => {
              const assigned = recentLeads.filter(
                (l) => l.seller_name?.trim().toLowerCase() === seller.toLowerCase()
              );
              const count = assigned.length;
              const lastLeadDate = assigned[0]?.created_at
                ? new Date(assigned[0].created_at).getTime()
                : 0;
              return { seller, count, lastLeadDate };
            });

            // Ordenação: 1º quem tem MENOS leads; 2º quem está há mais tempo sem receber lead
            sellerStats.sort((a, b) => {
              if (a.count !== b.count) {
                return a.count - b.count;
              }
              return a.lastLeadDate - b.lastLeadDate;
            });

            if (sellerStats[0]?.seller) {
              return sellerStats[0].seller;
            }
          }
        } catch {
          // Fallback para round-robin seletivo
        }
      }
    } catch {
      // Fallback
    }
  }

  if (activeSellers.length === 0) {
    if (organizationId === DEFAULT_DEMO_ORG_ID) {
      activeSellers = DEFAULT_ACTIVE_SELLERS;
    } else {
      return "Fila de Atendimento";
    }
  }

  const assigned = activeSellers[roundRobinCursor % activeSellers.length];
  roundRobinCursor = (roundRobinCursor + 1) % activeSellers.length;
  return assigned;
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

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
  if (explicitSeller && explicitSeller.trim()) {
    return explicitSeller.trim();
  }

  let activeSellers = DEFAULT_ACTIVE_SELLERS;

  if (isSupabaseServerConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: teamData } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("organization_id", organizationId)
        .in("role", ["vendedor"]);

      if (teamData && teamData.length > 0) {
        const names = teamData
          .map((p) => p.full_name)
          .filter((name): name is string => Boolean(name && name.trim()));
        if (names.length > 0) {
          activeSellers = names;
        }
      } else {
        // Fallback seguro: quando não houver vendedores ativos, alocar para o Gestor / Admin
        const { data: adminData } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("organization_id", organizationId)
          .in("role", ["admin", "gerente"]);

        if (adminData && adminData.length > 0) {
          const adminNames = adminData
            .map((p) => p.full_name)
            .filter((name): name is string => Boolean(name && name.trim()));
          if (adminNames.length > 0) {
            return adminNames[0];
          }
        }
      }
    } catch {
      // Fallback para lista padrão em caso de instabilidade
    }
  }

  if (activeSellers.length === 0) {
    return "Fila de Atendimento";
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

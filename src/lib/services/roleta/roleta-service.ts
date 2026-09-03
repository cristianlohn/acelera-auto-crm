/**
 * @file roleta-service.ts
 * @description Serviço de distribuição automática de leads via Roleta Comercial (Round-Robin).
 *
 * NOTA DE ARQUITETURA:
 * A Roleta Comercial é acionada EXCLUSIVAMENTE para ingestões automáticas de canais externos
 * (Webhooks, Portais, Meta Ads, Google Ads, Landing Pages).
 * Cadastros manuais feitos pela equipe comercial utilizam atribuição direta (Bypass da Roleta).
 */

import {
  resolveAssignedSellerInfo,
  notifyAssignedSellerViaWhatsApp,
} from "@/lib/crm/roleta";
import {
  distributeLead,
  type AssignedSeller,
  type LeadRouletteMember,
} from "@/lib/services/lead-roulette";

/**
 * Atribui o lead ao próximo vendedor da fila e retorna objeto de dados essenciais.
 */
export async function assignLeadThroughRoleta(
  organizationId: string,
  segment?: "new_cars" | "used_cars" | "f_and_i" | "all"
): Promise<AssignedSeller> {
  const result = await distributeLead(organizationId, segment);
  if (result) {
    return result;
  }
  return {
    id: "unassigned",
    name: "Fila de Atendimento",
    phone: "",
  };
}

export {
  distributeLead,
  resolveAssignedSellerInfo,
  notifyAssignedSellerViaWhatsApp,
  type AssignedSeller,
  type LeadRouletteMember,
};

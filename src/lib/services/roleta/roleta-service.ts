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

export {
  distributeLead,
  resolveAssignedSellerInfo,
  notifyAssignedSellerViaWhatsApp,
  type AssignedSeller,
  type LeadRouletteMember,
};

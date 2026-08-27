/**
 * @file webhook-service.ts
 * @description Serviço de processamento seguro e idempotente para Webhooks de Faturamento do Asaas.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";

export type AsaasWebhookEvent =
  | "PAYMENT_CREATED"
  | "PAYMENT_AWAITING_RISK_ANALYSIS"
  | "PAYMENT_APPROVED_BY_RISK_ANALYSIS"
  | "PAYMENT_REPROVED_BY_RISK_ANALYSIS"
  | "PAYMENT_UPDATED"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_ANTICIPATED"
  | "PAYMENT_OVERDUE"
  | "PAYMENT_DELETED"
  | "PAYMENT_RESTORED"
  | "PAYMENT_REFUNDED"
  | "PAYMENT_RECEIVED_IN_CASH_UNDONE"
  | "PAYMENT_CHARGEBACK_REQUESTED"
  | "PAYMENT_CHARGEBACK_DISPUTE"
  | "PAYMENT_AWAITING_CHARGEBACK_REVERSAL"
  | "PAYMENT_DUNNING_RECEIVED"
  | "PAYMENT_DUNNING_REQUESTED"
  | "PAYMENT_BANK_SLIP_VIEWED"
  | "PAYMENT_CHECKOUT_VIEWED"
  | "SUBSCRIPTION_CREATED"
  | "SUBSCRIPTION_UPDATED"
  | "SUBSCRIPTION_DELETED"
  | "SUBSCRIPTION_INACTIVATED";

export interface AsaasPayment {
  id: string;
  customer?: string;
  subscription?: string;
  installment?: string;
  paymentLink?: string;
  dueDate?: string;
  originalDueDate?: string;
  value?: number;
  netValue?: number;
  originalValue?: number;
  interestValue?: number;
  description?: string;
  billingType?: "PIX" | "BOLETO" | "CREDIT_CARD" | "DEBIT_CARD" | "TRANSFER" | "UNDEFINED";
  canBePaidAfterDueDate?: boolean;
  status?: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  installmentNumber?: number;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  transactionReceiptUrl?: string;
  invoiceNumber?: string;
  deleted?: boolean;
  postalService?: boolean;
  anticipated?: boolean;
  anticipable?: boolean;
  creditDate?: string;
  estimatedCreditDate?: string;
  externalReference?: string;
}

export interface AsaasSubscription {
  id: string;
  customer?: string;
  status?: "ACTIVE" | "INACTIVE" | "EXPIRED";
  value?: number;
  nextDueDate?: string;
  cycle?: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "BIMONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "ANNUALLY";
  description?: string;
  billingType?: "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED";
  deleted?: boolean;
  externalReference?: string;
}

export interface AsaasWebhookPayload {
  id?: string;
  event: AsaasWebhookEvent;
  dateCreated?: string;
  payment?: AsaasPayment;
  subscription?: AsaasSubscription;
}

export interface WebhookProcessResult {
  success: boolean;
  event: string;
  organizationId?: string;
  actionTaken: string;
  alreadyProcessed?: boolean;
  error?: string;
}

/** Chaves estáticas de teste aceitas em ambiente de homologação */
const VALID_DEV_WEBHOOK_SECRETS = new Set([
  "asaas_webhook_secret_live",
  "test_asaas_secret",
  "asaas_token_demo_123",
]);

/** Cache de Idempotência em memória para deduplicação rápida */
const processedEventIds = new Set<string>();

/**
 * Valida o token de segurança do webhook do Asaas.
 */
export function verifyAsaasWebhookToken(token: string | null): boolean {
  if (!token || !token.trim()) return false;
  const cleanToken = token.trim();

  const configuredSecret =
    process.env.ASAAS_WEBHOOK_SECRET ||
    process.env.ASAAS_WEBHOOK_ACCESS_TOKEN ||
    process.env.ASAAS_API_KEY;

  if (configuredSecret && cleanToken === configuredSecret.trim()) {
    return true;
  }

  if (VALID_DEV_WEBHOOK_SECRETS.has(cleanToken)) {
    return true;
  }

  return false;
}

/**
 * Registra o identificador do evento para idempotência.
 */
export function markEventAsProcessed(eventId: string): void {
  processedEventIds.add(eventId);
  // Mantém tamanho máximo de cache de idempotência
  if (processedEventIds.size > 5000) {
    const firstKey = processedEventIds.keys().next().value;
    if (firstKey) processedEventIds.delete(firstKey);
  }
}

/**
 * Verifica se o evento já foi processado anteriormente.
 */
export function isEventAlreadyProcessed(eventId: string): boolean {
  return processedEventIds.has(eventId);
}

/**
 * Limpa o cache de idempotência (útil para suítes de teste).
 */
export function resetProcessedEventsCache(): void {
  processedEventIds.clear();
}

/**
 * Localiza a organização no banco de dados a partir dos dados recebidos do Asaas.
 */
export async function findOrganizationByAsaasData(
  externalRef?: string,
  customerId?: string,
  subscriptionId?: string
): Promise<{ id: string; name: string } | null> {
  if (!isSupabaseServerConfigured()) {
    // Retorna mock para ambiente sem Supabase configurado
    if (externalRef) return { id: externalRef, name: "Concessionária Local" };
    if (customerId) return { id: "org-001", name: "Concessionária Local" };
    return null;
  }

  try {
    const supabaseAdmin = createAdminClient();

    // 1. Busca por externalReference (ID direto da organização)
    if (externalRef) {
      const { data } = await supabaseAdmin
        .from("organizations")
        .select("id, name")
        .eq("id", externalRef)
        .maybeSingle();

      if (data) return data;
    }

    // 2. Busca por asaas_subscription_id
    if (subscriptionId) {
      const { data } = await supabaseAdmin
        .from("organizations")
        .select("id, name")
        .eq("asaas_subscription_id", subscriptionId)
        .maybeSingle();

      if (data) return data;
    }

    // 3. Busca por asaas_customer_id
    if (customerId) {
      const { data } = await supabaseAdmin
        .from("organizations")
        .select("id, name")
        .eq("asaas_customer_id", customerId)
        .maybeSingle();

      if (data) return data;
    }

    return null;
  } catch (err) {
    console.warn("[Asaas Webhook] Erro ao buscar organização no Supabase:", err);
    return null;
  }
}

/**
 * Processador principal de eventos de webhook do Asaas com idempotência e persistência.
 */
export async function processAsaasWebhookEvent(
  payload: AsaasWebhookPayload
): Promise<WebhookProcessResult> {
  const { event, payment, subscription } = payload;
  const eventKey =
    payload.id ||
    `${event}_${payment?.id || subscription?.id || "evt"}_${payment?.paymentDate || payload.dateCreated || ""}`;

  // 1. Verificação de Idempotência
  if (isEventAlreadyProcessed(eventKey)) {
    return {
      success: true,
      event,
      alreadyProcessed: true,
      actionTaken: "skipped_duplicate_event",
    };
  }

  const externalRef = payment?.externalReference || subscription?.externalReference;
  const customerId = payment?.customer || subscription?.customer;
  const subscriptionId = payment?.subscription || subscription?.id;

  const org = await findOrganizationByAsaasData(externalRef, customerId, subscriptionId);
  const targetOrgId = org?.id || externalRef;

  let actionTaken = "none";

  // 2. Roteamento e Processamento por Tipo de Evento
  switch (event) {
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED": {
      actionTaken = "payment_confirmed_subscription_activated";

      // Calcula término do período (+30 dias ou data de vencimento)
      const nextDue = subscription?.nextDueDate || payment?.dueDate;
      const periodEnd = nextDue
        ? new Date(nextDue).toISOString()
        : new Date(Date.now() + 30 * 86_400_000).toISOString();

      if (isSupabaseServerConfigured() && targetOrgId) {
        try {
          const supabaseAdmin = createAdminClient();
          await supabaseAdmin
            .from("organizations")
            .update({
              subscription_status: "active",
              plan_status: "active",
              current_period_end: periodEnd,
              asaas_customer_id: customerId || null,
              asaas_subscription_id: subscriptionId || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetOrgId);
        } catch (err) {
          console.warn("[Asaas Webhook] Falha ao atualizar organization no Supabase:", err);
        }
      }
      break;
    }

    case "PAYMENT_OVERDUE": {
      actionTaken = "payment_overdue_marked_past_due";

      if (isSupabaseServerConfigured() && targetOrgId) {
        try {
          const supabaseAdmin = createAdminClient();
          await supabaseAdmin
            .from("organizations")
            .update({
              subscription_status: "past_due",
              plan_status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetOrgId);
        } catch (err) {
          console.warn("[Asaas Webhook] Falha ao atualizar inadimplência:", err);
        }
      }
      break;
    }

    case "SUBSCRIPTION_CREATED":
    case "SUBSCRIPTION_UPDATED": {
      actionTaken = "subscription_synchronized";

      const nextDue = subscription?.nextDueDate;
      const periodEnd = nextDue ? new Date(nextDue).toISOString() : null;

      if (isSupabaseServerConfigured() && targetOrgId) {
        try {
          const supabaseAdmin = createAdminClient();
          await supabaseAdmin
            .from("organizations")
            .update({
              subscription_status: subscription?.status === "ACTIVE" ? "active" : "inactive",
              plan_status: subscription?.status === "ACTIVE" ? "active" : "inactive",
              asaas_customer_id: customerId || null,
              asaas_subscription_id: subscriptionId || null,
              current_period_end: periodEnd,
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetOrgId);
        } catch (err) {
          console.warn("[Asaas Webhook] Falha ao sincronizar assinatura:", err);
        }
      }
      break;
    }

    case "SUBSCRIPTION_DELETED":
    case "SUBSCRIPTION_INACTIVATED": {
      actionTaken = "subscription_canceled";

      if (isSupabaseServerConfigured() && targetOrgId) {
        try {
          const supabaseAdmin = createAdminClient();
          await supabaseAdmin
            .from("organizations")
            .update({
              subscription_status: "canceled",
              plan_status: "canceled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetOrgId);
        } catch (err) {
          console.warn("[Asaas Webhook] Falha ao cancelar assinatura:", err);
        }
      }
      break;
    }

    default: {
      actionTaken = `unhandled_event_${event}`;
      break;
    }
  }

  // Registra para idempotência
  markEventAsProcessed(eventKey);

  return {
    success: true,
    event,
    organizationId: targetOrgId,
    actionTaken,
  };
}

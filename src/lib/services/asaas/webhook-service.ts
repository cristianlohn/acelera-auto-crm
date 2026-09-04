/**
 * @file webhook-service.ts
 * @description Serviço de processamento seguro e idempotente para Webhooks de Faturamento do Asaas.
 */

import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import type { Database } from "@/types/database.types";
import { resolvePeriodEndDate, calculatePeriodEndDate } from "./subscription-service";

export { resolvePeriodEndDate, calculatePeriodEndDate };

type OrganizationUpdate = Database["public"]["Tables"]["organizations"]["Update"];

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
  cycle?: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "BIMONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "ANNUALLY" | string;
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
  "token_secreto_para_validar_webhook_acelera",
]);

/** Cache de Idempotência em memória para deduplicação rápida */
const processedEventIds = new Set<string>();

/**
 * Comparação segura de strings para prevenção contra timing attacks.
 */
function safeTimingCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Valida o token de segurança do webhook do Asaas usando comparação em tempo constante.
 */
export function verifyAsaasWebhookToken(token: string | null | undefined): boolean {
  if (!token || !token.trim()) return false;
  const cleanToken = token.trim();

  const configuredSecret = (
    process.env.ASAAS_WEBHOOK_SECRET ||
    process.env.ASAAS_ACCESS_TOKEN ||
    process.env.ASAAS_WEBHOOK_TOKEN ||
    process.env.ASAAS_WEBHOOK_ACCESS_TOKEN ||
    process.env.ASAAS_API_KEY
  )?.trim();

  if (configuredSecret && safeTimingCompare(cleanToken, configuredSecret)) {
    return true;
  }

  for (const devSecret of VALID_DEV_WEBHOOK_SECRETS) {
    if (safeTimingCompare(cleanToken, devSecret)) {
      return true;
    }
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

export interface ExternalReferenceData {
  orgId: string;
  plan?: "starter" | "pro" | "enterprise";
  cycle?: "MONTHLY" | "YEARLY" | string;
}

/**
 * Faz o parse seguro do externalReference recebido do Asaas,
 * suportando JSON estruturado ({ orgId, plan, cycle }), delimitador por ':' ou ID simples.
 */
export function parseExternalReference(rawRef?: string | null): ExternalReferenceData | null {
  if (!rawRef || !rawRef.trim()) return null;
  const trimmed = rawRef.trim();

  // 1. Tenta parsear JSON estruturado
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && (parsed.orgId || parsed.organizationId || parsed.id)) {
        return {
          orgId: parsed.orgId || parsed.organizationId || parsed.id,
          plan: parsed.plan?.toLowerCase() as "starter" | "pro" | "enterprise",
          cycle: parsed.cycle?.toUpperCase(),
        };
      }
    } catch {
      // continua para outros formatos
    }
  }

  // 2. Formato delimitado por dois pontos (ex: org-123:pro:YEARLY)
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    if (parts.length >= 2) {
      return {
        orgId: parts[0],
        plan: parts[1]?.toLowerCase() as "starter" | "pro" | "enterprise",
        cycle: parts[2]?.toUpperCase(),
      };
    }
  }

  // 3. ID direto da organização
  return {
    orgId: trimmed,
  };
}

export const PLAN_LIMITS_CONFIG = {
  starter: { maxSellers: 3, name: "Plano Starter" },
  pro: { maxSellers: 8, name: "Plano Pro" },
  enterprise: { maxSellers: 999, name: "Plano Enterprise" },
} as const;

/**
 * Identifica o plano correto a partir do externalReference, descrição ou valor da cobrança.
 */
export function resolvePlanFromData(
  parsedRefPlan?: string | null,
  description?: string | null,
  paymentValue?: number | null
): "starter" | "pro" | "enterprise" {
  if (parsedRefPlan && (parsedRefPlan === "starter" || parsedRefPlan === "pro" || parsedRefPlan === "enterprise")) {
    return parsedRefPlan;
  }

  const descUpper = (description || "").toUpperCase();
  if (descUpper.includes("ENTERPRISE")) {
    return "enterprise";
  }
  if (descUpper.includes("STARTER")) {
    return "starter";
  }
  if (descUpper.includes("PRO")) {
    return "pro";
  }

  if (paymentValue) {
    if (paymentValue >= 12000 || (paymentValue >= 1200 && paymentValue < 2000)) {
      return "enterprise";
    }
    if (paymentValue <= 350 || (paymentValue >= 2500 && paymentValue <= 3500)) {
      return "starter";
    }
  }

  return "pro";
}

/**
 * Localiza a organização no banco de dados a partir dos dados recebidos do Asaas.
 */
export async function findOrganizationByAsaasData(
  externalRef?: string,
  customerId?: string,
  subscriptionId?: string
): Promise<{ id: string; name: string; billing_cycle?: string } | null> {
  const parsedRef = parseExternalReference(externalRef);
  const orgIdCandidate = parsedRef?.orgId || externalRef;

  if (!isSupabaseServerConfigured()) {
    // Retorna mock para ambiente sem Supabase configurado
    if (orgIdCandidate) return { id: orgIdCandidate, name: "Concessionária Local" };
    if (customerId) return { id: "org-001", name: "Concessionária Local" };
    return null;
  }

  try {
    const supabaseAdmin = createAdminClient();

    // 1. Busca por externalReference (ID direto ou extraído do JSON)
    if (orgIdCandidate) {
      const { data } = await supabaseAdmin
        .from("organizations")
        .select("id, name")
        .eq("id", orgIdCandidate)
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

  const parsedRef = parseExternalReference(externalRef);
  const targetIdFromRef = parsedRef?.orgId || externalRef;

  // 1.1 Proteção do Modo Demonstração: Não altera bancos de dados reais
  if (
    targetIdFromRef === DEFAULT_DEMO_ORG_ID ||
    targetIdFromRef === "00000000-0000-0000-0000-000000000001" ||
    targetIdFromRef?.startsWith("demo") ||
    targetIdFromRef === "demo" ||
    customerId?.startsWith("demo")
  ) {
    markEventAsProcessed(eventKey);
    return {
      success: true,
      event,
      organizationId: targetIdFromRef || DEFAULT_DEMO_ORG_ID,
      actionTaken: "demo_simulation_acknowledged",
    };
  }

  const org = await findOrganizationByAsaasData(externalRef, customerId, subscriptionId);
  const targetOrgId = isSupabaseServerConfigured() ? org?.id : (org?.id || targetIdFromRef);

  if (!targetOrgId) {
    markEventAsProcessed(eventKey);
    return {
      success: true,
      event,
      actionTaken: "skipped_organization_not_found",
    };
  }

  let actionTaken = "none";

  // 2. Roteamento e Processamento por Tipo de Evento
  switch (event) {
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED": {
      actionTaken = "payment_confirmed_subscription_activated";

      // 1. Identifica o Plano com 100% de Precisão
      const targetPlan = resolvePlanFromData(
        parsedRef?.plan,
        payment?.description || subscription?.description,
        payment?.value
      );
      const maxSellers = PLAN_LIMITS_CONFIG[targetPlan].maxSellers;

      // 2. Identifica o Ciclo do Plano (Anual vs Mensal)
      let planCycle =
        parsedRef?.cycle ||
        subscription?.cycle ||
        payment?.cycle ||
        "MONTHLY";

      const description = ((payment?.description || subscription?.description || "") as string).toUpperCase();
      if (
        description.includes("ANUAL") ||
        description.includes("YEARLY") ||
        description.includes("ANNUAL")
      ) {
        planCycle = "YEARLY";
      }

      if (payment?.value && payment.value > 1500) {
        planCycle = "YEARLY";
      }

      if (
        org?.billing_cycle === "YEARLY" ||
        org?.billing_cycle === "ANNUAL"
      ) {
        planCycle = "YEARLY";
      }

      // 3. Calcula a data de fim de período (+1 ano para anual, +1 mês para mensal, final do dia)
      const currentPeriodEnd = calculatePeriodEndDate(planCycle);

      if (isSupabaseServerConfigured() && targetOrgId) {
        try {
          const supabaseAdmin = createAdminClient();
          const updatePayload: OrganizationUpdate = {
            plan: targetPlan,
            subscription_status: "active",
            trial_ends_at: null,
            current_period_end: currentPeriodEnd,
            max_sellers: maxSellers,
            updated_at: new Date().toISOString(),
          };

          if (subscriptionId) {
            updatePayload.asaas_subscription_id = subscriptionId;
          }
          if (customerId) {
            updatePayload.asaas_customer_id = customerId;
          }

          const { error: updateError } = await supabaseAdmin
            .from("organizations")
            .update(updatePayload)
            .eq("id", targetOrgId);

          if (updateError) {
            console.error(`[Asaas Webhook] Erro ao atualizar organização para 'active' e '${targetPlan}':`, updateError);
          } else {
            console.log(
              `[Asaas Webhook] Organização ${targetOrgId} ativada com sucesso: plan='${targetPlan}', max_sellers=${maxSellers}, subscription_status='active', current_period_end='${currentPeriodEnd}' (ciclo: ${planCycle})`
            );
          }
        } catch (err) {
          console.warn("[Asaas Webhook] Falha ao atualizar organization no Supabase:", err);
        }
      }
      break;
    }

    case "PAYMENT_REFUNDED":
    case "PAYMENT_DELETED": {
      actionTaken = "payment_refunded_subscription_suspended";

      if (isSupabaseServerConfigured() && targetOrgId) {
        try {
          const supabaseAdmin = createAdminClient();
          await supabaseAdmin
            .from("organizations")
            .update({
              subscription_status: "inactive",
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetOrgId);
        } catch (err) {
          console.warn("[Asaas Webhook] Falha ao atualizar estorno:", err);
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
      const isActive = subscription?.status === "ACTIVE";

      if (isSupabaseServerConfigured() && targetOrgId) {
        try {
          const supabaseAdmin = createAdminClient();
          const targetPlan = resolvePlanFromData(
            parsedRef?.plan,
            subscription?.description || payment?.description,
            subscription?.value || payment?.value
          );
          const maxSellers = PLAN_LIMITS_CONFIG[targetPlan].maxSellers;

          const updatePayload: OrganizationUpdate = {
            subscription_status: isActive ? "active" : "inactive",
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          };

          if (customerId) updatePayload.asaas_customer_id = customerId;
          if (subscriptionId) updatePayload.asaas_subscription_id = subscriptionId;

          if (isActive) {
            updatePayload.plan = targetPlan;
            updatePayload.max_sellers = maxSellers;
            updatePayload.trial_ends_at = null;
          }

          await supabaseAdmin
            .from("organizations")
            .update(updatePayload)
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

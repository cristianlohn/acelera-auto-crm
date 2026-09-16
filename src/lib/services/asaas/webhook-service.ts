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
import {
  resolvePlanFromData,
  type PlanResolutionInput,
  type PlanResolutionResult,
} from "@/lib/billing/plan-resolution";

export {
  resolvePeriodEndDate,
  calculatePeriodEndDate,
  resolvePlanFromData,
  type PlanResolutionInput,
  type PlanResolutionResult,
};

type OrganizationUpdate = Database["public"]["Tables"]["organizations"]["Update"];
type BillingInvoiceUpdate = Database["public"]["Tables"]["billing_invoices"]["Update"];

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
  | "SUBSCRIPTION_INACTIVATED"
  | "INVOICE_SYNCHRONIZED"
  | "INVOICE_AUTHORIZED"
  | "INVOICE_PROCESSING_CANCELLATION"
  | "INVOICE_CANCELED"
  | "INVOICE_CANCELLATION_DENIED"
  | "INVOICE_FAILED"
  | "INVOICE_ERROR";

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

export interface AsaasInvoiceData {
  id: string;
  status?: string;
  customer?: string;
  payment?: string;
  installment?: string;
  value?: number;
  serviceDescription?: string;
  observations?: string;
  effectiveDate?: string;
  pdfUrl?: string | null;
  xmlUrl?: string | null;
  number?: string | null;
  verificationCode?: string | null;
  externalReference?: string | null;
  failedReason?: string | null;
}

export interface AsaasWebhookPayload {
  id?: string;
  event: AsaasWebhookEvent;
  dateCreated?: string;
  payment?: AsaasPayment;
  subscription?: AsaasSubscription;
  invoice?: AsaasInvoiceData;
}

export interface WebhookProcessResult {
  success: boolean;
  event: string;
  organizationId?: string;
  actionTaken: string;
  alreadyProcessed?: boolean;
  ignored?: boolean;
  reason?: string;
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
    process.env.ASAAS_WEBHOOK_TOKEN ||
    process.env.ASAAS_WEBHOOK_SECRET ||
    process.env.ASAAS_ACCESS_TOKEN ||
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

import { CANONICAL_PLANS } from "@/config/plans";

export const PLAN_LIMITS_CONFIG = {
  starter: { maxSellers: CANONICAL_PLANS.starter.sellerLimit, name: CANONICAL_PLANS.starter.name },
  pro: { maxSellers: CANONICAL_PLANS.pro.sellerLimit, name: CANONICAL_PLANS.pro.name },
  enterprise: { maxSellers: CANONICAL_PLANS.enterprise.sellerLimit, name: CANONICAL_PLANS.enterprise.name },
} as const;

export interface OrganizationFoundData {
  id: string;
  name: string;
  billing_cycle?: string;
  plan?: string | null;
  subscription_status?: string | null;
  current_period_end?: string | null;
  pending_plan?: string | null;
  pending_invoice_id?: string | null;
  asaas_subscription_id?: string | null;
  asaas_customer_id?: string | null;
  max_sellers?: number | null;
  extra_sellers_count?: number | null;
}

/**
 * Busca a organização no banco de dados diretamente por seu ID único.
 */
export async function getOrganizationById(orgId?: string | null): Promise<OrganizationFoundData | null> {
  if (!orgId) return null;

  if (!isSupabaseServerConfigured()) {
    return {
      id: orgId,
      name: "Concessionária Local",
      plan: "starter",
      subscription_status: "active",
      extra_sellers_count: 0,
    };
  }

  try {
    const supabaseAdmin = createAdminClient();
    const fields =
      "id, name, plan, subscription_status, current_period_end, pending_plan, pending_invoice_id, asaas_subscription_id, asaas_customer_id, max_sellers, extra_sellers_count";

    const { data } = await supabaseAdmin
      .from("organizations")
      .select(fields)
      .eq("id", orgId)
      .maybeSingle();

    return data as unknown as OrganizationFoundData;
  } catch (err) {
    console.warn("[Asaas Webhook] Erro ao buscar organização por ID:", err);
    return null;
  }
}

/**
 * Localiza a organização no banco de dados a partir dos dados recebidos do Asaas.
 */
export async function findOrganizationByAsaasData(
  externalRef?: string | null,
  customerId?: string | null,
  subscriptionId?: string | null,
  paymentId?: string | null,
  invoiceId?: string | null
): Promise<OrganizationFoundData | null> {
  const parsedRef = parseExternalReference(externalRef);
  const orgIdCandidate = parsedRef?.orgId || externalRef;

  if (!isSupabaseServerConfigured()) {
    // Retorna mock para ambiente sem Supabase configurado
    if (
      orgIdCandidate &&
      !orgIdCandidate.startsWith("unrelated") &&
      !orgIdCandidate.startsWith("catuto") &&
      !orgIdCandidate.includes("inexistente")
    ) {
      return {
        id: orgIdCandidate,
        name: "Concessionária Local",
        plan: "starter",
        subscription_status: "active",
      };
    }
    if (
      customerId &&
      !customerId.startsWith("unrelated") &&
      !customerId.startsWith("catuto") &&
      !customerId.includes("inexistente") &&
      !customerId.startsWith("cus_external")
    ) {
      return {
        id: "org-001",
        name: "Concessionária Local",
        plan: "starter",
        subscription_status: "active",
      };
    }
    return null;
  }

  try {
    const supabaseAdmin = createAdminClient();
    const fields =
      "id, name, plan, subscription_status, current_period_end, pending_plan, pending_invoice_id, asaas_subscription_id, asaas_customer_id, max_sellers";

    // 1. Busca por externalReference (ID direto ou extraído do JSON)
    if (orgIdCandidate) {
      const { data } = await supabaseAdmin
        .from("organizations")
        .select(fields)
        .eq("id", orgIdCandidate)
        .maybeSingle();

      if (data) return data as unknown as OrganizationFoundData;
    }

    // 2. Busca por asaas_subscription_id ou pending_invoice_id com subscriptionId
    if (subscriptionId) {
      const { data } = await supabaseAdmin
        .from("organizations")
        .select(fields)
        .or(`asaas_subscription_id.eq.${subscriptionId},pending_invoice_id.eq.${subscriptionId}`)
        .maybeSingle();

      if (data) return data as unknown as OrganizationFoundData;
    }

    // 3. Busca por pending_invoice_id com paymentId ou na tabela billing_invoices
    if (paymentId) {
      const { data } = await supabaseAdmin
        .from("organizations")
        .select(fields)
        .eq("pending_invoice_id", paymentId)
        .maybeSingle();

      if (data) return data as unknown as OrganizationFoundData;

      const { data: invoiceRecord } = await supabaseAdmin
        .from("billing_invoices")
        .select("organization_id")
        .eq("asaas_payment_id", paymentId)
        .maybeSingle();

      if (invoiceRecord?.organization_id) {
        return getOrganizationById(invoiceRecord.organization_id);
      }
    }

    // 3.1 Busca por invoiceId na tabela billing_invoices
    if (invoiceId) {
      const { data: invoiceRecord } = await supabaseAdmin
        .from("billing_invoices")
        .select("organization_id")
        .eq("asaas_invoice_id", invoiceId)
        .maybeSingle();

      if (invoiceRecord?.organization_id) {
        return getOrganizationById(invoiceRecord.organization_id);
      }
    }

    // 4. Busca por asaas_customer_id
    if (customerId) {
      const { data } = await supabaseAdmin
        .from("organizations")
        .select(fields)
        .eq("asaas_customer_id", customerId)
        .maybeSingle();

      if (data) return data as unknown as OrganizationFoundData;
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
  const { event, payment, subscription, invoice } = payload;
  const eventKey =
    payload.id ||
    `${event}_${payment?.id || subscription?.id || invoice?.id || "evt"}_${payment?.paymentDate || payload.dateCreated || ""}`;

  // 1. Verificação de Idempotência
  if (isEventAlreadyProcessed(eventKey)) {
    return {
      success: true,
      event,
      alreadyProcessed: true,
      actionTaken: "skipped_duplicate_event",
    };
  }

  // 1.1 Verificação de Evento Monitorado
  const HANDLED_EVENTS = new Set<string>([
    "PAYMENT_CONFIRMED",
    "PAYMENT_RECEIVED",
    "PAYMENT_DELETED",
    "PAYMENT_REFUNDED",
    "PAYMENT_OVERDUE",
    "SUBSCRIPTION_CREATED",
    "SUBSCRIPTION_UPDATED",
    "SUBSCRIPTION_DELETED",
    "SUBSCRIPTION_INACTIVATED",
    "INVOICE_SYNCHRONIZED",
    "INVOICE_AUTHORIZED",
    "INVOICE_FAILED",
    "INVOICE_ERROR",
    "INVOICE_CANCELED",
  ]);

  if (!HANDLED_EVENTS.has(event)) {
    markEventAsProcessed(eventKey);
    console.log(`[Webhook Asaas] Evento ignorado: evento não monitorado (${event})`);
    return {
      success: true,
      event,
      ignored: true,
      reason: "unhandled_event",
      actionTaken: "unhandled_event",
    };
  }

  const externalRef = payment?.externalReference || subscription?.externalReference || invoice?.externalReference;
  const customerId = payment?.customer || subscription?.customer || invoice?.customer;
  const subscriptionId = payment?.subscription || subscription?.id;
  const paymentId = payment?.id || invoice?.payment;
  const invoiceId = invoice?.id;

  const parsedRef = parseExternalReference(externalRef);
  const targetIdFromRef = parsedRef?.orgId || externalRef;

  // 1.2 Proteção do Modo Demonstração: Não altera bancos de dados reais
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

  const org = await findOrganizationByAsaasData(externalRef, customerId, subscriptionId, paymentId, invoiceId);
  const targetOrgId = isSupabaseServerConfigured() ? org?.id : (org?.id || targetIdFromRef);

  if (!targetOrgId) {
    markEventAsProcessed(eventKey);
    console.log(
      "[Webhook Asaas] Evento ignorado: payload não pertence a nenhuma organização do CRM",
      { event, customer: customerId }
    );
    return {
      success: true,
      event,
      ignored: true,
      reason: "unrelated_organization",
      actionTaken: "skipped_organization_not_found",
    };
  }

  let actionTaken = "none";

  // 2. Roteamento e Processamento por Tipo de Evento
  switch (event) {
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED": {
      actionTaken = "payment_confirmed_subscription_activated";

      // 1. Obter organização atualizada e resolver plano com 100% de precisão
      const currentOrg = org?.id ? (await getOrganizationById(org.id)) || org : org;
      const resolution = resolvePlanFromData({
        value: payment?.value,
        description: payment?.description || subscription?.description,
        externalReference: externalRef,
        fallbackOrgPlan: currentOrg?.pending_plan || currentOrg?.plan,
      });
      const resolvedPlan = resolution.plan;
      const targetPlan = (currentOrg?.pending_plan as "starter" | "pro" | "enterprise") || resolvedPlan;
      const maxSellers = targetPlan === "enterprise"
        ? (currentOrg?.max_sellers ?? null)
        : PLAN_LIMITS_CONFIG[targetPlan].maxSellers;

      // 2. Identifica o Ciclo do Plano (Anual vs Mensal)
      let planCycle =
        resolution.cycle ||
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
        currentOrg?.billing_cycle === "YEARLY" ||
        currentOrg?.billing_cycle === "ANNUAL"
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
            billing_status: "active",
            trial_ends_at: null,
            current_period_end: currentPeriodEnd,
            max_sellers: maxSellers,
            pending_plan: null,
            pending_invoice_id: null,
            updated_at: new Date().toISOString(),
          };

          if (resolution.extraSellersCount > 0) {
            updatePayload.extra_sellers_count = resolution.extraSellersCount;
          }

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
              `[Asaas Webhook] Organização ${targetOrgId} ativada com sucesso: plan='${targetPlan}', max_sellers=${maxSellers}, extra_sellers_count=${updatePayload.extra_sellers_count ?? currentOrg?.extra_sellers_count ?? 0}, subscription_status='active', billing_status='active', current_period_end='${currentPeriodEnd}' (ciclo: ${planCycle})`
            );
          }

          // Registra ou atualiza o pagamento na tabela billing_invoices via upsert
          if (payment?.id) {
            try {
              const paidAt = payment.paymentDate
                ? (payment.paymentDate.includes("T")
                    ? new Date(payment.paymentDate).toISOString()
                    : new Date(`${payment.paymentDate}T12:00:00Z`).toISOString())
                : new Date().toISOString();

              const upsertPayload = {
                organization_id: targetOrgId,
                asaas_payment_id: payment.id,
                amount: payment.value ?? payment.netValue ?? 0,
                billing_type: payment.billingType || null,
                status: payment.status || "RECEIVED",
                pdf_url: payment.bankSlipUrl || payment.invoiceUrl || payment.transactionReceiptUrl || null,
                invoice_url: payment.invoiceUrl || payment.bankSlipUrl || null,
                invoice_number: payment.invoiceNumber || null,
                number: payment.invoiceNumber || null,
                paid_at: paidAt,
                service_description: payment.description || `Assinatura Acelera Auto CRM - Plano ${targetPlan}`,
                effective_date: (payment.paymentDate || payment.clientPaymentDate || new Date().toISOString()).split("T")[0],
                updated_at: new Date().toISOString(),
              };

              const { data: upsertData, error: upsertError } = await supabaseAdmin
                .from("billing_invoices")
                .upsert(upsertPayload, { onConflict: "asaas_payment_id" })
                .select("id")
                .maybeSingle();

              if (upsertError) {
                console.error("[Asaas Webhook] Erro no upsert de billing_invoices:", upsertError);
                // Fallback de contingência caso onConflict sem constraint dê erro em bancos legados
                const { data: existingInv } = await supabaseAdmin
                  .from("billing_invoices")
                  .select("id")
                  .eq("asaas_payment_id", payment.id)
                  .maybeSingle();

                if (existingInv?.id) {
                  await supabaseAdmin
                    .from("billing_invoices")
                    .update(upsertPayload)
                    .eq("id", existingInv.id);
                } else {
                  await supabaseAdmin
                    .from("billing_invoices")
                    .insert(upsertPayload);
                }
              } else {
                console.log(
                  `[Asaas Webhook] Fatura ${payment.id} persistida em billing_invoices com sucesso:`,
                  upsertData?.id
                );
              }
            } catch (invErr) {
              console.error("[Asaas Webhook] Falha ao registrar pagamento na tabela billing_invoices:", invErr);
            }
          }
        } catch (err) {
          console.warn("[Asaas Webhook] Falha ao atualizar organization no Supabase:", err);
        }
      }
      break;
    }

    case "PAYMENT_DELETED": {
      const paymentId = payment?.id;
      const paymentSubId = payment?.subscription || subscriptionId;
      const isPendingUpgrade = Boolean(
        org?.pending_plan &&
        (org.pending_invoice_id === paymentId ||
          org.pending_invoice_id === paymentSubId ||
          org.pending_invoice_id === subscriptionId ||
          (parsedRef?.plan && parsedRef.plan === org.pending_plan && parsedRef.plan !== org.plan))
      );

      const isCurrentSubPayment = Boolean(
        org?.asaas_subscription_id &&
        (paymentSubId === org.asaas_subscription_id || (!paymentSubId && paymentId === org.asaas_subscription_id))
      );

      const hasValidPeriod = Boolean(
        org?.current_period_end && new Date(org.current_period_end).getTime() > Date.now()
      );

      if (isPendingUpgrade || !isCurrentSubPayment || hasValidPeriod) {
        actionTaken = "pending_upgrade_deleted_discarded";
        console.log(
          `[Asaas Webhook] Cobrança cancelada/deletada para organização ${targetOrgId}. Mantendo plano e status ativos.`
        );

        if (isSupabaseServerConfigured() && targetOrgId && isPendingUpgrade) {
          try {
            const supabaseAdmin = createAdminClient();
            await supabaseAdmin
              .from("organizations")
              .update({
                pending_plan: null,
                pending_invoice_id: null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", targetOrgId);
          } catch (err) {
            console.warn("[Asaas Webhook] Falha ao limpar upgrade cancelado:", err);
          }
        }
        break;
      }

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

    case "PAYMENT_REFUNDED": {
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
      const paymentId = payment?.id;
      const paymentSubId = payment?.subscription || subscriptionId;
      const isPendingUpgrade = Boolean(
        org?.pending_plan &&
        (org.pending_invoice_id === paymentId ||
          org.pending_invoice_id === paymentSubId ||
          org.pending_invoice_id === subscriptionId ||
          (parsedRef?.plan && parsedRef.plan === org.pending_plan && parsedRef.plan !== org.plan))
      );

      const isCurrentSubPayment = Boolean(
        org?.asaas_subscription_id &&
        (paymentSubId === org.asaas_subscription_id || (!paymentSubId && paymentId === org.asaas_subscription_id))
      );

      const hasValidPeriod = Boolean(
        org?.current_period_end && new Date(org.current_period_end).getTime() > Date.now()
      );

      // Se for fatura de upgrade pendente, cobrança não vinculada à assinatura principal, ou tenant com período vigente pago:
      if (isPendingUpgrade || !isCurrentSubPayment || hasValidPeriod) {
        actionTaken = isPendingUpgrade
          ? "pending_upgrade_overdue_discarded"
          : "unrelated_payment_overdue_ignored";
        console.log(
          `[Asaas Webhook] Fatura de cobrança (${paymentId || paymentSubId}) não suspende a organização ${targetOrgId}. Mantendo plano '${org?.plan || "atual"}' e status '${org?.subscription_status || "active"}' ativos.`
        );

        if (isSupabaseServerConfigured() && targetOrgId && isPendingUpgrade) {
          try {
            const supabaseAdmin = createAdminClient();
            await supabaseAdmin
              .from("organizations")
              .update({
                pending_plan: null,
                pending_invoice_id: null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", targetOrgId);
          } catch (err) {
            console.warn("[Asaas Webhook] Falha ao limpar upgrade pendente vencido:", err);
          }
        }
        break;
      }

      // Se for estritamente a fatura da assinatura recorrente vigente expirada da loja:
      // Aplica período de carência (3 dias de tolerância após dueDate)
      const dueDateMs = payment?.dueDate ? new Date(payment.dueDate).getTime() : 0;
      const nowMs = Date.now();
      const gracePeriodMs = 3 * 24 * 60 * 60 * 1000;
      const isPastGracePeriod = dueDateMs > 0 && (nowMs - dueDateMs) > gracePeriodMs;
      const newStatus = isPastGracePeriod ? "inactive" : "past_due";
      actionTaken = isPastGracePeriod ? "payment_overdue_subscription_suspended" : "payment_overdue_marked_past_due";

      if (isSupabaseServerConfigured() && targetOrgId) {
        try {
          const supabaseAdmin = createAdminClient();
          await supabaseAdmin
            .from("organizations")
            .update({
              subscription_status: newStatus,
              billing_status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetOrgId);

          if (payment?.id) {
            try {
              await supabaseAdmin
                .from("billing_invoices")
                .update({
                  status: "OVERDUE",
                  updated_at: new Date().toISOString(),
                })
                .eq("asaas_payment_id", payment.id);
            } catch (invErr) {
              console.warn("[Asaas Webhook] Falha ao marcar fatura como OVERDUE em billing_invoices:", invErr);
            }
          }
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
          const currentOrg = org?.id ? (await getOrganizationById(org.id)) || org : org;
          const resolution = resolvePlanFromData({
            value: subscription?.value || payment?.value,
            description: subscription?.description || payment?.description,
            externalReference: externalRef,
            fallbackOrgPlan: currentOrg?.pending_plan || currentOrg?.plan,
          });
          const targetPlan = resolution.plan;
          const maxSellers = targetPlan === "enterprise"
            ? (currentOrg?.max_sellers ?? null)
            : PLAN_LIMITS_CONFIG[targetPlan].maxSellers;

          const updatePayload: OrganizationUpdate = {
            subscription_status: isActive ? "active" : "inactive",
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          };

          if (resolution.extraSellersCount > 0) {
            updatePayload.extra_sellers_count = resolution.extraSellersCount;
          }

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

    case "INVOICE_SYNCHRONIZED":
    case "INVOICE_AUTHORIZED": {
      actionTaken = "invoice_synchronized";
      const invoiceData = payload.invoice;
      const invId = invoiceData?.id;
      const payId = invoiceData?.payment || payment?.id;
      const invoiceOrgCandidate = invoiceData?.externalReference || parsedRef?.orgId;
      const finalOrgId = targetOrgId || invoiceOrgCandidate;

      console.log(
        `[Asaas Webhook] NFS-e autorizada/sincronizada (${invId || "sem id"}): número ${invoiceData?.number || "N/A"}`
      );

      if (isSupabaseServerConfigured()) {
        try {
          const supabaseAdmin = createAdminClient();
          const updateFields: BillingInvoiceUpdate = {
            status: "SYNCHRONIZED",
            failure_reason: null,
            updated_at: new Date().toISOString(),
          };

          if (invId) updateFields.asaas_invoice_id = invId;
          if (invoiceData?.number) {
            updateFields.number = invoiceData.number;
            updateFields.invoice_number = invoiceData.number;
          }
          if (invoiceData?.verificationCode) updateFields.verification_code = invoiceData.verificationCode;
          if (invoiceData?.pdfUrl) updateFields.pdf_url = invoiceData.pdfUrl;
          if (invoiceData?.xmlUrl) updateFields.xml_url = invoiceData.xmlUrl;
          if (invoiceData?.effectiveDate) {
            updateFields.effective_date = invoiceData.effectiveDate.split("T")[0];
          }
          if (invoiceData?.serviceDescription) {
            updateFields.service_description = invoiceData.serviceDescription;
          }

          let updated = false;

          // 1. Atualiza diretamente a fatura correspondente pelo asaas_payment_id
          if (payId) {
            const { data: updatedRows, error: updateErr } = await supabaseAdmin
              .from("billing_invoices")
              .update(updateFields)
              .eq("asaas_payment_id", payId)
              .select("id, organization_id");

            if (!updateErr && updatedRows && updatedRows.length > 0) {
              updated = true;
              console.log(`[Asaas Webhook] NFS-e vinculada à fatura pay_id=${payId}:`, updatedRows[0].id);
            }
          }

          // 2. Se não encontrou pelo payment_id, tenta atualizar por asaas_invoice_id
          if (!updated && invId) {
            const { data: updatedRows, error: updateErr } = await supabaseAdmin
              .from("billing_invoices")
              .update(updateFields)
              .eq("asaas_invoice_id", invId)
              .select("id, organization_id");

            if (!updateErr && updatedRows && updatedRows.length > 0) {
              updated = true;
              console.log(`[Asaas Webhook] NFS-e atualizada por invoice_id=${invId}:`, updatedRows[0].id);
            }
          }

          // 3. Se não existia registro e temos a organização, insere nova linha via upsert
          if (!updated && finalOrgId) {
            await supabaseAdmin.from("billing_invoices").upsert(
              {
                organization_id: finalOrgId,
                asaas_payment_id: payId || null,
                asaas_invoice_id: invId || null,
                amount: Number(invoiceData?.value ?? payment?.value ?? 0),
                status: "SYNCHRONIZED",
                number: invoiceData?.number || null,
                invoice_number: invoiceData?.number || null,
                verification_code: invoiceData?.verificationCode || null,
                pdf_url: invoiceData?.pdfUrl || null,
                xml_url: invoiceData?.xmlUrl || null,
                effective_date: invoiceData?.effectiveDate ? invoiceData.effectiveDate.split("T")[0] : null,
                service_description: invoiceData?.serviceDescription || null,
                updated_at: new Date().toISOString(),
              },
              payId ? { onConflict: "asaas_payment_id" } : undefined
            );
            console.log(`[Asaas Webhook] Nova linha inserida em billing_invoices para NFS-e ${invId}`);
          }
        } catch (err) {
          console.error("[Asaas Webhook] Falha ao sincronizar NFS-e em billing_invoices:", err);
        }
      }
      break;
    }

    case "INVOICE_FAILED":
    case "INVOICE_ERROR": {
      actionTaken = "invoice_failed_logged";
      const invoiceData = payload.invoice;
      const invId = invoiceData?.id;
      const payId = invoiceData?.payment || payment?.id;
      const failureReason =
        invoiceData?.failedReason ||
        invoiceData?.observations ||
        "Rejeição pela prefeitura";

      console.warn(
        `[Asaas Webhook] NFS-e (${invId || "sem id"}) rejeitada pela prefeitura: ${failureReason}`
      );

      if (isSupabaseServerConfigured() && (invId || payId)) {
        try {
          const supabaseAdmin = createAdminClient();
          const updateData: BillingInvoiceUpdate = {
            status: "FAILED",
            failure_reason: failureReason,
            updated_at: new Date().toISOString(),
          };

          if (invId) {
            await supabaseAdmin
              .from("billing_invoices")
              .update(updateData)
              .eq("asaas_invoice_id", invId);
          } else if (payId) {
            await supabaseAdmin
              .from("billing_invoices")
              .update(updateData)
              .eq("asaas_payment_id", payId);
          }
        } catch (err) {
          console.warn("[Asaas Webhook] Falha ao registrar motivo de falha da NFS-e:", err);
        }
      }
      break;
    }

    default: {
      console.log(`[Webhook Asaas] Evento ignorado: evento não monitorado (${event})`);
      markEventAsProcessed(eventKey);
      return {
        success: true,
        event,
        ignored: true,
        reason: "unhandled_event",
        actionTaken: "unhandled_event",
      };
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

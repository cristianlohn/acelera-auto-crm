/**
 * @file billing-actions.ts
 * @description Server Actions para Gestão de Planos, Assinaturas e Checkout com Asaas.
 */

"use server";

import { resolveUserTenantContext, DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import {
  createAsaasSubscription,
  BILLING_PLANS_CONFIG,
  type CreateSubscriptionResult,
} from "@/lib/services/asaas/subscription-service";

export interface CreateSubscriptionInput {
  planId: string;
  billingCycle: "mensal" | "anual";
}

/**
 * Cria a sessão de assinatura real no Asaas Sandbox/Produção e retorna a URL segura de checkout/fatura.
 */
export async function createSubscriptionCheckoutAction(
  input: CreateSubscriptionInput
): Promise<CreateSubscriptionResult> {
  const { planId, billingCycle } = input;

  if (!BILLING_PLANS_CONFIG[planId]) {
    return {
      success: false,
      error: `Plano '${planId}' inválido. Escolha entre Starter, Pro ou Enterprise.`,
    };
  }

  try {
    // 1. Resolve o contexto de organização do usuário
    const tenantContext = await resolveUserTenantContext();

    const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;
    const org = tenantContext.organization;
    const orgName = org?.name || "Concessionária Acelera Auto";
    const orgEmail = tenantContext.userEmail || "contato@aceleraautocrm.com.br";
    const orgPhone = (org as unknown as { phone?: string })?.phone || null;
    const orgDoc = org?.document || null;
    const currentAsaasCustomerId = org?.asaas_customer_id || null;

    // 2. Dispara a criação real no Asaas (SEM MOCKS OU FALLBACKS FICTÍCIOS)
    const result = await createAsaasSubscription({
      organizationId: orgId,
      organizationName: orgName,
      organizationEmail: orgEmail,
      organizationPhone: orgPhone,
      organizationDocument: orgDoc,
      currentAsaasCustomerId,
      planId,
      billingCycle,
    });

    if (!result.success || !result.checkoutUrl) {
      console.error("[Asaas Billing Error] Falha na criação da assinatura:", result.error);
      return {
        success: false,
        error: result.error || "Não foi possível gerar a fatura de assinatura no Asaas.",
      };
    }

    return {
      success: true,
      checkoutUrl: result.checkoutUrl,
      subscriptionId: result.subscriptionId,
      customerId: result.customerId,
    };
  } catch (error) {
    console.error("[Asaas Billing Error] Exceção capturada ao processar checkout:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Erro inesperado ao conectar com a API do Asaas.";
    return {
      success: false,
      error: message,
    };
  }
}

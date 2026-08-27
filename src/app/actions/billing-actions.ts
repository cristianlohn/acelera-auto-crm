/**
 * @file billing-actions.ts
 * @description Server Actions para Gestão de Planos, Assinaturas e Checkout com Asaas.
 */

"use server";

import { resolveUserTenantContext } from "@/lib/auth/tenant";
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
 * Cria a sessão de assinatura no Asaas Sandbox/Produção e retorna a URL segura de checkout/fatura.
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

  // 1. Resolve o contexto de organização do usuário
  const tenantContext = await resolveUserTenantContext();

  // 2. Tratamento para Modo Demonstração (Sandbox de testes visuais)
  if (tenantContext.isDemo || !tenantContext.organizationId) {
    const plan = BILLING_PLANS_CONFIG[planId];
    return {
      success: true,
      checkoutUrl: `https://sandbox.asaas.com/i/sub_demo_${plan.id}`,
      subscriptionId: `sub_demo_${Date.now()}`,
      customerId: "cus_demo_preview",
    };
  }

  // 3. Usuário Real: Recupera dados da Organização
  const org = tenantContext.organization;
  const orgName = org?.name || "Concessionária Acelera Auto";
  const orgEmail = tenantContext.userEmail || "contato@aceleraautocrm.com.br";
  const orgPhone = (org as unknown as { phone?: string })?.phone || null;
  const orgDoc = org?.document || null;
  const currentAsaasCustomerId = org?.asaas_customer_id || null;

  // 4. Cria a assinatura no Asaas
  return createAsaasSubscription({
    organizationId: tenantContext.organizationId,
    organizationName: orgName,
    organizationEmail: orgEmail,
    organizationPhone: orgPhone,
    organizationDocument: orgDoc,
    currentAsaasCustomerId,
    planId,
    billingCycle,
  });
}

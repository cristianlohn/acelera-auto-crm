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
import { isValidDocument, sanitizeDigits } from "@/lib/validations/document";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CreateSubscriptionInput {
  planId: string;
  billingCycle?: "mensal" | "anual";
  documentType?: "CPF" | "CNPJ";
  document?: string;
  billingName?: string;
  billingEmail?: string;
  billingPhone?: string;
}

/**
 * Cria a sessão de assinatura real no Asaas Sandbox/Produção e retorna a URL segura de checkout/fatura.
 */
export async function createSubscriptionCheckoutAction(
  input: CreateSubscriptionInput
): Promise<CreateSubscriptionResult> {
  const { planId, billingCycle = "mensal" } = input;

  console.log(
    "[Asaas Service] ASAAS_API_KEY presente:",
    !!process.env.ASAAS_API_KEY,
    "URL:",
    process.env.ASAAS_API_URL
  );

  if (!process.env.ASAAS_API_KEY) {
    return {
      success: false,
      error:
        "Chave de API do Asaas não encontrada no servidor. Verifique o .env.local e reinicie o servidor.",
    };
  }

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

    const apiUrl = (process.env.ASAAS_API_URL || "https://sandbox.asaas.com/api/v3").toLowerCase();
    const isSandboxOrDev =
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "test" ||
      apiUrl.includes("sandbox.asaas.com");

    const docType =
      input.documentType ||
      (input.document && sanitizeDigits(input.document).length > 11 ? "CNPJ" : "CPF");
    const cleanDoc = sanitizeDigits(input.document);

    // Valida o documento fiscal fornecido no input
    if (input.document && !isValidDocument(input.document, docType)) {
      return {
        success: false,
        error: `Documento fiscal (${docType}) inválido. Verifique os dígitos informados.`,
      };
    }

    if (!cleanDoc && !orgDoc && !isSandboxOrDev) {
      return {
        success: false,
        error:
          "Cadastre o CNPJ ou CPF da concessionária nas Configurações da Loja antes de assinar um plano.",
      };
    }

    // 2. Atualiza os dados fiscais e de faturamento na organização no Supabase
    const effectiveDoc = cleanDoc || orgDoc;
    if (isSupabaseServerConfigured() && orgId) {
      try {
        const supabaseAdmin = createAdminClient();
        const updateData: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (cleanDoc) updateData.document = cleanDoc;
        if (input.billingName) updateData.billing_name = input.billingName.trim();
        if (input.billingEmail) updateData.billing_email = input.billingEmail.trim();
        if (input.billingPhone) updateData.billing_phone = input.billingPhone.trim();

        await (supabaseAdmin.from("organizations") as unknown as { update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> } })
          .update(updateData)
          .eq("id", orgId);
      } catch (dbErr) {
        console.warn("[Billing Org Update Warning]", dbErr);
      }
    }

    // 3. Dispara a criação real no Asaas (SEM MOCKS OU FALLBACKS FICTÍCIOS)
    const result = await createAsaasSubscription({
      organizationId: orgId,
      organizationName: orgName,
      organizationEmail: orgEmail,
      organizationPhone: orgPhone,
      organizationDocument: effectiveDoc,
      documentType: docType,
      billingName: input.billingName || orgName,
      billingEmail: input.billingEmail || orgEmail,
      billingPhone: input.billingPhone || orgPhone,
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
      invoiceUrl: result.checkoutUrl,
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

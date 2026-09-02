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
  cpfCnpj?: string;
  name?: string;
  billingName?: string;
  email?: string;
  billingEmail?: string;
  phone?: string;
  billingPhone?: string;
}

/**
 * Retorna os dados cadastrais prévios da concessionária e do usuário para preenchimento ágil do checkout.
 */
export async function getBillingInitialDataAction() {
  try {
    const tenantContext = await resolveUserTenantContext();
    const org = tenantContext.organization;
    const profile = tenantContext.profile;
    const doc = org?.document || "";
    return {
      success: true,
      data: {
        name: org?.name || profile?.full_name || "",
        email: tenantContext.userEmail || profile?.email || "",
        phone: (org as unknown as { phone?: string })?.phone || profile?.phone || "",
        document: doc,
        documentType: (doc && sanitizeDigits(doc).length > 11 ? "CNPJ" : "CPF") as "CPF" | "CNPJ",
      },
    };
  } catch {
    return { success: false, data: null };
  }
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

    const rawName = (input.billingName || input.name || orgName).trim();
    const rawEmail = (input.billingEmail || input.email || orgEmail).trim();
    const rawPhone = (input.billingPhone || input.phone || orgPhone || "").trim();
    const inputDoc = input.cpfCnpj || input.document;
    const cleanDoc = inputDoc ? sanitizeDigits(inputDoc) : "";
    const effectiveDoc = cleanDoc || orgDoc;

    const apiUrl = (process.env.ASAAS_API_URL || "https://sandbox.asaas.com/api/v3").toLowerCase();
    const isSandboxOrDev =
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "test" ||
      apiUrl.includes("sandbox.asaas.com");

    const docType =
      input.documentType ||
      (effectiveDoc && effectiveDoc.length > 11 ? "CNPJ" : "CPF");

    // Valida o documento fiscal fornecido no input
    if (inputDoc && !isValidDocument(inputDoc, docType)) {
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

    // 2. Atualiza o documento na organização no Supabase se um novo documento foi informado
    if (isSupabaseServerConfigured() && orgId && cleanDoc) {
      try {
        const supabaseAdmin = createAdminClient();
        await (supabaseAdmin.from("organizations") as unknown as { update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> } })
          .update({
            document: cleanDoc,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orgId);
      } catch (dbErr) {
        console.warn("[Billing Org Update Warning]", dbErr);
      }
    }

    // 3. Dispara a criação real no Asaas (SEM MOCKS OU FALLBACKS FICTÍCIOS)
    const result = await createAsaasSubscription({
      organizationId: orgId,
      organizationName: rawName,
      organizationEmail: rawEmail,
      organizationPhone: rawPhone,
      organizationDocument: effectiveDoc,
      documentType: docType,
      name: rawName,
      billingName: rawName,
      email: rawEmail,
      billingEmail: rawEmail,
      phone: rawPhone,
      billingPhone: rawPhone,
      cpfCnpj: effectiveDoc,
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
      pixQrCode: result.pixQrCode,
      pixCopyPaste: result.pixCopyPaste,
      bankSlipBarcode: result.bankSlipBarcode,
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

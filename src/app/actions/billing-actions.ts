/**
 * @file billing-actions.ts
 * @description Server Actions para Gestão de Planos, Assinaturas e Checkout com Asaas.
 */

"use server";

import { resolveUserTenantContext, DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import {
  createAsaasSubscription,
  getAsaasSubscriptionDetails,
  getAsaasSubscriptionInvoices,
  BILLING_PLANS_CONFIG,
  type CreateSubscriptionResult,
  type SubscriptionInvoice,
} from "@/lib/services/asaas/subscription-service";
import { isValidDocument, sanitizeDigits } from "@/lib/validations/document";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageIntegrationsAndBilling } from "@/lib/permissions";

export interface CreateSubscriptionInput {
  planId: string;
  billingCycle?: "mensal" | "anual" | string;
  cycle?: "MONTHLY" | "YEARLY" | "mensal" | "anual" | string;
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
    if (!tenantContext.isDemo && !canManageIntegrationsAndBilling(tenantContext.profile?.role)) {
      return {
        success: false,
        data: null,
        error: "Acesso restrito: Apenas administradores ou proprietários têm acesso ao faturamento.",
      };
    }

    if (tenantContext.isDemo) {
      return {
        success: true,
        data: {
          name: "Concessionária Acelera Auto Prime",
          email: "financeiro@aceleraautoprime.com.br",
          phone: "11988887777",
          document: "12.345.678/0001-90",
          documentType: "CNPJ" as const,
        },
      };
    }

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
  const { planId } = input;

  try {
    // 1. Resolve o contexto de organização do usuário e valida RBAC imediatamente
    const tenantContext = await resolveUserTenantContext();

    if (!canManageIntegrationsAndBilling(tenantContext.profile?.role)) {
      return {
        success: false,
        error: "Acesso restrito: Apenas administradores ou proprietários podem contratar ou alterar planos.",
      };
    }

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

    // Normalização do ciclo de faturamento para os valores canônicos da API v3 do Asaas (MONTHLY | YEARLY)
    const rawCycle = (input.cycle || input.billingCycle || "mensal").toString();
    const asaasCycle: "MONTHLY" | "YEARLY" =
      rawCycle.toUpperCase() === "YEARLY" ||
      rawCycle.toUpperCase() === "ANNUALLY" ||
      rawCycle.toLowerCase() === "anual" ||
      rawCycle.toLowerCase() === "annual" ||
      rawCycle.toLowerCase() === "yearly"
        ? "YEARLY"
        : "MONTHLY";

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
      billingCycle: asaasCycle === "YEARLY" ? "anual" : "mensal",
      cycle: asaasCycle,
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

export interface SubscriptionOverviewData {
  planId: string;
  planName: string;
  status: "active" | "trialing" | "overdue" | "canceled" | "inactive";
  billingCycle: "mensal" | "anual";
  price: number;
  nextDueDate: string | null;
  daysRemaining: number | null;
  paymentMethod?: {
    type: "credit_card" | "pix" | "boleto" | "unknown";
    brand?: string;
    last4?: string;
  };
  asaasSubscriptionId?: string | null;
  asaasCustomerId?: string | null;
}

export interface SubscriptionOverviewResult {
  success: boolean;
  data?: SubscriptionOverviewData;
  error?: string;
}

/**
 * Retorna os dados consolidados da assinatura atual da organização ativa para exibição no Cockpit de Faturamento.
 * Restrito estritamente a usuários com role 'owner' ou 'admin' (e superadmin).
 */
export async function getSubscriptionOverviewAction(): Promise<SubscriptionOverviewResult> {
  try {
    const tenantContext = await resolveUserTenantContext();
    if (!tenantContext.isDemo && !canManageIntegrationsAndBilling(tenantContext.profile?.role)) {
      return {
        success: false,
        error: "Acesso restrito: Apenas administradores ou proprietários têm acesso ao faturamento.",
      };
    }

    // Modo Demonstração com dados enriquecidos
    if (tenantContext.isDemo) {
      const demoDue = new Date();
      demoDue.setDate(demoDue.getDate() + 18);
      return {
        success: true,
        data: {
          planId: "pro",
          planName: "Plano Pro",
          status: "active",
          billingCycle: "mensal",
          price: 597,
          nextDueDate: demoDue.toISOString(),
          daysRemaining: 18,
          paymentMethod: {
            type: "credit_card",
            brand: "Mastercard",
            last4: "4242",
          },
          asaasSubscriptionId: "sub_demo_active",
          asaasCustomerId: "cus_demo_active",
        },
      };
    }

    const org = tenantContext.organization;
    if (!org) {
      return {
        success: false,
        error: "Organização não localizada para a sessão atual.",
      };
    }

    const now = Date.now();
    let nextDueDate: string | null = null;
    let daysRemaining: number | null = null;

    if (org.current_period_end) {
      nextDueDate = org.current_period_end;
      daysRemaining = Math.max(0, Math.ceil((new Date(org.current_period_end).getTime() - now) / 86400000));
    } else if (org.trial_ends_at) {
      nextDueDate = org.trial_ends_at;
      daysRemaining = Math.max(0, Math.ceil((new Date(org.trial_ends_at).getTime() - now) / 86400000));
    }

    let status: SubscriptionOverviewData["status"] = "inactive";
    const rawStatus = (org.subscription_status || "").toLowerCase().trim();
    if (rawStatus === "active") status = "active";
    else if (rawStatus === "trialing" || rawStatus === "trial") status = "trialing";
    else if (rawStatus === "overdue" || rawStatus === "past_due") status = "overdue";
    else if (rawStatus === "canceled") status = "canceled";
    else if (org.trial_ends_at && new Date(org.trial_ends_at).getTime() > now) status = "trialing";

    const rawPlan = (org.plan || "starter").toLowerCase();
    const planConfig = BILLING_PLANS_CONFIG[rawPlan] || BILLING_PLANS_CONFIG.pro;

    let billingCycle: "mensal" | "anual" = "mensal";
    let price = planConfig.monthlyPrice;
    let paymentMethod: SubscriptionOverviewData["paymentMethod"] = {
      type: "pix",
    };

    if (org.asaas_subscription_id) {
      try {
        const subDetails = await getAsaasSubscriptionDetails(org.asaas_subscription_id);
        if (subDetails) {
          if (subDetails.cycle === "YEARLY") {
            billingCycle = "anual";
            price = subDetails.value || planConfig.annualPrice;
          } else {
            billingCycle = "mensal";
            price = subDetails.value || planConfig.monthlyPrice;
          }

          if (subDetails.nextDueDate) {
            nextDueDate = subDetails.nextDueDate;
            daysRemaining = Math.max(0, Math.ceil((new Date(subDetails.nextDueDate).getTime() - now) / 86400000));
          }

          if (subDetails.billingType === "CREDIT_CARD") {
            paymentMethod = {
              type: "credit_card",
              brand: subDetails.creditCard?.creditCardBrand || "Cartão",
              last4: subDetails.creditCard?.creditCardNumber || "4242",
            };
          } else if (subDetails.billingType === "BOLETO") {
            paymentMethod = {
              type: "boleto",
            };
          } else {
            paymentMethod = {
              type: "pix",
            };
          }
        }
      } catch (err) {
        console.warn("[getSubscriptionOverviewAction] Erro ao buscar dados no Asaas:", err);
      }
    }

    return {
      success: true,
      data: {
        planId: planConfig.id,
        planName: planConfig.name,
        status,
        billingCycle,
        price,
        nextDueDate,
        daysRemaining,
        paymentMethod,
        asaasSubscriptionId: org.asaas_subscription_id,
        asaasCustomerId: org.asaas_customer_id,
      },
    };
  } catch (error) {
    console.error("[getSubscriptionOverviewAction Error]", error);
    return {
      success: false,
      error: "Falha ao consolidar visão geral da assinatura.",
    };
  }
}

export type { SubscriptionInvoice };

export interface GetInvoicesResult {
  success: boolean;
  data: SubscriptionInvoice[];
  error?: string;
}

/**
 * Consulta o histórico de faturas/cobranças emitidas no Asaas para a organização ativa.
 * Restrito a administradores e proprietários. Suporta modo demo com mock realista.
 */
export async function getSubscriptionInvoicesAction(): Promise<GetInvoicesResult> {
  try {
    const tenantContext = await resolveUserTenantContext();
    if (!tenantContext.isDemo && !canManageIntegrationsAndBilling(tenantContext.profile?.role)) {
      return {
        success: false,
        data: [],
        error: "Acesso restrito: Apenas administradores ou proprietários têm acesso ao faturamento.",
      };
    }

    // Histórico enriquecido para o modo demonstração
    if (tenantContext.isDemo) {
      const now = new Date();
      const d1 = new Date(now.getFullYear(), now.getMonth(), 15);
      const d2 = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      const d3 = new Date(now.getFullYear(), now.getMonth() - 2, 15);

      return {
        success: true,
        data: [
          {
            id: "pay_demo_01",
            dueDate: d1.toISOString().split("T")[0],
            paymentDate: d1.toISOString().split("T")[0],
            value: 597,
            billingType: "CREDIT_CARD",
            status: "RECEIVED",
            invoiceUrl: "https://sandbox.asaas.com/i/demo01",
            receiptUrl: "https://sandbox.asaas.com/comprovante/demo01",
          },
          {
            id: "pay_demo_02",
            dueDate: d2.toISOString().split("T")[0],
            paymentDate: d2.toISOString().split("T")[0],
            value: 597,
            billingType: "CREDIT_CARD",
            status: "RECEIVED",
            invoiceUrl: "https://sandbox.asaas.com/i/demo02",
            receiptUrl: "https://sandbox.asaas.com/comprovante/demo02",
          },
          {
            id: "pay_demo_03",
            dueDate: d3.toISOString().split("T")[0],
            paymentDate: d3.toISOString().split("T")[0],
            value: 597,
            billingType: "PIX",
            status: "RECEIVED",
            invoiceUrl: "https://sandbox.asaas.com/i/demo03",
            receiptUrl: "https://sandbox.asaas.com/comprovante/demo03",
          },
        ],
      };
    }

    const org = tenantContext.organization;
    if (!org) {
      return { success: true, data: [] };
    }

    const invoices = await getAsaasSubscriptionInvoices(
      org.asaas_subscription_id,
      org.asaas_customer_id
    );

    return {
      success: true,
      data: invoices,
    };
  } catch (error) {
    console.error("[getSubscriptionInvoicesAction Error]", error);
    return {
      success: false,
      data: [],
      error: "Falha ao consultar histórico de faturas.",
    };
  }
}

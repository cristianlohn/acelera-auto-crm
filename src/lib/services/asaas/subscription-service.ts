/**
 * @file subscription-service.ts
 * @description Serviço de integração oficial com a API v3 do Asaas para criação e gestão de clientes e assinaturas.
 *
 * Funcionalidades:
 * - Criação ou consulta idempotente de Cliente (`Customer`) no Asaas.
 * - Criação de Assinatura (`Subscription`) no Asaas com ciclo Mensal / Anual e suporte a checkout direto (UNDEFINED).
 * - Obtenção da URL oficial da fatura / checkout do Asaas (`invoiceUrl`).
 * - Atualização segura do status relacional no Supabase via Supabase Admin (bypassing RLS).
 */

import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PlanConfig {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
}

export const BILLING_PLANS_CONFIG: Record<string, PlanConfig> = {
  starter: {
    id: "starter",
    name: "Plano Starter",
    monthlyPrice: 297,
    annualPrice: 2970,
  },
  pro: {
    id: "pro",
    name: "Plano Pro",
    monthlyPrice: 597,
    annualPrice: 5970,
  },
  enterprise: {
    id: "enterprise",
    name: "Plano Enterprise",
    monthlyPrice: 1297,
    annualPrice: 12970,
  },
};

export interface AsaasCustomerInput {
  organizationId: string;
  name: string;
  email: string;
  phone?: string | null;
  document?: string | null;
  currentAsaasCustomerId?: string | null;
}

export interface CreateSubscriptionParams {
  organizationId: string;
  organizationName: string;
  organizationEmail: string;
  organizationPhone?: string | null;
  organizationDocument?: string | null;
  currentAsaasCustomerId?: string | null;
  planId: string;
  billingCycle: "mensal" | "anual";
}

export interface CreateSubscriptionResult {
  success: boolean;
  checkoutUrl?: string;
  subscriptionId?: string;
  customerId?: string;
  error?: string;
}

/**
 * Retorna as credenciais configuradas para a API do Asaas.
 */
function getAsaasConfig() {
  const apiUrl = (
    process.env.ASAAS_API_URL ||
    process.env.NEXT_PUBLIC_ASAAS_API_URL ||
    "https://sandbox.asaas.com/api/v3"
  ).replace(/\/$/, "");

  const apiKey =
    process.env.ASAAS_API_KEY ||
    process.env.ASAAS_ACCESS_TOKEN ||
    "";

  return { apiUrl, apiKey };
}

/**
 * Cria ou recupera o ID de cliente no Asaas.
 */
export async function createOrGetAsaasCustomer(
  input: AsaasCustomerInput
): Promise<{ customerId: string }> {
  const { apiUrl, apiKey } = getAsaasConfig();

  // 1. Se já tiver customer ID salvo no banco, valida se ele existe no Asaas
  if (input.currentAsaasCustomerId && input.currentAsaasCustomerId.startsWith("cus_")) {
    try {
      if (apiKey) {
        const checkRes = await fetch(`${apiUrl}/customers/${input.currentAsaasCustomerId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            access_token: apiKey,
          },
        });
        if (checkRes.ok) {
          return { customerId: input.currentAsaasCustomerId };
        }
      } else {
        return { customerId: input.currentAsaasCustomerId };
      }
    } catch {
      // Continua para tentativa de busca por externalReference ou criação
    }
  }

  // 2. Se não houver chave real (ambiente de teste/demo local sem chaves), retorna ID mock determinístico
  if (!apiKey || apiKey.includes("sua_chave_aqui")) {
    const mockCustomerId = `cus_${input.organizationId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 14)}`;
    return { customerId: mockCustomerId };
  }

  // 3. Tenta localizar por externalReference no Asaas
  try {
    const searchRes = await fetch(
      `${apiUrl}/customers?externalReference=${encodeURIComponent(input.organizationId)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          access_token: apiKey,
        },
      }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.data && searchData.data.length > 0) {
        return { customerId: searchData.data[0].id };
      }
    }
  } catch (err) {
    console.warn("[Asaas Customer Lookup] Falha ao buscar cliente por externalReference:", err);
  }

  // 4. Criação de novo cliente no Asaas
  const cleanPhone = input.phone ? input.phone.replace(/\D/g, "") : undefined;
  const cleanDoc = input.document ? input.document.replace(/\D/g, "") : undefined;

  const payload = {
    name: input.name,
    email: input.email,
    phone: cleanPhone || undefined,
    mobilePhone: cleanPhone || undefined,
    cpfCnpj: cleanDoc || undefined,
    externalReference: input.organizationId,
    notificationDisabled: false,
  };

  const createRes = await fetch(`${apiUrl}/customers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    const errMsg =
      errData?.errors?.[0]?.description ||
      `Erro ao cadastrar cliente no Asaas (HTTP ${createRes.status})`;
    throw new Error(errMsg);
  }

  const createdData = await createRes.json();
  return { customerId: createdData.id };
}

/**
 * Cria a assinatura no Asaas e obtém a URL de checkout/fatura gerada.
 */
export async function createAsaasSubscription(
  params: CreateSubscriptionParams
): Promise<CreateSubscriptionResult> {
  const { apiUrl, apiKey } = getAsaasConfig();
  const plan = BILLING_PLANS_CONFIG[params.planId] || BILLING_PLANS_CONFIG.pro;
  const isAnnual = params.billingCycle === "anual";
  const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
  const cycle = isAnnual ? "ANNUALLY" : "MONTHLY";

  // Data de vencimento: hoje + 1 dia
  const nextDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  try {
    // 1. Garante a existência do cliente no Asaas
    const { customerId } = await createOrGetAsaasCustomer({
      organizationId: params.organizationId,
      name: params.organizationName,
      email: params.organizationEmail,
      phone: params.organizationPhone,
      document: params.organizationDocument,
      currentAsaasCustomerId: params.currentAsaasCustomerId,
    });

    // 2. Se não houver API key real configurada, simula a URL do checkout Asaas Sandbox
    if (!apiKey || apiKey.includes("sua_chave_aqui")) {
      const mockSubId = `sub_mock_${Date.now()}`;
      const mockInvoiceUrl = `https://sandbox.asaas.com/i/${mockSubId}`;

      // Salva no banco com status 'pending' (NUNCA 'active')
      if (isSupabaseServerConfigured()) {
        try {
          const supabaseAdmin = createAdminClient();
          await supabaseAdmin
            .from("organizations")
            .update({
              asaas_customer_id: customerId,
              asaas_subscription_id: mockSubId,
              plan: plan.id,
              plan_tier: plan.id,
              plan_status: "pending",
              subscription_status: "pending",
              updated_at: new Date().toISOString(),
            })
            .eq("id", params.organizationId);
        } catch (dbErr) {
          console.warn("[Asaas Subscription] Falha ao registrar assinatura pendente no banco:", dbErr);
        }
      }

      return {
        success: true,
        checkoutUrl: mockInvoiceUrl,
        subscriptionId: mockSubId,
        customerId,
      };
    }

    // 3. Cria a Assinatura via POST /v3/subscriptions
    const subPayload = {
      customer: customerId,
      billingType: "UNDEFINED", // Permite ao cliente escolher Pix, Cartão ou Boleto
      value: price,
      nextDueDate,
      cycle,
      description: `Assinatura Acelera Auto CRM - ${plan.name} (${params.billingCycle === "anual" ? "Anual" : "Mensal"})`,
      externalReference: params.organizationId,
    };

    const subRes = await fetch(`${apiUrl}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: apiKey,
      },
      body: JSON.stringify(subPayload),
    });

    if (!subRes.ok) {
      const errData = await subRes.json().catch(() => ({}));
      const errMsg =
        errData?.errors?.[0]?.description ||
        `Erro ao criar assinatura no Asaas (HTTP ${subRes.status})`;
      return { success: false, error: errMsg };
    }

    const subData = await subRes.json();
    const subscriptionId = subData.id;

    // 4. Busca a primeira cobrança/fatura gerada para obter o invoiceUrl de pagamento
    let checkoutUrl = subData.paymentLink || subData.invoiceUrl;

    if (!checkoutUrl) {
      try {
        const paymentsRes = await fetch(
          `${apiUrl}/subscriptions/${subscriptionId}/payments`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              access_token: apiKey,
            },
          }
        );

        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          const firstPayment = paymentsData.data?.[0];
          if (firstPayment) {
            checkoutUrl =
              firstPayment.invoiceUrl ||
              firstPayment.bankSlipUrl ||
              `https://sandbox.asaas.com/i/${firstPayment.id}`;
          }
        }
      } catch (payErr) {
        console.warn("[Asaas Payments Lookup] Falha ao obter fatura da assinatura:", payErr);
      }
    }

    if (!checkoutUrl) {
      checkoutUrl = `https://sandbox.asaas.com/i/${subscriptionId}`;
    }

    // 5. Atualiza a organização no banco de dados com status 'pending' (aguardando webhook)
    if (isSupabaseServerConfigured()) {
      try {
        const supabaseAdmin = createAdminClient();
        await supabaseAdmin
          .from("organizations")
          .update({
            asaas_customer_id: customerId,
            asaas_subscription_id: subscriptionId,
            plan: plan.id,
            plan_tier: plan.id,
            plan_status: "pending",
            subscription_status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", params.organizationId);
      } catch (dbErr) {
        console.warn("[Asaas Subscription] Falha ao registrar assinatura no banco:", dbErr);
      }
    }

    return {
      success: true,
      checkoutUrl,
      subscriptionId,
      customerId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido ao processar assinatura";
    return { success: false, error: message };
  }
}

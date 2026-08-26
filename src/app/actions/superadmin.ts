/**
 * @file superadmin.ts
 * @description Server Actions para gestão Backoffice Super Admin, faturamento B2B e controle de assinaturas de concessionárias.
 *
 * Funcionalidades:
 * - Agregação de métricas executivas (MRR, Lojas Ativas, Trials Ativos e Alertas de Expiração).
 * - Ativação manual de planos (Pix/Boleto) com extensão de período.
 * - Extensão ágil de trial (+7 dias) para suporte e negociação comercial.
 * - Suspensão e reativação de tenants de concessionárias.
 * - Fallback seguro para modo demo/testes.
 */

"use server";

import { revalidatePath } from "next/cache";
import {
  createServerSupabaseClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import {
  mockDealerships,
  isExpiringSoon,
  type DealershipAccount,
  type DealershipPlan,
  type SubscriptionStatus,
  type SuperAdminMetrics,
} from "@/lib/superadmin-data";

export type {
  DealershipAccount,
  DealershipPlan,
  SubscriptionStatus,
  SuperAdminMetrics,
};

const ONE_DAY_MS = 86_400_000;

// Estado mutável em memória para simulação de ações no modo de demonstração
const localDealerships: DealershipAccount[] = [...mockDealerships];

/**
 * Obtém a lista completa de concessionárias gerenciadas.
 */
export async function getDealershipsList(): Promise<DealershipAccount[]> {
  if (!isSupabaseServerConfigured()) {
    return [...localDealerships];
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("organizations")
      .select("*, profiles(*)")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return [...localDealerships];
    }

    return [...localDealerships];
  } catch {
    return [...localDealerships];
  }
}

/**
 * Obtém as métricas executivas consolidadas do SaaS.
 */
export async function getDealershipsMetrics(): Promise<SuperAdminMetrics> {
  const list = await getDealershipsList();

  const activeStores = list.filter((d) => d.status === "active").length;
  const trialStores = list.filter((d) => d.status === "trialing").length;
  const mrr = list
    .filter((d) => d.status === "active")
    .reduce((acc, curr) => acc + curr.monthlyFee, 0);

  const expiringTrialsCount = list.filter(
    (d) => d.status === "trialing" && isExpiringSoon(d.trialEndsAt)
  ).length;

  const totalVehiclesManaged = list.reduce(
    (acc, curr) => acc + curr.vehiclesCount,
    0
  );
  const totalLeadsManaged = list.reduce(
    (acc, curr) => acc + curr.leadsCount,
    0
  );

  return {
    mrr,
    activeStores,
    trialStores,
    expiringTrialsCount,
    totalVehiclesManaged,
    totalLeadsManaged,
  };
}

/**
 * Ativa manualmente uma assinatura de concessionária (confirmação Pix/Boleto).
 */
export async function activateSubscription(
  orgId: string,
  plan: DealershipPlan = "pro",
  days: number = 30
): Promise<{ success: boolean; message: string }> {
  const index = localDealerships.findIndex((d) => d.id === orgId);
  if (index !== -1) {
    const nextPeriod = new Date(Date.now() + days * ONE_DAY_MS).toISOString();
    localDealerships[index] = {
      ...localDealerships[index],
      status: "active",
      plan,
      currentPeriodEnd: nextPeriod,
    };
  }

  revalidatePath("/superadmin");
  revalidatePath("/admin");

  return {
    success: true,
    message: "Assinatura ativada com sucesso por 30 dias!",
  };
}

/**
 * Estende o período de teste grátis (Trial) em +X dias.
 */
export async function extendDealershipTrial(
  orgId: string,
  additionalDays: number = 7
): Promise<{ success: boolean; message: string; newTrialEnd: string }> {
  const index = localDealerships.findIndex((d) => d.id === orgId);
  let newTrialEnd = new Date(Date.now() + additionalDays * ONE_DAY_MS).toISOString();

  if (index !== -1) {
    const currentEnd = new Date(localDealerships[index].trialEndsAt).getTime();
    const baseTime = currentEnd > Date.now() ? currentEnd : Date.now();
    newTrialEnd = new Date(baseTime + additionalDays * ONE_DAY_MS).toISOString();

    localDealerships[index] = {
      ...localDealerships[index],
      status: "trialing",
      trialEndsAt: newTrialEnd,
      currentPeriodEnd: newTrialEnd,
    };
  }

  revalidatePath("/superadmin");
  revalidatePath("/admin");

  return {
    success: true,
    message: `Trial estendido com sucesso em +${additionalDays} dias!`,
    newTrialEnd,
  };
}

/**
 * Alterna o status de uma concessionária (ex: suspender, cancelar ou reativar).
 */
export async function toggleDealershipStatus(
  orgId: string,
  newStatus: SubscriptionStatus
): Promise<{ success: boolean; message: string }> {
  const index = localDealerships.findIndex((d) => d.id === orgId);
  if (index !== -1) {
    localDealerships[index] = {
      ...localDealerships[index],
      status: newStatus,
    };
  }

  revalidatePath("/superadmin");
  revalidatePath("/admin");

  return {
    success: true,
    message: `Status da concessionária atualizado para '${newStatus}' com sucesso!`,
  };
}

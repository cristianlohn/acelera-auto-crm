"use server";

/**
 * @file daily-digest-actions.ts
 * @description Server Action para envio de teste manual do Resumo Diário (Daily Digest) sob demanda.
 */

import { resolveUserTenantContext } from "@/lib/auth/tenant";
import {
  compileDailyDigestMetrics,
  sendDailyDigestEmail,
} from "@/lib/services/email/daily-digest-service";

export interface SendTestDailyDigestResult {
  success: boolean;
  recipientEmail?: string;
  simulated?: boolean;
  error?: string;
}

/**
 * Dispara o Resumo Diário de teste imediatamente para o e-mail do usuário autenticado.
 */
export async function sendTestDailyDigestAction(): Promise<SendTestDailyDigestResult> {
  try {
    const tenantContext = await resolveUserTenantContext();

    const recipientEmail =
      tenantContext.profile?.email ||
      tenantContext.userEmail ||
      (tenantContext.isDemo ? "gestor@autoprime.com.br" : null);

    if (!recipientEmail) {
      return {
        success: false,
        error: "Nenhum e-mail de destinatário associado ao perfil atual.",
      };
    }

    const recipientName =
      tenantContext.profile?.full_name ||
      (tenantContext.isDemo ? "Roberto Silva" : "Gestor");

    const storeName =
      tenantContext.organization?.name ||
      (tenantContext.isDemo
        ? "Acelera Auto Demonstração"
        : "Minha Concessionária");

    const orgId = tenantContext.organizationId || "demo-org";

    const metrics = await compileDailyDigestMetrics(orgId, {
      isDemo: tenantContext.isDemo,
    });

    const emailResult = await sendDailyDigestEmail({
      to: recipientEmail,
      recipientName,
      storeName,
      metrics,
    });

    return {
      success: emailResult.success,
      recipientEmail,
      simulated: emailResult.simulated ?? false,
      error: emailResult.error,
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Erro ao disparar relatório de teste.";
    console.error("[sendTestDailyDigestAction Exception]:", msg);
    return {
      success: false,
      error: msg,
    };
  }
}

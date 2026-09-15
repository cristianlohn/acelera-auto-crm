/**
 * @file route.ts
 * @description Endpoint do Vercel Cron para envio matinal do Resumo Diário (Daily Digest).
 *
 * Protegido por CRON_SECRET via cabeçalho Authorization: Bearer <CRON_SECRET>
 * ou sessão de usuário autenticado para testes manuais.
 */

import { NextRequest, NextResponse } from "next/server";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserTenantContext } from "@/lib/auth/tenant";
import {
  compileDailyDigestMetrics,
  sendDailyDigestEmail,
} from "@/lib/services/email/daily-digest-service";

export async function GET(req: NextRequest) {
  try {
    const authHeader =
      req.headers.get("authorization") || req.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    const isCronSecretValid = Boolean(
      cronSecret && authHeader === `Bearer ${cronSecret}`
    );

    let isSessionValid = false;
    let sessionTenant: Awaited<ReturnType<typeof resolveUserTenantContext>> | null = null;

    if (!isCronSecretValid) {
      try {
        sessionTenant = await resolveUserTenantContext();
        if (sessionTenant.isDemo || sessionTenant.userId) {
          isSessionValid = true;
        }
      } catch {
        // Sem sessão ativa
      }
    }

    if (!isCronSecretValid && !isSessionValid) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message:
            "Acesso negado. Forneça o header Authorization com o Bearer CRON_SECRET ou efetue login como gestor.",
        },
        { status: 401 }
      );
    }

    // Se a chamada veio de uma sessão interativa (ex: botão de teste chamando a rota de cron)
    if (!isCronSecretValid && sessionTenant && isSessionValid) {
      const orgId = sessionTenant.organizationId || "demo-org";
      const storeName =
        sessionTenant.organization?.name || "Acelera Auto Demonstração";
      const recipientName =
        sessionTenant.profile?.full_name || "Gestor Comercial";
      const recipientEmail =
        sessionTenant.profile?.email ||
        sessionTenant.userEmail ||
        "gestor@aceleraautocrm.com.br";

      const metrics = await compileDailyDigestMetrics(orgId, {
        isDemo: sessionTenant.isDemo,
      });

      const emailResult = await sendDailyDigestEmail({
        to: recipientEmail,
        recipientName,
        storeName,
        metrics,
      });

      return NextResponse.json({
        success: emailResult.success,
        mode: "session_test",
        organization: storeName,
        recipient: recipientEmail,
        simulated: emailResult.simulated ?? false,
        error: emailResult.error,
      });
    }

    // Execução Oficial do Cron (Vercel Cron / CRON_SECRET)
    if (!isSupabaseServerConfigured()) {
      return NextResponse.json({
        success: true,
        mode: "simulated_cron",
        message: "Supabase não configurado. Cron executado em modo simulado.",
        processedCount: 0,
      });
    }

    const adminClient = createAdminClient();

    // 1. Busca todas as organizações cadastradas
    const { data: orgs, error: orgsError } = await adminClient
      .from("organizations")
      .select("id, name");

    if (orgsError) {
      console.error("[Cron DailyDigest] Erro ao listar organizações:", orgsError);
      return NextResponse.json(
        { error: "Database error", message: orgsError.message },
        { status: 500 }
      );
    }

    const results: Array<{
      organizationId: string;
      storeName: string;
      recipient: string;
      status: "sent" | "simulated" | "failed" | "no_recipients";
      error?: string;
    }> = [];

    for (const org of orgs || []) {
      // 2. Localiza gestores e administradores com e-mail cadastrado
      const { data: managers } = await adminClient
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("organization_id", org.id)
        .in("role", ["admin", "gerente"]);

      const validManagers = (managers || []).filter(
        (m): m is typeof m & { email: string } => Boolean(m.email && m.email.includes("@"))
      );

      if (validManagers.length === 0) {
        results.push({
          organizationId: org.id,
          storeName: org.name,
          recipient: "Nenhum gestor com e-mail",
          status: "no_recipients",
        });
        continue;
      }

      // 3. Compila métricas consolidadas das últimas 24h para a concessionária
      const metrics = await compileDailyDigestMetrics(org.id);

      for (const manager of validManagers) {
        const sendRes = await sendDailyDigestEmail({
          to: manager.email,
          recipientName: manager.full_name || "Gestor",
          storeName: org.name,
          metrics,
        });

        results.push({
          organizationId: org.id,
          storeName: org.name,
          recipient: manager.email,
          status: sendRes.success
            ? sendRes.simulated
              ? "simulated"
              : "sent"
            : "failed",
          error: sendRes.error,
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      processedCount: results.length,
      results,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[Cron DailyDigest Exception]:", msg);
    return NextResponse.json(
      { error: "Internal Server Error", message: msg },
      { status: 500 }
    );
  }
}

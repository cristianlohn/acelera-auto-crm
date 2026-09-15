/**
 * @file daily-digest-service.ts
 * @description Serviço para compilação de métricas matinais de 24h e envio de e-mails transacionais (Daily Digest) via Resend.
 */

import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const DEFAULT_EMAIL_FROM = "Acelera Auto CRM <contato@aceleraautocrm.com.br>";

export interface DailyDigestMetrics {
  newLeadsCount: number;
  stalledLeadsCount: number;
  wonDealsCount: number;
  slaComplianceRate: number;
}

export interface SendDailyDigestParams {
  to: string;
  recipientName: string;
  storeName: string;
  metrics: DailyDigestMetrics;
  dateStr?: string;
  crmUrl?: string;
}

export interface SendDailyDigestResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

/**
 * Coleta métricas analíticas das últimas 24 horas para o Daily Digest da organização.
 */
export async function compileDailyDigestMetrics(
  organizationId: string,
  options?: { isDemo?: boolean }
): Promise<DailyDigestMetrics> {
  if (options?.isDemo || !isSupabaseServerConfigured()) {
    return {
      newLeadsCount: 8,
      stalledLeadsCount: 2,
      wonDealsCount: 3,
      slaComplianceRate: 88,
    };
  }

  try {
    const adminClient = createAdminClient();
    const now = new Date();
    const last24hDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Busca leads relevantes da organização
    const { data: leads, error } = await adminClient
      .from("leads")
      .select("id, status, created_at, updated_at, sla_deadline")
      .eq("organization_id", organizationId);

    if (error || !leads || leads.length === 0) {
      return {
        newLeadsCount: 0,
        stalledLeadsCount: 0,
        wonDealsCount: 0,
        slaComplianceRate: 100,
      };
    }

    let newLeadsCount = 0;
    let stalledLeadsCount = 0;
    let wonDealsCount = 0;
    let leadsWithSlaChecked = 0;
    let compliantLeads = 0;

    const nowTime = now.getTime();
    const last24hTime = last24hDate.getTime();

    for (const lead of leads) {
      const createdAtTime = new Date(lead.created_at).getTime();
      const updatedAtTime = new Date(lead.updated_at).getTime();
      const isCreatedLast24h = createdAtTime >= last24hTime;

      if (isCreatedLast24h) {
        newLeadsCount++;
      }

      // Vendas fechadas/ganhas nas últimas 24h
      if (lead.status === "fechado" && updatedAtTime >= last24hTime) {
        wonDealsCount++;
      }

      // Leads parados sem contato (ex: em 'novo' com mais de 15 min)
      if (lead.status === "novo") {
        const waitingMinutes = (nowTime - createdAtTime) / 60000;
        if (waitingMinutes > 15) {
          stalledLeadsCount++;
        }
      }

      // Cumprimento de SLA nas últimas 24h
      if (isCreatedLast24h) {
        leadsWithSlaChecked++;
        if (lead.sla_deadline) {
          const deadlineTime = new Date(lead.sla_deadline).getTime();
          // Se deadline ainda não venceu ou lead já foi atendido (não está em 'novo')
          if (lead.status !== "novo" || deadlineTime > nowTime) {
            compliantLeads++;
          }
        } else {
          // Sem deadline específico: se não estiver parado > 15 min em 'novo'
          if (lead.status !== "novo" || (nowTime - createdAtTime) / 60000 <= 15) {
            compliantLeads++;
          }
        }
      }
    }

    const slaComplianceRate =
      leadsWithSlaChecked > 0
        ? Math.min(100, Math.max(0, Math.round((compliantLeads / leadsWithSlaChecked) * 100)))
        : 100;

    return {
      newLeadsCount,
      stalledLeadsCount,
      wonDealsCount,
      slaComplianceRate,
    };
  } catch (err) {
    console.error("[DailyDigest] Erro ao compilar métricas:", err);
    return {
      newLeadsCount: 0,
      stalledLeadsCount: 0,
      wonDealsCount: 0,
      slaComplianceRate: 100,
    };
  }
}

/**
 * Gera o template HTML responsivo e limpo para o Resumo Diário matinal do Acelera Auto CRM.
 */
export function generateDailyDigestHtml({
  recipientName,
  storeName,
  metrics,
  dateStr,
  crmUrl = "https://aceleraautocrm.com.br/dashboard",
}: {
  recipientName: string;
  storeName: string;
  metrics: DailyDigestMetrics;
  dateStr: string;
  crmUrl?: string;
}): string {
  const slaColor =
    metrics.slaComplianceRate >= 85
      ? "#10b981"
      : metrics.slaComplianceRate >= 70
      ? "#f59e0b"
      : "#ef4444";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resumo Diário — ${storeName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 32px 16px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.45);">
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; padding: 10px 18px; border-radius: 12px; background: linear-gradient(135deg, #ea580c, #dc2626); color: #ffffff; font-weight: 800; font-size: 15px; letter-spacing: 0.5px;">
                ACELERA AUTO CRM
              </div>
            </td>
          </tr>

          <!-- Título e Saudação -->
          <tr>
            <td>
              <h1 style="font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 8px 0; text-align: center;">
                ☕ Bom dia, ${recipientName}!
              </h1>
              <p style="font-size: 14px; line-height: 22px; color: #94a3b8; margin: 0 0 24px 0; text-align: center;">
                Aqui está o resumo matinal de desempenho e pendências da <strong>${storeName}</strong> nas últimas 24 horas (${dateStr}).
              </p>
            </td>
          </tr>

          <!-- Grid de Métricas (2 colunas em tabela) -->
          <tr>
            <td style="padding-bottom: 24px;">
              <table width="100%" border="0" cellspacing="8" cellpadding="0">
                <tr>
                  <td width="50%" style="background-color: #0f172a; border-radius: 12px; border: 1px solid #334155; padding: 18px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.5px; margin-bottom: 6px;">
                      📥 Novos Leads (24h)
                    </div>
                    <div style="font-size: 28px; font-weight: 800; color: #ffffff;">
                      ${metrics.newLeadsCount}
                    </div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                      Distribuídos na Roleta
                    </div>
                  </td>
                  <td width="50%" style="background-color: #0f172a; border-radius: 12px; border: 1px solid #334155; padding: 18px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #f59e0b; letter-spacing: 0.5px; margin-bottom: 6px;">
                      ⏳ Leads Sem Contato
                    </div>
                    <div style="font-size: 28px; font-weight: 800; color: ${metrics.stalledLeadsCount > 0 ? "#fbbf24" : "#ffffff"};">
                      ${metrics.stalledLeadsCount}
                    </div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                      Pendentes de primeiro contato
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="background-color: #0f172a; border-radius: 12px; border: 1px solid #334155; padding: 18px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #34d399; letter-spacing: 0.5px; margin-bottom: 6px;">
                      🏆 Vendas Ganhas
                    </div>
                    <div style="font-size: 28px; font-weight: 800; color: #34d399;">
                      ${metrics.wonDealsCount}
                    </div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                      Negócios concluídos
                    </div>
                  </td>
                  <td width="50%" style="background-color: #0f172a; border-radius: 12px; border: 1px solid #334155; padding: 18px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #a78bfa; letter-spacing: 0.5px; margin-bottom: 6px;">
                      ⚡ Cumprimento SLA
                    </div>
                    <div style="font-size: 28px; font-weight: 800; color: ${slaColor};">
                      ${metrics.slaComplianceRate}%
                    </div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                      Meta: &ge; 85% em 15 min
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Ação Direta CTA -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <a href="${crmUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ef4444); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.4);">
                Acessar Cockpit do Acelera Auto &rarr;
              </a>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="padding-top: 24px; border-top: 1px solid #334155; text-align: center;">
              <p style="font-size: 11px; color: #64748b; margin: 0 0 6px 0;">
                Enviado automaticamente pelo Acelera Auto CRM para gestores da concessionária <strong>${storeName}</strong>.
              </p>
              <p style="font-size: 11px; color: #475569; margin: 0;">
                Você pode gerenciar as notificações matinais nas Configurações &gt; Preferências & Notificações.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Envia o Resumo Diário por e-mail utilizando a API REST do Resend.
 * Em ambientes sem RESEND_API_KEY, opera em modo de simulação com log estruturado.
 */
export async function sendDailyDigestEmail({
  to,
  recipientName,
  storeName,
  metrics,
  dateStr = new Date().toLocaleDateString("pt-BR"),
  crmUrl,
}: SendDailyDigestParams): Promise<SendDailyDigestResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM;

  const subject = `📊 Resumo Diário — ${storeName} (${dateStr})`;
  const html = generateDailyDigestHtml({
    recipientName,
    storeName,
    metrics,
    dateStr,
    crmUrl,
  });

  // Modo simulação gracioso quando chave não estiver configurada
  if (!apiKey) {
    console.info(`[Resend Email - Simulação] Daily Digest enviado para ${to}:`);
    console.info(`- Remetente: ${fromEmail}`);
    console.info(`- Loja: ${storeName} | Destinatário: ${recipientName}`);
    console.info(
      `- Métricas: Leads: ${metrics.newLeadsCount}, Parados: ${metrics.stalledLeadsCount}, Vendas: ${metrics.wonDealsCount}, SLA: ${metrics.slaComplianceRate}%`
    );
    return {
      success: true,
      simulated: true,
      messageId: `sim_digest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => "Erro desconhecido");
      console.error(`[Resend Daily Digest Error] Status ${response.status}: ${errText}`);
      return {
        success: false,
        error: `Falha no envio Resend (HTTP ${response.status}): ${errText}`,
      };
    }

    const data = (await response.json().catch(() => ({}))) as { id?: string };
    return {
      success: true,
      messageId: data.id,
    };
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    const msg = isAbort
      ? "Timeout na conexão com a API do Resend (6s)"
      : err instanceof Error
      ? err.message
      : "Erro ao enviar Resumo Diário por e-mail";
    console.error("[Resend Daily Digest Exception]:", msg);
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * @file resend-service.ts
 * @description Serviço modular e tolerante a falhas para envio de e-mails transacionais via Resend API (HTTP REST).
 */

export interface SendInviteEmailParams {
  to: string;
  recipientName: string;
  storeName: string;
  acceptUrl: string;
  isExistingUser?: boolean;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

/**
 * Envia e-mail de convite para colaborador/vendedor utilizando a API do Resend.
 * Em ambientes locais ou sem RESEND_API_KEY configurada, opera em modo de simulação com log estruturado.
 */
export async function sendInviteEmailViaResend({
  to,
  recipientName,
  storeName,
  acceptUrl,
  isExistingUser = false,
}: SendInviteEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Acelera Auto CRM <convites@aceleraautocrm.com.br>";

  const subject = isExistingUser
    ? `Você foi convidado para a equipe da ${storeName} no Acelera Auto CRM`
    : `Bem-vindo ao Acelera Auto CRM — Convite da ${storeName}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 32px 16px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="100%" max-width="560" style="max-width: 560px; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; padding: 10px 16px; border-radius: 12px; background: linear-gradient(135deg, #ea580c, #dc2626); color: #ffffff; font-weight: 800; font-size: 16px; letter-spacing: 0.5px;">
                ACELERA AUTO CRM
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <h1 style="font-size: 20px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 12px; text-align: center;">
                Olá, ${recipientName}!
              </h1>
              <p style="font-size: 14px; line-height: 22px; color: #cbd5e1; margin-bottom: 24px; text-align: center;">
                A concessionária <strong>${storeName}</strong> enviou um convite para você ingressar na equipe comercial no Acelera Auto CRM.
              </p>
              
              <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 28px; border: 1px solid #334155; text-align: center;">
                <p style="font-size: 13px; color: #94a3b8; margin: 0 0 16px 0;">
                  ${isExistingUser 
                    ? "Como você já possui uma conta no Acelera Auto, basta confirmar para vincular seu perfil à nova loja:" 
                    : "Clique no botão abaixo para ativar seu acesso e começar a receber leads:"}
                </p>
                <a href="${acceptUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ef4444); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.4);">
                  Aceitar Convite e Acessar Loja
                </a>
              </div>

              <p style="font-size: 12px; color: #64748b; line-height: 18px; text-align: center; margin: 0;">
                Se o botão não funcionar, copie e cole o link abaixo em seu navegador:<br>
                <a href="${acceptUrl}" style="color: #f97316; word-break: break-all;">${acceptUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 32px; border-top: 1px solid #334155; margin-top: 24px; text-align: center;">
              <p style="font-size: 11px; color: #64748b; margin: 0;">
                Este convite expira em 7 dias. Se você não esperava por este e-mail, ignore-o com segurança.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  // Fallback para ambiente sem chave Resend
  if (!apiKey) {
    console.info(`[Resend Email - Simulação] Convite disparado para ${to}:`);
    console.info(`- Destinatário: ${recipientName}`);
    console.info(`- Loja: ${storeName}`);
    console.info(`- Link de Aceite: ${acceptUrl}`);
    return {
      success: true,
      simulated: true,
      messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
        html: htmlContent,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      console.error(`[Resend Error] Status ${response.status}: ${errText}`);
      return {
        success: false,
        error: `Falha no envio Resend (HTTP ${response.status})`,
      };
    }

    const data = (await response.json().catch(() => ({}))) as { id?: string };
    return {
      success: true,
      messageId: data.id,
    };
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    const msg = isAbort ? "Timeout na conexão com o Resend API" : err instanceof Error ? err.message : "Erro no envio de e-mail";
    console.error("[Resend Exception]:", msg);
    return {
      success: false,
      error: msg,
    };
  }
}

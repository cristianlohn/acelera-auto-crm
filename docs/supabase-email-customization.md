# Guia de Personalização de E-mail de Redefinição de Senha (Supabase Auth)

Este guia orienta a configuração do template oficial de e-mail de recuperação de senha do **Acelera Auto CRM** no Dashboard do Supabase.

---

## 1. Localização no Dashboard do Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard/project/vnxsmsgykirbgrhjpwhc).
2. No menu lateral esquerdo, clique no ícone de cadeado: **Authentication** -> **Emails**.
3. Localize o card **Reset Password** e clique nele para abrir o editor.

---

## 2. Configuração dos Campos

### Campo `Subject` (Assunto do E-mail):
```text
Acelera Auto CRM: Redefinir sua Senha
```

---

## 3. Código HTML (Copiar e Colar no Campo "Body")

### Opção 1: Tema Dark Signature (Identidade Visual Oficial do Acelera Auto CRM)
> Arquivo fonte: [`supabase/templates/reset-password.html`](file:///c:/repo/Acelera%20Auto%20CRM/acelera-auto-crm/supabase/templates/reset-password.html)

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acelera Auto CRM — Redefinição de Senha</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; margin: auto !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #09090b; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 15px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 580px; background-color: #121218; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #f97316, #ea580c, #dc2626);"></td>
          </tr>
          <tr>
            <td align="center" style="padding: 36px 30px 24px 30px; border-bottom: 1px solid #1f1f26;">
              <span style="display: inline-block; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                <span style="color: #f97316;">Acelera</span> Auto <span style="font-size: 13px; font-weight: 700; color: #ea580c; background-color: rgba(249, 115, 22, 0.15); border: 1px solid rgba(249, 115, 22, 0.3); padding: 2px 8px; border-radius: 9999px; vertical-align: middle; margin-left: 6px;">CRM</span>
              </span>
              <div style="padding-top: 6px;">
                <span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Segurança & Recuperação de Acesso</span>
              </div>
            </td>
          </tr>
          <tr>
            <td class="mobile-padding" style="padding: 32px 36px 20px 36px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                Recuperação de Senha
              </h2>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                Olá,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                Recebemos uma solicitação para redefinir a senha da sua conta no <strong style="color: #ffffff;">Acelera Auto CRM</strong>. Para cadastrar uma nova senha e restabelecer o acesso à sua concessionária, clique no botão abaixo:
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" class="mobile-padding" style="padding: 0 36px 28px 36px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; width: 100%; max-width: 320px; background-color: #ea580c; background-image: linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 24px; border-radius: 10px; text-align: center; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.4); box-sizing: border-box;">
                      Redefinir Minha Senha &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-padding" style="padding: 0 36px 28px 36px;">
              <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 14px 16px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #71717a; line-height: 1.5;">
                  Caso o botão acima não funcione, copie e cole o link seguro diretamente no seu navegador:
                </p>
                <p style="margin: 0; font-size: 12px; line-height: 1.4; word-break: break-all;">
                  <a href="{{ .ConfirmationURL }}" target="_blank" style="color: #fb923c; text-decoration: underline;">
                    {{ .ConfirmationURL }}
                  </a>
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td class="mobile-padding" style="padding: 0 36px 32px 36px;">
              <p style="margin: 0 0 8px 0; font-size: 12px; line-height: 1.5; color: #71717a;">
                &#9888; <strong>Importante:</strong> Este link é de uso único e expira automaticamente em <strong style="color: #d4d4d8;">1 hora</strong> por motivos de segurança.
              </p>
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #71717a;">
                Se você não fez essa solicitação, nenhuma ação é necessária. Sua senha continuará segura e inalterada.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 24px 30px; background-color: #0c0c10; border-top: 1px solid #1f1f26;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #71717a; font-weight: 500;">
                Acelera Auto CRM &bull; Gestão de Leads, Estoque e Vendas
              </p>
              <p style="margin: 0; font-size: 11px; color: #52525b;">
                &copy; 2026 Acelera Auto CRM. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

### Opção 2: Tema Clean White (Card Branco com Acentos Laranja/Verde)

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acelera Auto CRM — Redefinir sua Senha</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f9fc; color: #1a1f36;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f6f9fc; padding: 30px 0;">
    <tr>
      <td align="center">
        <table width="100%" max-width="580" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e1e8ed; overflow: hidden;">
          <tr>
            <td align="center" style="padding: 32px 30px 24px; border-bottom: 1px solid #f0f3f6;">
              <h1 style="margin: 0; color: #ea580c; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Acelera Auto CRM</h1>
              <p style="margin: 4px 0 0; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Recuperação de Acesso</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 30px 20px;">
              <p style="margin: 0 0 16px; color: #1a1f36; font-size: 15px; font-weight: 600;">Olá,</p>
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 14px; line-height: 1.6;">Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Acelera Auto CRM</strong>. Clique no botão abaixo para escolher sua nova senha:</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 10px 30px 28px;">
              <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #ea580c; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 700; text-align: center; box-shadow: 0 4px 10px rgba(234, 88, 12, 0.25);">Redefinir Minha Senha</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 30px 28px;">
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px;">
                <p style="margin: 0 0 6px; color: #64748b; font-size: 12px;">Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
                <p style="margin: 0; color: #ea580c; font-size: 12px; word-break: break-all;"><code>{{ .ConfirmationURL }}</code></p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 30px 32px;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; line-height: 1.5;">Se você não solicitou a redefinição, desconsidere este e-mail. Este link expira em 1 hora.</p>
              <p style="margin: 16px 0 0; color: #9ca3af; font-size: 11px; text-align: center;">&copy; 2026 Acelera Auto CRM. Todos os direitos reservados.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 4. Redirect URLs & Site URL (Configuração Obrigatória de Domínio)

Para garantir que o link `{{ .ConfirmationURL }}` redirecione o usuário de volta para o ambiente correto (`/auth/callback` -> `/reset-password`):

1. No Supabase Dashboard, acesse **Authentication** -> **URL Configuration**.
2. **Site URL**: `https://aceleraautocrm.com.br` (ou `http://localhost:3000` em desenvolvimento local).
3. **Redirect URLs** (Adicione as seguintes entradas na lista de permissões):
   - `http://localhost:3000/auth/callback*`
   - `http://localhost:3001/auth/callback*`
   - `https://aceleraautocrm.com.br/auth/callback*`
   - `https://*.aceleraautocrm.com.br/auth/callback*`

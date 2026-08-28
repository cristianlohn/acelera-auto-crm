/**
 * @file route.ts
 * @description Endpoint de Callback de Autenticação PKCE e Token Hash do Supabase (GET /auth/callback).
 *
 * Funcionalidades:
 * - Troca o código temporário de autorização (`code`) por uma sessão ativa com cookies.
 * - Valida tokens OTP / Magic Link / Convites (`token_hash` + `type`) via verifyOtp.
 * - Suporta redirecionamento dinâmico via parâmetro `next` ou fallback para `/leads`.
 * - Injeta o parâmetro `verified=true` para feedback visual imediato no Dashboard ou Login.
 * - Suporte a links de primeiro acesso (/auth/update-password) com hash fragments no cliente.
 * - Tratamento de falhas de autenticação com redirecionamento amigável para `/login?error=auth_callback_error`.
 */

import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash") || searchParams.get("token");
  const type = (searchParams.get("type") || "invite") as EmailOtpType | null;
  const next = searchParams.get("next") || "/leads";
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Se o Supabase retornar erro direto nos searchParams
  if (errorParam || errorDescription) {
    console.error("[Auth Callback Error Param]", errorParam, errorDescription);
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
  }

  const targetUrl = next.startsWith("/") ? next : `/${next}`;
  const separator = targetUrl.includes("?") ? "&" : "?";
  const successRedirect = `${origin}${targetUrl}${separator}verified=true`;

  if (isSupabaseServerConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();

      // 1. Fluxo PKCE (Authorization Code)
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("[Auth Callback Error]", error.message);
          return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
        }
        if (data.session || data.user) {
          return NextResponse.redirect(successRedirect);
        }
      }

      // 2. Fluxo OTP / Token Hash (Email Invites, Magic Links, Recovery)
      if (token_hash && type) {
        const { data, error } = await supabase.auth.verifyOtp({
          type,
          token_hash,
        });

        if (error) {
          console.error("[Auth Callback verifyOtp Error]", error.message);
          return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
        }
        if (data.session || data.user) {
          return NextResponse.redirect(successRedirect);
        }
      }
    } catch (err) {
      console.error("[Auth Callback Fatal Error]", err);
      return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
    }
  }

  // Em ambiente de teste / fallback
  if (code || token_hash) {
    return NextResponse.redirect(successRedirect);
  }

  // Se o destino for para definição de senha (/auth/update-password), redireciona permitindo processar hash fragment no client
  if (next && (next.includes("/auth/update-password") || next.includes("update-password"))) {
    return NextResponse.redirect(`${origin}${targetUrl}`);
  }

  // Código ou token ausente
  return NextResponse.redirect(`${origin}/login?error=missing_code`);
}

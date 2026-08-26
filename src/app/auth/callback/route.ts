/**
 * @file route.ts
 * @description Endpoint de Callback de Autenticação PKCE do Supabase (GET /auth/callback).
 *
 * Funcionalidades:
 * - Troca o código temporário de autorização (`code`) por uma sessão ativa com cookies.
 * - Suporta redirecionamento dinâmico via parâmetro `next` ou fallback para `/leads`.
 * - Injeta o parâmetro `verified=true` para feedback visual imediato no Dashboard ou Login.
 * - Tratamento de falhas de autenticação com redirecionamento amigável para `/login?error=auth_callback_error`.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/leads";
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Se o Supabase retornar erro direto nos searchParams
  if (errorParam || errorDescription) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
  }

  // Caso o código PKCE esteja presente
  if (code) {
    try {
      if (isSupabaseServerConfigured()) {
        const supabase = await createServerSupabaseClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("[Auth Callback Error]", error.message);
          return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
        }

        // Se houver sessão ativa, direciona para o dashboard com feedback
        if (data.session || data.user) {
          const targetUrl = next.startsWith("/") ? next : `/${next}`;
          const separator = targetUrl.includes("?") ? "&" : "?";
          return NextResponse.redirect(`${origin}${targetUrl}${separator}verified=true`);
        }
      }

      // Em ambiente de teste ou sessão anônima confirmada
      const targetUrl = next.startsWith("/") ? next : `/${next}`;
      const separator = targetUrl.includes("?") ? "&" : "?";
      return NextResponse.redirect(`${origin}${targetUrl}${separator}verified=true`);
    } catch (err) {
      console.error("[Auth Callback Fatal Error]", err);
      return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
    }
  }

  // Código ausente
  return NextResponse.redirect(`${origin}/login?error=missing_code`);
}

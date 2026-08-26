/**
 * @file middleware.ts
 * @description Middleware do Next.js para gerenciamento de sessão Supabase e proteção de rotas.
 *
 * Funcionalidades:
 * - Atualização de cookies de sessão via @supabase/ssr.
 * - Proteção de rotas autenticadas do dashboard (/leads, /vehicles, /reports, /clients, /settings).
 * - Suporte nativo ao Modo Demonstração (Tenant Sandbox) via cookie 'acelera_demo_mode'.
 * - Acesso livre às rotas públicas (/, /login, assets estáticos).
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED_PREFIXES = [
  "/leads",
  "/vehicles",
  "/reports",
  "/clients",
  "/clientes",
  "/settings",
  "/configuracoes",
  "/superadmin",
  "/admin",
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isConfigured = Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      supabaseUrl !== "https://placeholder.supabase.co" &&
      !supabaseUrl.includes("placeholder")
  );

  // Modo Sandbox Demo ativo por cookie ou ambiente de desenvolvimento/teste sem Supabase
  const isDemoMode =
    request.cookies.get("acelera_demo_mode")?.value === "true" ||
    request.cookies.get("sb-demo-auth")?.value === "true" ||
    !isConfigured;

  // Se o Supabase estiver configurado, sincroniza a sessão
  if (isConfigured) {
    const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Se estiver em rota protegida sem usuário logado e sem modo demo
    if (isProtectedRoute && !user && !isDemoMode) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectedFrom", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Se já estiver logado e tentar acessar /login, redireciona para o CRM
    if (pathname === "/login" && user) {
      return NextResponse.redirect(new URL("/leads", request.url));
    }
  } else {
    // Quando Supabase não configurado e tentando acessar /login com demo
    if (pathname === "/login" && isDemoMode && request.nextUrl.searchParams.get("force") !== "true") {
      // Permite renderizar a página de login normalmente para que o usuário possa interagir
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

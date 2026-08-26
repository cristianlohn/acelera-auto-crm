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
import { getOrganizationAccessStatus } from "@/lib/auth/subscription";
import type { Database } from "@/types/database.types";
import type { Organization } from "@/types/crm";

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
  "/billing",
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
  const isBillingRoute = pathname.startsWith("/billing") || pathname.startsWith("/assinatura");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isConfigured = Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      supabaseUrl !== "https://placeholder.supabase.co" &&
      !supabaseUrl.includes("placeholder")
  );

  // Verificação de expiração no modo demo / sandbox
  const demoExpiredCookie = request.cookies.get("acelera_demo_expired")?.value === "true";
  const demoSubscriptionStatus = request.cookies.get("acelera_subscription_status")?.value;

  if (
    isProtectedRoute &&
    !isBillingRoute &&
    (demoExpiredCookie || demoSubscriptionStatus === "expired" || demoSubscriptionStatus === "canceled")
  ) {
    const billingUrl = new URL("/billing", request.url);
    billingUrl.searchParams.set("expired", "true");
    return NextResponse.redirect(billingUrl);
  }

  // Modo Sandbox Demo ativo por cookie ou ambiente de desenvolvimento/teste sem Supabase
  const isDemoMode =
    request.cookies.get("acelera_demo_mode")?.value === "true" ||
    request.cookies.get("sb-demo-auth")?.value === "true" ||
    !isConfigured;

  // Se o Supabase estiver configurado, sincroniza a sessão
  if (isConfigured) {
    const supabase = createServerClient<Database>(supabaseUrl!, supabaseAnonKey!, {
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

    // Validação de assinatura em rotas autenticadas (exceto /billing)
    if (isProtectedRoute && user && !isBillingRoute) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, organization_id")
          .eq("id", user.id)
          .single();

        if (profile?.organization_id) {
          const { data: org } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", profile.organization_id)
            .single();

          const accessStatus = getOrganizationAccessStatus(
            org as unknown as Organization,
            profile.role
          );

          if (!accessStatus.hasAccess) {
            const billingUrl = new URL("/billing", request.url);
            billingUrl.searchParams.set("expired", "true");
            return NextResponse.redirect(billingUrl);
          }
        }
      } catch (err) {
        console.error("[Middleware Subscription Guard Error]", err);
      }
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

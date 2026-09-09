/**
 * @file route.ts
 * @description Route Handler para inicialização formal do Modo Demonstração e reset de bloqueios de faturamento.
 */

import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_DEMO_ORG_ID } from "@/lib/auth/constants";

export async function GET(request: NextRequest) {
  const redirectUrl = new URL("/dashboard/leads", request.url);
  const response = NextResponse.redirect(redirectUrl, 307);

  // 1. Inicializa formalmente o Modo Demonstração com o tenant padrão
  response.cookies.set("acelera_demo_mode", "true", {
    path: "/",
    maxAge: 86400,
    sameSite: "lax",
  });
  response.cookies.set("sb-demo-auth", "true", {
    path: "/",
    maxAge: 86400,
    sameSite: "lax",
  });
  response.cookies.set("acelera_demo_role", "admin", {
    path: "/",
    maxAge: 86400,
    sameSite: "lax",
  });
  response.cookies.set("acelera_demo_org", DEFAULT_DEMO_ORG_ID, {
    path: "/",
    maxAge: 86400,
    sameSite: "lax",
  });

  // 2. Limpa quaisquer cookies residuais de bloqueio de billing ou suspensão de conta
  response.cookies.delete("billing_status");
  response.cookies.delete("account_suspended");
  response.cookies.delete("acelera_demo_expired");
  response.cookies.delete("acelera_subscription_status");
  response.cookies.delete("sb-test-user");

  return response;
}

export async function POST(request: NextRequest) {
  return GET(request);
}

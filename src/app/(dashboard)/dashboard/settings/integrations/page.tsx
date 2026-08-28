/**
 * @file page.tsx  –  /dashboard/settings/integrations
 * @description Página Executiva de Gestão de Chaves de API e Integrações Externas.
 */

import React, { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import {
  Key,
  ChevronRight,
  Shield,
} from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getApiKeysAction } from "@/app/actions/api-key-actions";
import { ApiKeysClient } from "@/components/settings/api-keys/api-keys-client";
import { resolveUserTenantContext } from "@/lib/auth/tenant";
import { canManageIntegrationsAndBilling } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Integrações & Chaves de API | Acelera Auto CRM",
  description:
    "Gere e gerencie chaves de API com criptografia SHA-256 para integração com Meta Ads, Webmotors, OLX e portais automotivos.",
};

export default async function IntegrationsSettingsPage() {
  const tenantContext = await resolveUserTenantContext();
  let userRole: string = (tenantContext.profile?.role as string) || (tenantContext.isDemo ? "admin" : "seller");

  try {
    const cookieStore = await cookies();
    const demoRoleCookie = cookieStore.get("acelera_demo_role")?.value;
    if (tenantContext.isDemo && demoRoleCookie) {
      userRole = demoRoleCookie;
    }
  } catch {
    //
  }

  if (!canManageIntegrationsAndBilling(userRole)) {
    redirect("/dashboard");
  }

  const apiKeys = await getApiKeysAction();

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho e Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1.5">
            <Link
              href="/dashboard"
              className="hover:text-white transition-colors"
            >
              Cockpit
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link
              href="/settings"
              className="hover:text-white transition-colors"
            >
              Configurações
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-orange-500 font-semibold">Integrações & Chaves de API</span>
          </nav>

          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl flex items-center gap-2.5">
            <Key className="h-7 w-7 text-orange-500" />
            <span>Integrações & Chaves de API</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Gerencie credenciais de segurança para conectar fontes externas de leads ao motor de roleta comercial.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-zinc-900/90 border border-white/10 px-3.5 py-2">
          <Shield className="h-4 w-4 text-emerald-400" />
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">
              Segurança
            </div>
            <div className="text-xs font-bold text-emerald-400">
              SHA-256 Hashed
            </div>
          </div>
        </div>
      </div>

      {/* Container Cliente */}
      <Suspense
        fallback={
          <div className="flex h-96 items-center justify-center rounded-3xl border border-white/10 bg-zinc-950/40 text-sm text-zinc-400">
            Carregando chaves de API e documentação de integrações...
          </div>
        }
      >
        <ApiKeysClient initialApiKeys={apiKeys} />
      </Suspense>
    </div>
  );
}

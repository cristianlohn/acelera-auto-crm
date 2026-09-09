/**
 * @file page.tsx
 * @description Módulo de Configurações, Parâmetros do CRM, Perfil e Gestão de Equipe (SettingsPage - Server Component).
 *
 * Busca os dados de perfil, organização, membros da equipe e chaves de API no servidor
 * e hidrata o formulário interativo (SettingsForm) com 0ms de delay visual.
 */

import React from "react";
import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveUserTenantContext } from "@/lib/auth/tenant";
import { getTeamMembers } from "@/app/actions/team";
import { getApiKeysAction } from "@/app/actions/api-key-actions";
import { SettingsForm, type SettingsTab } from "@/components/settings/settings-form";
import type { TeamMember } from "@/lib/team-data";
import type { ApiKey } from "@/types/api-key";

export const metadata: Metadata = {
  title: "Configurações & Gestão de Equipe | Acelera Auto CRM",
  description:
    "Gerenciamento de perfil, dados cadastrais da concessionária, metas comerciais, SLA e equipe.",
};

export interface SettingsPageProps {
  searchParams?: Promise<{ tab?: string }> | { tab?: string };
}

export default async function SettingsPage(props: SettingsPageProps) {
  const tenantContext = await resolveUserTenantContext();
  const isDemo = tenantContext.isDemo;

  if (!isDemo && !tenantContext.userId) {
    redirect("/login");
  }

  const resolvedSearchParams = props.searchParams ? await props.searchParams : {};
  const rawTab = resolvedSearchParams.tab?.toLowerCase();
  let initialTab: SettingsTab = "perfil";
  if (
    rawTab === "integrations" ||
    rawTab === "integracoes" ||
    rawTab === "webhook" ||
    rawTab === "webhooks"
  ) {
    initialTab = "integracoes";
  } else if (rawTab === "loja" || rawTab === "store") {
    initialTab = "loja";
  } else if (rawTab === "sla") {
    initialTab = "sla";
  } else if (rawTab === "preferencias" || rawTab === "preferences") {
    initialTab = "preferencias";
  } else if (rawTab === "equipe" || rawTab === "team") {
    initialTab = "equipe";
  }

  let demoRole: "admin" | "gerente" | "vendedor" = "admin";
  let demoName = "Roberto Silva";
  let demoEmail = "roberto.silva@autoprime.com.br";
  const demoPhone = "(11) 98888-7777";

  try {
    const cookieStore = await cookies();
    const cookieRole = cookieStore.get("acelera_demo_role")?.value?.toLowerCase();
    if (cookieRole === "vendedor" || cookieRole === "seller") {
      demoRole = "vendedor";
      demoName = "Rafael Alves";
      demoEmail = "rafael.alves@autoprime.com.br";
    } else if (cookieRole === "gerente" || cookieRole === "manager") {
      demoRole = "gerente";
      demoName = "Juliana Costa";
      demoEmail = "juliana.costa@autoprime.com.br";
    } else if (cookieRole === "admin" || cookieRole === "owner") {
      demoRole = "admin";
      demoName = "Roberto Silva";
      demoEmail = "roberto.silva@autoprime.com.br";
    }
  } catch {}

  const profile = tenantContext.profile
    ? {
        fullName: tenantContext.profile.full_name || "",
        email: tenantContext.profile.email || "",
        phone: tenantContext.profile.phone || "",
        role: (tenantContext.profile.role as "admin" | "gerente" | "vendedor") || "vendedor",
      }
    : isDemo
    ? {
        fullName: demoName,
        email: demoEmail,
        phone: demoPhone,
        role: demoRole,
      }
    : null;

  const rawOrg = tenantContext.organization as Record<string, unknown> | null;
  const organization = rawOrg
    ? {
        legalName: (rawOrg.billing_name as string) || (rawOrg.name as string) || "",
        tradeName: (rawOrg.name as string) || "",
        cnpj: (rawOrg.document as string) || "",
        phone: (rawOrg.phone as string) || "",
        email: "",
        address: (rawOrg.address as string) || "",
        businessHours:
          (rawOrg.business_hours as string) ||
          "Seg a Sex: 08h às 18h | Sáb: 09h às 13h",
      }
    : isDemo
    ? {
        legalName: "Acelera Auto Comércio de Veículos LTDA",
        tradeName: "Acelera Auto Demonstração",
        cnpj: "12.345.678/0001-90",
        phone: "(11) 98765-4321",
        email: "contato@aceleraauto.com.br",
        address: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
        businessHours: "Seg a Sex: 08h às 18h | Sáb: 09h às 13h",
      }
    : null;

  let members: TeamMember[] = [];
  try {
    members = await getTeamMembers();
  } catch {}

  let apiKeys: ApiKey[] = [];
  try {
    if (!isDemo && tenantContext.organizationId) {
      apiKeys = await getApiKeysAction();
    }
  } catch {}

  return (
    <div className="space-y-6">
      <SettingsForm
        initialProfile={profile}
        initialOrganization={organization}
        initialTeamMembers={members}
        initialApiKeys={apiKeys}
        initialTab={initialTab}
      />
    </div>
  );
}

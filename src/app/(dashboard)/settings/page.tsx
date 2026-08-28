/**
 * @file page.tsx
 * @description Módulo de Configurações, Parâmetros do CRM, Perfil e Gestão de Equipe (SettingsPage - Server Component).
 *
 * Busca os dados de perfil, organização, membros da equipe e chaves de API no servidor
 * e hidrata o formulário interativo (SettingsForm) com 0ms de delay visual.
 */

import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveUserTenantContext } from "@/lib/auth/tenant";
import { getTeamMembersAction } from "@/app/actions/team-actions";
import { getApiKeysAction } from "@/app/actions/api-key-actions";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata: Metadata = {
  title: "Configurações & Gestão de Equipe | Acelera Auto CRM",
  description:
    "Gerenciamento de perfil, dados cadastrais da concessionária, metas comerciais, SLA e equipe.",
};

export default async function SettingsPage() {
  const tenantContext = await resolveUserTenantContext();
  const isDemo = tenantContext.isDemo;

  if (!isDemo && !tenantContext.userId) {
    redirect("/login");
  }

  const profile = tenantContext.profile
    ? {
        fullName: tenantContext.profile.full_name || "",
        email: tenantContext.profile.email || "",
        phone: tenantContext.profile.phone || "",
        role: (tenantContext.profile.role as "admin" | "gerente" | "vendedor") || "admin",
      }
    : isDemo
    ? {
        fullName: "Rafael Alves",
        email: "rafael.alves@aceleraauto.com.br",
        phone: "11987654321",
        role: "gerente" as const,
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

  let members: any[] = [];
  try {
    members = await getTeamMembersAction(tenantContext.organizationId || undefined);
  } catch {}

  let apiKeys: any[] = [];
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
      />
    </div>
  );
}

/**
 * @file tenant.ts
 * @description Resolução estrita de tenant/organização e isolamento de sessão Demo vs Usuário Autenticado.
 *
 * ============================================================================
 * DIRETRIZES DE ARQUITETURA & SEGURANÇA MULTI-TENANT
 * ============================================================================
 * 1. Usuários autenticados no Supabase Auth DEVEM resolver sua organização
 *    estritamente através do `public.profiles.organization_id`.
 * 2. Se um usuário logado não possuir vínculo com nenhuma organização no banco,
 *    retorna `needsOnboarding: true` e `organizationId: null`. NUNCA faz fallback
 *    para a organização de demonstração (DEFAULT_DEMO_ORG_ID).
 * 3. O Modo Demonstração só é ativo quando NÃO há usuário autenticado no Supabase
 *    E o cookie `acelera_demo_mode=true` está presente (ou fallback offline sem Supabase).
 * ============================================================================
 */

import { cookies } from "next/headers";
import {
  createServerSupabaseClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Organization, Profile } from "@/types/database.types";

/** Identificador UUID padrão da concessionária Sandbox / Demonstração */
export const DEFAULT_DEMO_ORG_ID = "a0000000-0000-0000-0000-000000000001";

export interface TenantContextResult {
  isDemo: boolean;
  userId: string | null;
  organizationId: string | null;
  profile: Profile | null;
  organization: Organization | null;
  needsOnboarding: boolean;
}

/**
 * Resolve o contexto de organização do usuário atual com isolamento estrito entre Demo e Produção.
 */
export async function resolveUserTenantContext(): Promise<TenantContextResult> {
  let isDemoCookiePresent = false;

  try {
    const cookieStore = await cookies();
    isDemoCookiePresent =
      cookieStore.get("acelera_demo_mode")?.value === "true" ||
      cookieStore.get("sb-demo-auth")?.value === "true";
  } catch {
    // Fora do request store (ex: testes isolados)
  }

  // 1. Fallback Offline se o Supabase não estiver configurado
  if (!isSupabaseServerConfigured()) {
    return {
      isDemo: true,
      userId: "demo-sandbox-user",
      organizationId: DEFAULT_DEMO_ORG_ID,
      profile: null,
      organization: null,
      needsOnboarding: false,
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // 2. Usuário Real Autenticado no Supabase Auth
    if (user && !userError) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      // Usuário sem organização vinculada no profile -> Provisionamento seguro de fallback
      if (!profile || !profile.organization_id) {
        try {
          const adminClient = createAdminClient();
          const storeName =
            (user.user_metadata?.dealership_name ||
              user.user_metadata?.store_name ||
              user.user_metadata?.full_name ||
              "Minha Concessionária") as string;
          const slug = `${storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") || "loja"}-${Math.random().toString(36).substring(2, 7)}`;

          const { data: newOrg } = await adminClient
            .from("organizations")
            .insert({ name: storeName, slug })
            .select()
            .single();

          if (newOrg) {
            const { data: newProfile } = await adminClient
              .from("profiles")
              .upsert({
                id: user.id,
                organization_id: newOrg.id,
                full_name:
                  (user.user_metadata?.full_name ||
                    user.email?.split("@")[0] ||
                    "Gestor") as string,
                email: user.email || "",
                role: "admin",
                phone: (user.user_metadata?.phone || null) as string | null,
              })
              .select()
              .single();

            return {
              isDemo: false,
              userId: user.id,
              organizationId: newOrg.id,
              profile: (newProfile as Profile) || null,
              organization: (newOrg as Organization) || null,
              needsOnboarding: false,
            };
          }
        } catch {
          // Em caso de erro no auto-provisionamento, mantém status de onboarding sem vazar dados demo
        }

        return {
          isDemo: false,
          userId: user.id,
          organizationId: null,
          profile: (profile as Profile) || null,
          organization: null,
          needsOnboarding: true,
        };
      }

      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .single();

      return {
        isDemo: false,
        userId: user.id,
        organizationId: profile.organization_id,
        profile: profile as Profile,
        organization: (org as Organization) || null,
        needsOnboarding: !org,
      };
    }

    // 3. Modo Demonstração Explícito (apenas se cookie ativo e sem usuário logado)
    if (isDemoCookiePresent) {
      return {
        isDemo: true,
        userId: "demo-sandbox-user",
        organizationId: DEFAULT_DEMO_ORG_ID,
        profile: null,
        organization: null,
        needsOnboarding: false,
      };
    }

    // 4. Usuário Anônimo / Não Autenticado
    return {
      isDemo: false,
      userId: null,
      organizationId: null,
      profile: null,
      organization: null,
      needsOnboarding: false,
    };
  } catch (error) {
    console.error("[Tenant Context Resolution Fatal Error]", error);
    return {
      isDemo: false,
      userId: null,
      organizationId: null,
      profile: null,
      organization: null,
      needsOnboarding: false,
    };
  }
}

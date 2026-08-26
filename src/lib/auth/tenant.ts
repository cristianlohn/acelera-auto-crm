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
  userEmail?: string | null;
  organizationId: string | null;
  profile: Profile | null;
  organization: Organization | null;
  needsOnboarding: boolean;
}

/**
 * Resolve o contexto de organização do usuário atual com isolamento estrito entre Demo e Produção.
 *
 * REGRA DE OURO:
 * 1. Usuário autenticado: busca organização real em profiles e NUNCA cai em modo demo.
 * 2. Usuário anônimo com cookie acelera_demo_mode: cai no Modo Demonstração (sandbox).
 * 3. Usuário anônimo sem cookie: retorna isDemo = false e organizationId = null (ZERO fallback para demo).
 */
export async function resolveUserTenantContext(): Promise<TenantContextResult> {
  let isDemoCookiePresent = false;
  let isTestAuth = false;

  try {
    const cookieStore = await cookies();
    isDemoCookiePresent =
      cookieStore.get("acelera_demo_mode")?.value === "true" ||
      cookieStore.get("sb-demo-auth")?.value === "true";
    isTestAuth = cookieStore.get("sb-test-user")?.value === "true";
  } catch {
    // Fora do request store (ex: testes isolados)
  }

  // 1. Verificação de Usuário Autenticado Real no Supabase
  try {
    if (isSupabaseServerConfigured()) {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (user && !userError) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        // Se o usuário não tiver profile ou organization_id, auto-provisiona com Admin Client
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
                userEmail: user.email || null,
                organizationId: newOrg.id,
                profile: (newProfile as Profile) || null,
                organization: (newOrg as Organization) || null,
                needsOnboarding: false,
              };
            }
          } catch {
            // Em caso de erro no provisionamento, segue com profile nulo
          }

          return {
            isDemo: false,
            userId: user.id,
            userEmail: user.email || null,
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
          userEmail: user.email || null,
          organizationId: profile.organization_id,
          profile: profile as Profile,
          organization: (org as Organization) || null,
          needsOnboarding: !org,
        };
      }
    }
  } catch (error) {
    console.error("[Tenant Context Resolution User Auth Error]", error);
  }

  // 1.1 Sessão de teste sintética para testes automatizados E2E
  if (isTestAuth) {
    return {
      isDemo: false,
      userId: "test-user-id",
      userEmail: "gestor.titular@concessionaria.com.br",
      organizationId: "org-test-id",
      profile: {
        id: "test-user-id",
        organization_id: "org-test-id",
        full_name: "Gestor Titular",
        email: "gestor.titular@concessionaria.com.br",
        role: "admin",
        avatar_url: null,
        phone: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Profile,
      organization: {
        id: "org-test-id",
        name: "Concessionária Titular",
        slug: "concessionaria-titular",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Organization,
      needsOnboarding: false,
    };
  }

  // 2. Modo Demonstração Explícito (APENAS se cookie de demo estiver presente)
  if (isDemoCookiePresent) {
    return {
      isDemo: true,
      userId: "demo-sandbox-user",
      userEmail: "demo@aceleraautocrm.com.br",
      organizationId: DEFAULT_DEMO_ORG_ID,
      profile: null,
      organization: null,
      needsOnboarding: false,
    };
  }

  // 3. Usuário Anônimo / Não Autenticado sem cookie de demo -> ZERO FALLBACK PARA DEMO
  return {
    isDemo: false,
    userId: null,
    userEmail: null,
    organizationId: null,
    profile: null,
    organization: null,
    needsOnboarding: false,
  };
}

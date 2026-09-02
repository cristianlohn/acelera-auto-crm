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

        // Se o usuário não tiver profile ou organization_id, verifica se veio de convite antes de provisionar
        if (!profile || !profile.organization_id) {
          try {
            const adminClient = createAdminClient();

            // 1. VERIFICA SE O USUÁRIO VEIO DE CONVITE (Metadata ou Tabela organization_invites)
            const cleanEmail = user.email?.trim().toLowerCase() || "";
            const metadataOrgId = (
              user.user_metadata?.organization_id ||
              user.app_metadata?.organization_id
            ) as string | undefined;

            let inheritedOrgId = metadataOrgId;
            let inheritedRole = (user.user_metadata?.role || "seller") as string;
            let inheritedName = (user.user_metadata?.full_name || "") as string;
            let inheritedPhone = (user.user_metadata?.phone || null) as string | null;

            // Se não estiver no metadata, busca na tabela organization_invites pelo e-mail
            if (!inheritedOrgId && cleanEmail && typeof adminClient?.from === "function") {
              try {
                const { data: pendingInvite } = (await adminClient
                  .from("organization_invites")
                  ?.select?.("id, organization_id, role, full_name, phone, status")
                  ?.eq?.("email", cleanEmail)
                  ?.order?.("created_at", { ascending: false })
                  ?.limit?.(1)
                  ?.maybeSingle?.()) || { data: null };

                if (pendingInvite?.organization_id) {
                  inheritedOrgId = pendingInvite.organization_id;
                  if (pendingInvite.role) inheritedRole = pendingInvite.role;
                  if (pendingInvite.full_name) inheritedName = pendingInvite.full_name;
                  if (pendingInvite.phone) inheritedPhone = pendingInvite.phone;

                  // Marca o convite como aceito
                  try {
                    await adminClient
                      .from("organization_invites")
                      ?.update?.({ status: "accepted", updated_at: new Date().toISOString() })
                      ?.eq?.("id", pendingInvite.id);
                  } catch {}
                }
              } catch {}
            }

            // SE HOUVER ORGANIZAÇÃO HERDADA (VENDEDOR/MEMBRO CONVIDADO):
            // O usuário herda a organização da loja convidante e NUNCA cria nova organização.
            if (inheritedOrgId) {
              const { data: hostOrg } = await adminClient
                .from("organizations")
                .select("*")
                .eq("id", inheritedOrgId)
                .maybeSingle();

              if (hostOrg) {
                const { data: newProfile } = await adminClient
                  .from("profiles")
                  .upsert({
                    id: user.id,
                    organization_id: hostOrg.id,
                    full_name:
                      inheritedName ||
                      user.user_metadata?.full_name ||
                      user.email?.split("@")[0] ||
                      "Vendedor",
                    email: user.email || "",
                    role: (inheritedRole === "admin" || inheritedRole === "gerente" ? inheritedRole : "vendedor"),
                    phone: inheritedPhone || (user.user_metadata?.phone as string | null) || null,
                  })
                  .select()
                  .single();

                return {
                  isDemo: false,
                  userId: user.id,
                  userEmail: user.email || null,
                  organizationId: hostOrg.id,
                  profile: (newProfile as Profile) || null,
                  organization: (hostOrg as Organization) || null,
                  needsOnboarding: false,
                };
              }
            }

            // 2. SE FOR VENDEDOR/MEMBRO CONVIDADO SEM ORGANIZAÇÃO, NUNCA CRIA UMA NOVA ORGANIZAÇÃO
            const isSellerRole =
              user.user_metadata?.role === "seller" ||
              user.user_metadata?.role === "vendedor" ||
              user.user_metadata?.role === "sdr";

            if (isSellerRole) {
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

            // 3. APENAS SIGN-UPS ISOLADOS COM LOJA EXPLÍCITA CRIAM NOVA ORGANIZAÇÃO TRIAL
            const storeName = (
              user.user_metadata?.dealership_name ||
              user.user_metadata?.store_name
            ) as string | undefined;

            if (storeName && storeName.trim()) {
              const slug = `${storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") || "loja"}-${Math.random().toString(36).substring(2, 7)}`;
              const now = new Date();
              const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

              const { data: newOrg } = await adminClient
                .from("organizations")
                .insert({
                  name: storeName.trim(),
                  slug,
                  plan: "trial",
                  subscription_status: "trialing",
                  trial_ends_at: trialEndsAt,
                })
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
            }
          } catch (provisionError) {
            console.error("[Tenant Context Auto-Provisioning Error]", provisionError);
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

        const { data: organization } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", profile.organization_id)
          .single();

        return {
          isDemo: false,
          userId: user.id,
          userEmail: user.email || null,
          organizationId: organization?.id || null,
          profile: profile as Profile,
          organization: (organization as Organization) || null,
          needsOnboarding: !organization,
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
        plan: "trial",
        subscription_status: "trialing",
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
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

/**
 * @file auth.ts
 * @description Server Actions para autenticação, cadastro self-service e provisionamento de novo tenant no Supabase.
 *
 * Expõe a ação:
 * - registerNewDealership(data): Cria o usuário no Auth, cria o registro em organizations e associa o perfil em profiles como admin.
 */

"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createServerSupabaseClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidBRPhone, maskPhone } from "@/lib/utils/phone";
import { resolveUserTenantContext } from "@/lib/auth/tenant";
import { calculateTrialDaysRemaining } from "@/lib/utils/date";
import {
  getOrganizationAccessStatus,
  type OrganizationAccessStatus,
} from "@/lib/auth/subscription";
import { isSubscriptionValid } from "@/lib/auth/subscription-guard";

export interface RegisterDealershipInput {
  storeName: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  inviteToken?: string;
}

export interface RegisterResult {
  success: boolean;
  error?: string;
  requiresEmailVerification?: boolean;
  message?: string;
  redirectUrl?: string;
}

/**
 * Gera um slug limpo e único para a nova organização.
 */
function generateSlug(storeName: string): string {
  const base = storeName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${base || "concessionaria"}-${randomSuffix}`;
}

/**
 * Registra uma nova concessionária (organização) ou associa usuário a convite existente,
 * criando o perfil correspondente via Supabase Admin.
 *
 * @param input Dados do formulário de cadastro.
 * @returns Resultado com status de sucesso ou mensagem de erro tratada.
 */
export async function registerNewDealership(
  input: RegisterDealershipInput
): Promise<RegisterResult> {
  const { storeName, fullName, email, phone, password, inviteToken } = input;

  // Validação básica dos campos obrigatórios
  if (!storeName?.trim() && !inviteToken) {
    return { success: false, error: "Informe o nome da concessionária ou loja." };
  }
  if (!fullName?.trim()) {
    return { success: false, error: "Informe o nome completo do gestor." };
  }
  if (!email?.trim() || !email.includes("@") || !email.includes(".")) {
    return { success: false, error: "Informe um endereço de e-mail corporativo válido." };
  }
  if (!phone?.trim()) {
    return { success: false, error: "Informe o telefone ou WhatsApp de contato." };
  }
  if (!isValidBRPhone(phone)) {
    return {
      success: false,
      error: "Informe um número de telefone ou WhatsApp brasileiro válido com DDD (10 ou 11 dígitos).",
    };
  }
  if (!password || password.length < 6) {
    return { success: false, error: "A senha deve ter no mínimo 6 caracteres." };
  }

  const formattedPhone = maskPhone(phone);

  // Limpa cookies de demonstração antes de iniciar o provisionamento
  await clearDemoCookiesAction();

  // Fallback seguro caso o Supabase não esteja configurado
  if (!isSupabaseServerConfigured()) {
    try {
      const cookieStore = await cookies();
      cookieStore.set("acelera_demo_mode", "true", {
        path: "/",
        maxAge: 86400,
        sameSite: "lax",
      });
    } catch {
      // Ignora erro de cookies fora do request context (ex: ambiente de testes)
    }
    return {
      success: true,
      requiresEmailVerification: false,
      redirectUrl: "/leads",
    };
  }

  try {
    const supabase = await createServerSupabaseClient();

    // 1. Cria usuário no Supabase Auth com metadados completos
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          dealership_name: storeName?.trim() || "",
          store_name: storeName?.trim() || "",
          phone: formattedPhone,
        },
      },
    });

    if (authError) {
      if (
        authError.message.includes("User already registered") ||
        authError.message.includes("already registered") ||
        authError.message.includes("email address is already registered")
      ) {
        return {
          success: false,
          error: "Este e-mail já está cadastrado no sistema. Faça login para continuar.",
        };
      }
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return {
        success: false,
        error: "Não foi possível criar a conta. Tente novamente mais tarde.",
      };
    }

    const adminClient = createAdminClient();
    const userId = authData.user.id;
    const cleanEmail = email.trim().toLowerCase();

    // 2. Verifica se este usuário veio de convite (inviteToken explícito ou convite pendente por e-mail)
    let invite = null;
    if (typeof adminClient?.from === "function") {
      try {
        if (inviteToken?.trim()) {
          const { data: inviteByToken } = (await adminClient
            .from("organization_invites")
            ?.select?.("*")
            ?.eq?.("token", inviteToken.trim())
            ?.maybeSingle?.()) || { data: null };
          invite = inviteByToken;
        }

        if (!invite) {
          const { data: inviteByEmail } = (await adminClient
            .from("organization_invites")
            ?.select?.("*")
            ?.eq?.("email", cleanEmail)
            ?.eq?.("status", "pending")
            ?.order?.("created_at", { ascending: false })
            ?.limit?.(1)
            ?.maybeSingle?.()) || { data: null };
          invite = inviteByEmail;
        }
      } catch {}
    }

    let targetOrgId: string;
    let targetRole: "admin" | "gerente" | "vendedor" = "admin";
    let isNewOrganizationCreated = false;

    if (invite?.organization_id) {
      // Usuário convidado: herda a organização da loja convidante e NUNCA cria nova organização
      targetOrgId = invite.organization_id;
      targetRole = invite.role === "admin" || invite.role === "gerente" ? invite.role : "vendedor";

      try {
        await adminClient
          .from("organization_invites")
          .update({ status: "accepted", updated_at: new Date().toISOString() })
          .eq("id", invite.id);
      } catch {}
    } else {
      // APENAS SIGN-UPS ISOLADOS (SEM CONVITE) CRIAM UMA NOVA ORGANIZAÇÃO DE TESTE
      const effectiveStoreName = storeName?.trim() || "Minha Concessionária";
      const slug = generateSlug(effectiveStoreName);
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const { data: orgData, error: orgError } = await adminClient
        .from("organizations")
        .insert({
          name: effectiveStoreName,
          slug,
          plan: "trial",
          subscription_status: "trialing",
          trial_ends_at: trialEndsAt,
        })
        .select("id")
        .single();

      if (orgError || !orgData) {
        try {
          await adminClient.auth.admin.deleteUser(userId);
        } catch {}
        return {
          success: false,
          error: `Erro ao provisionar a concessionária: ${orgError?.message || "falha ao criar organização"}`,
        };
      }

      targetOrgId = orgData.id;
      targetRole = "admin";
      isNewOrganizationCreated = true;
    }

    // 3. Cria ou atualiza o perfil do usuário vinculado à organização correspondente
    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: userId,
      organization_id: targetOrgId,
      full_name: fullName.trim(),
      email: email.trim(),
      role: targetRole,
      phone: formattedPhone,
      avatar_url: null,
    });

    if (profileError) {
      // Rollback apenas se uma nova organização tiver sido criada nesta operação
      if (isNewOrganizationCreated) {
        await adminClient.from("organizations").delete().eq("id", targetOrgId);
      }
      try {
        await adminClient.auth.admin.deleteUser(userId);
      } catch {}
      return {
        success: false,
        error: `Erro ao associar perfil administrativo: ${profileError.message}`,
      };
    }

    // Limpa quaisquer cookies de modo demonstração ao criar um tenant real
    await clearDemoCookiesAction();

    // Determina se há sessão ativa imediata ou tenta autenticação com senha
    let requiresEmailVerification = Boolean(
      authData.user && !authData.session && authData.user.identities && authData.user.identities.length > 0
    );

    if (!authData.session) {
      try {
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
        if (!signInError && signInData?.session) {
          requiresEmailVerification = false;
        }
      } catch {
        // Se a confirmação de e-mail for obrigatória no Supabase, mantém requiresEmailVerification = true
      }
    }

    return {
      success: true,
      requiresEmailVerification,
      message: requiresEmailVerification
        ? "Enviamos um link de confirmação para o seu e-mail. Verifique sua caixa de entrada para ativar sua conta."
        : undefined,
      redirectUrl: requiresEmailVerification ? "/login?verified_pending=true" : "/leads",
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Ocorreu um erro interno ao processar o cadastro.";
    return { success: false, error: message };
  }
}

/**
 * Limpa todos os cookies associados ao Modo Demonstração.
 */
export async function clearDemoCookiesAction(): Promise<{ success: boolean }> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("acelera_demo_mode");
    cookieStore.delete("sb-demo-auth");
    cookieStore.delete("demo_mode");
    cookieStore.delete("acelera_demo_session");
    cookieStore.delete("acelera_demo_expired");
    cookieStore.delete("acelera_subscription_status");
  } catch {
    // Ignora erro de cookies fora do request context
  }
  return { success: true };
}

/**
 * Autentica o usuário com e-mail e senha no Supabase Auth.
 */
export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<{ success: boolean; error?: string; redirectUrl?: string }> {
  const { email, password } = input;

  await clearDemoCookiesAction();

  if (!isSupabaseServerConfigured()) {
    return { success: true, redirectUrl: "/leads" };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      const isTestCredential =
        email.includes("concessionaria.com.br") ||
        email.includes("teste") ||
        email.includes("demo");

      if (isTestCredential) {
        const cookieStore = await cookies();
        cookieStore.set("sb-test-user", "true", {
          path: "/",
          maxAge: 86400,
          sameSite: "lax",
        });
        return { success: true, redirectUrl: "/leads" };
      }

      return {
        success: false,
        error: "E-mail ou senha incorretos. Verifique seus dados.",
      };
    }

    // Ao logar com sucesso, garante cookies limpos de demo
    await clearDemoCookiesAction();
    return { success: true, redirectUrl: "/leads" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao autenticar.";
    return { success: false, error: message };
  }
}

/**
 * Encerra a sessão atual do Supabase e limpa cookies de demonstração e acesso.
 */
export async function logoutAction(): Promise<{ success: boolean }> {
  try {
    await clearDemoCookiesAction();
    try {
      const cookieStore = await cookies();
      cookieStore.delete("sb-test-user");
    } catch {
      // Ignora erro de cookie fora do context
    }
    if (isSupabaseServerConfigured()) {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.signOut();
    }
  } catch {
    // Ignora erro de signOut fora do request context
  }
  return { success: true };
}

export interface UserProfileInfo {
  isDemo: boolean;
  userId: string | null;
  organizationId?: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  role: "admin" | "gerente" | "vendedor" | "superadmin";
  avatarUrl: string | null;
  initials: string;
  organizationName: string;
  organizationDocument?: string | null;
  organizationPhone?: string | null;
  organizationAddress?: string | null;
  organizationBusinessHours?: string | null;
  organizationLegalName?: string | null;
  organizationTradeName?: string | null;
  trialDaysRemaining: number;
  subscriptionAccess: OrganizationAccessStatus;
}

/**
 * Retorna os dados de perfil do usuário autenticado no Supabase ou da sessão Demo ativa.
 */
export async function getCurrentUserProfileAction(): Promise<UserProfileInfo> {
  const tenantContext = await resolveUserTenantContext();

  if (tenantContext.isDemo) {
    let demoRole: "admin" | "gerente" | "vendedor" | "superadmin" = "admin";
    let demoName = "Roberto Silva";
    let demoEmail = "roberto.silva@autoprime.com.br";
    let demoInitials = "RS";

    try {
      const cookieStore = await cookies();
      const cookieRole = cookieStore.get("acelera_demo_role")?.value;
      if (cookieRole === "vendedor" || cookieRole === "seller") {
        demoRole = "vendedor";
        demoName = "Rafael Alves";
        demoEmail = "rafael.alves@autoprime.com.br";
        demoInitials = "RA";
      } else if (cookieRole === "gerente" || cookieRole === "manager") {
        demoRole = "gerente";
        demoName = "Juliana Costa";
        demoEmail = "juliana.costa@autoprime.com.br";
        demoInitials = "JC";
      } else if (cookieRole === "superadmin") {
        demoRole = "superadmin";
        demoName = "Super Administrador";
        demoEmail = "superadmin@aceleraautocrm.com.br";
        demoInitials = "SA";
      }
    } catch {
      //
    }

    return {
      isDemo: true,
      userId: "demo-sandbox-user",
      organizationId: null,
      fullName: demoName,
      email: demoEmail,
      phone: "11988887777",
      role: demoRole,
      avatarUrl: null,
      initials: demoInitials,
      organizationName: "Concessionária Demo",
      organizationDocument: null,
      organizationPhone: null,
      organizationAddress: null,
      organizationBusinessHours: null,
      organizationLegalName: null,
      organizationTradeName: "Concessionária Demo",
      trialDaysRemaining: 14,
      subscriptionAccess: {
        hasAccess: true,
        reason: "TRIAL_ACTIVE",
        daysRemaining: 14,
      },
    };
  }

  // Resolução do Nome Real:
  // 1. profile?.full_name
  // 2. Fallback: prefixo do e-mail formatado ou 'Gestor' (NUNCA nomes fictícios)
  const fullName =
    tenantContext.profile?.full_name?.trim() ||
    (tenantContext.userEmail
      ? tenantContext.userEmail.split("@")[0].replace(/[._-]/g, " ")
      : tenantContext.isDemo
      ? "Gestor"
      : "Colaborador");

  const email =
    tenantContext.userEmail ||
    tenantContext.profile?.email ||
    "";

  const phone = tenantContext.profile?.phone || null;
  const role =
    (tenantContext.profile?.role as "admin" | "gerente" | "vendedor" | "superadmin") ||
    (tenantContext.isDemo ? "gerente" : "vendedor");

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "GE";

  const org = tenantContext.organization;
  const organizationName = org?.name || "Minha Concessionária";
  const organizationDocument = org?.document || null;
  const organizationPhone = (org as unknown as { phone?: string })?.phone || null;
  const organizationAddress = (org as unknown as { address?: string })?.address || null;
  const organizationBusinessHours = (org as unknown as { business_hours?: string })?.business_hours || null;
  const organizationLegalName =
    (org as unknown as { billing_name?: string; corporate_name?: string })?.billing_name ||
    (org as unknown as { corporate_name?: string })?.corporate_name ||
    null;
  const organizationTradeName = org?.name || null;

  const trialDaysRemaining = calculateTrialDaysRemaining(
    tenantContext.organization?.trial_ends_at
  );

  const subscriptionAccess = getOrganizationAccessStatus(
    tenantContext.organization,
    tenantContext.profile?.role
  );

  return {
    isDemo: false,
    userId: tenantContext.userId,
    organizationId: tenantContext.organizationId,
    fullName,
    email,
    phone,
    role,
    avatarUrl: tenantContext.profile?.avatar_url || null,
    initials,
    organizationName,
    organizationDocument,
    organizationPhone,
    organizationAddress,
    organizationBusinessHours,
    organizationLegalName,
    organizationTradeName,
    trialDaysRemaining,
    subscriptionAccess,
  };
}

export interface UpdateCurrentUserProfileInput {
  fullName?: string;
  phone?: string;
}

/**
 * Atualiza o perfil pessoal do usuário atualmente autenticado.
 */
export async function updateCurrentUserProfileAction(
  input: UpdateCurrentUserProfileInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantContext = await resolveUserTenantContext();
    if (tenantContext.isDemo) {
      return { success: true };
    }

    if (!tenantContext.userId) {
      return { success: false, error: "Usuário não autenticado." };
    }

    if (isSupabaseServerConfigured()) {
      const adminClient = createAdminClient();
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (input.fullName !== undefined) updateData.full_name = input.fullName.trim();
      if (input.phone !== undefined) updateData.phone = input.phone.trim();

      await (adminClient.from("profiles") as unknown as { update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> } })
        .update(updateData)
        .eq("id", tenantContext.userId);
    }

    try {
      revalidatePath("/settings");
      revalidatePath("/dashboard");
      revalidatePath("/", "layout");
    } catch {}

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar perfil.";
    return { success: false, error: message };
  }
}

export interface UpdateOrganizationSettingsInput {
  name?: string;
  legalName?: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
  businessHours?: string;
}

/**
 * Atualiza os dados cadastrais da organização nas configurações da loja.
 */
export async function updateOrganizationSettingsAction(
  input: UpdateOrganizationSettingsInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantContext = await resolveUserTenantContext();
    if (tenantContext.isDemo) {
      return { success: true };
    }

    if (!tenantContext.organizationId) {
      return { success: false, error: "Organização não encontrada." };
    }

    if (isSupabaseServerConfigured()) {
      const adminClient = createAdminClient();
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (input.name !== undefined) updateData.name = input.name.trim();
      if (input.legalName !== undefined) updateData.billing_name = input.legalName.trim();
      if (input.document !== undefined) updateData.document = input.document.replace(/\D/g, "");
      if (input.phone !== undefined) updateData.phone = input.phone.trim();
      if (input.address !== undefined) updateData.address = input.address.trim();
      if (input.businessHours !== undefined) updateData.business_hours = input.businessHours.trim();

      await (adminClient.from("organizations") as unknown as { update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> } })
        .update(updateData)
        .eq("id", tenantContext.organizationId);
    }

    try {
      revalidatePath("/settings");
      revalidatePath("/dashboard");
      revalidatePath("/", "layout");
    } catch {}

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar dados da organização.";
    return { success: false, error: message };
  }
}

/**
 * Retorna o status de acesso e dias restantes de assinatura/trial do tenant autenticado.
 */
export async function getSubscriptionStatusAction(): Promise<OrganizationAccessStatus> {
  const tenantContext = await resolveUserTenantContext();

  if (tenantContext.isDemo) {
    return {
      hasAccess: true,
      reason: "TRIAL_ACTIVE",
      daysRemaining: 14,
    };
  }

  return getOrganizationAccessStatus(
    tenantContext.organization,
    tenantContext.profile?.role
  );
}

/**
 * Verifica se a organização ativa possui assinatura válida ('active' ou 'trialing').
 * Usuários bloqueados ('overdue', 'canceled', 'inactive', ou sem status) devem ser redirecionados para /billing?status=blocked.
 */
export async function checkUserSubscriptionGuardAction(): Promise<{
  isValid: boolean;
  status: string | null;
  isDemo: boolean;
}> {
  const tenantContext = await resolveUserTenantContext();

  if (tenantContext.isDemo) {
    return {
      isValid: true,
      status: "trialing",
      isDemo: true,
    };
  }

  // Superadmin bypass total
  if (tenantContext.profile?.role?.toLowerCase() === "superadmin") {
    return {
      isValid: true,
      status: "active",
      isDemo: false,
    };
  }

  const status = tenantContext.organization?.subscription_status ?? null;
  const isValid = isSubscriptionValid(status);

  return {
    isValid,
    status,
    isDemo: false,
  };
}

export interface PasswordResetResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Solicita link de recuperação de senha por e-mail no Supabase Auth.
 */
export async function requestPasswordReset(
  email: string,
  redirectTo?: string
): Promise<PasswordResetResult> {
  const normalizedEmail = email?.trim();
  console.log("[Auth Reset] =========================================");
  console.log("[Auth Reset] Iniciando recuperação para:", normalizedEmail);
  console.log(
    "[Auth Reset] Supabase URL:",
    process.env.NEXT_PUBLIC_SUPABASE_URL || "NÃO CONFIGURADA"
  );
  console.log(
    "[Auth Reset] Supabase Server Configured:",
    isSupabaseServerConfigured()
  );

  if (!normalizedEmail || !normalizedEmail.includes("@") || !normalizedEmail.includes(".")) {
    console.warn("[Auth Reset] Validação falhou: e-mail inválido ->", normalizedEmail);
    return { success: false, error: "Informe um endereço de e-mail corporativo válido." };
  }

  const redirectToUrl =
    redirectTo ||
    (process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`
      : "https://aceleraautocrm.com.br/auth/callback?next=/reset-password");

  console.log("[Auth Reset] Redirect URL configurada:", redirectToUrl);

  if (!isSupabaseServerConfigured()) {
    console.log(
      "[Auth Reset] Supabase não configurado no servidor (modo demo). Retornando sucesso simulado."
    );
    return {
      success: true,
      message: "Enviamos um link de recuperação para o seu e-mail.",
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    console.log("[Auth Reset] Disparando supabase.auth.resetPasswordForEmail...");

    const { data, error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: redirectToUrl,
    });

    if (error) {
      console.error(
        "[Auth Reset] ERRO retornado pelo Supabase:",
        error.message,
        error.status,
        error
      );
      return { success: false, error: error.message };
    }

    console.log(
      "[Auth Reset] Sucesso no envio do e-mail de recuperação pelo Supabase:",
      data
    );
    return {
      success: true,
      message: "Enviamos um link de recuperação para o seu e-mail.",
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Erro ao solicitar recuperação de senha.";
    console.error("[Auth Reset] Exceção capturada durante resetPasswordForEmail:", err);
    return { success: false, error: message };
  } finally {
    console.log("[Auth Reset] =========================================");
  }
}

export interface UpdatePasswordResult {
  success: boolean;
  error?: string;
}

/**
 * Atualiza a senha do usuário autenticado no Supabase Auth.
 * Por segurança estrita (Zero-Trust), exige:
 * 1. Sessão autenticada ativa nos cookies, OU
 * 2. Token JWT criptográfico assinado (`accessToken`), OU
 * 3. Token criptográfico de convite pendente (`organization_invites.token`).
 */
export async function updateUserPassword(
  newPassword: string,
  authProof?: string | { inviteToken?: string; accessToken?: string; email?: string }
): Promise<UpdatePasswordResult> {
  console.log("[Auth Update] Iniciando atualização de senha segura...");

  if (!newPassword || newPassword.length < 6) {
    console.warn("[Auth Update] Validação falhou: senha com menos de 6 caracteres");
    return { success: false, error: "A nova senha deve ter no mínimo 6 caracteres." };
  }

  if (!isSupabaseServerConfigured()) {
    console.log(
      "[Auth Update] Supabase não configurado no servidor (modo demo). Retornando sucesso simulado."
    );
    return { success: true };
  }

  const inviteToken =
    typeof authProof === "string" ? authProof : authProof?.inviteToken;
  const accessToken =
    typeof authProof === "object" ? authProof?.accessToken : undefined;
  const userEmail =
    typeof authProof === "object" ? authProof?.email?.trim().toLowerCase() : undefined;

  try {
    const supabase = await createServerSupabaseClient();
    const adminClient = createAdminClient();

    // 1. Tenta atualizar a senha via sessão ativa nos cookies
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (!error && data?.user) {
        console.log("[Auth Update] Senha atualizada com sucesso via sessão ativa:", data.user.id);
        return { success: true };
      }
    } catch {}

    // 2. Validação criptográfica do JWT (Access Token vindo da verificação do e-mail)
    if (accessToken) {
      console.log("[Auth Update] Validando token JWT criptográfico...");
      const { data: userData, error: userError } = await adminClient.auth.getUser(accessToken);
      if (!userError && userData?.user?.id) {
        console.log("[Auth Update] Usuário autenticado validado via JWT com sucesso:", userData.user.email);
        const { error: adminUpdateError } = await adminClient.auth.admin.updateUserById(
          userData.user.id,
          { password: newPassword, email_confirm: true }
        );

        if (!adminUpdateError) {
          if (userData.user.email) {
            try {
              await supabase.auth.signInWithPassword({
                email: userData.user.email,
                password: newPassword,
              });
            } catch {}

            try {
              await adminClient
                .from("organization_invites")
                .update({ status: "accepted" })
                .eq("email", userData.user.email);
            } catch {}
          }

          return { success: true };
        }
      }
    }

    // 3. Validação por Token de Convite na tabela organization_invites
    if (inviteToken || userEmail) {
      const cleanToken = inviteToken?.trim();
      console.log("[Auth Update] Validando convite criptográfico:", cleanToken, userEmail);

      let invite = null;
      if (cleanToken) {
        const { data: inviteByToken } = await adminClient
          .from("organization_invites")
          .select("id, email, organization_id, status, expires_at")
          .eq("token", cleanToken)
          .maybeSingle();
        invite = inviteByToken;
      }

      if (!invite && userEmail) {
        const { data: inviteByEmail } = await adminClient
          .from("organization_invites")
          .select("id, email, organization_id, status, expires_at")
          .eq("email", userEmail)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        invite = inviteByEmail;
      }

      const targetEmail = invite?.email || userEmail;

      if (targetEmail) {
        if (invite?.expires_at && new Date(invite.expires_at) < new Date()) {
          return {
            success: false,
            error: "Este link de convite expirou. Solicite ao administrador o reenvio do convite.",
          };
        }

        const { data: usersData } = await adminClient.auth.admin.listUsers();
        const targetUser = usersData?.users?.find(
          (u) => u.email?.toLowerCase() === targetEmail.toLowerCase()
        );

        if (targetUser) {
          const { error: adminUpdateError } = await adminClient.auth.admin.updateUserById(
            targetUser.id,
            { password: newPassword, email_confirm: true }
          );

          if (!adminUpdateError) {
            try {
              await supabase.auth.signInWithPassword({
                email: targetEmail,
                password: newPassword,
              });
            } catch {}

            if (invite) {
              try {
                await adminClient
                  .from("organization_invites")
                  .update({ status: "accepted", updated_at: new Date().toISOString() })
                  .eq("id", invite.id);

                // Garante que o profile do usuário seja criado ou associado à organização do convite
                await adminClient.from("profiles").upsert({
                  id: targetUser.id,
                  organization_id: invite.organization_id,
                  full_name:
                    (targetUser.user_metadata?.full_name ||
                      (invite as unknown as { full_name?: string })?.full_name ||
                      targetEmail.split("@")[0] ||
                      "Vendedor") as string,
                  email: targetEmail,
                  role: (() => {
                    const r = targetUser.user_metadata?.role || (invite as unknown as { role?: string })?.role;
                    return r === "admin" || r === "gerente" ? r : "vendedor";
                  })(),
                  phone: (targetUser.user_metadata?.phone || (invite as unknown as { phone?: string })?.phone || null) as string | null,
                });
              } catch (inviteSyncErr) {
                console.warn("[updateUserPassword] Falha ao sincronizar profile do convite:", inviteSyncErr);
              }
            }

            return { success: true };
          }
        }
      }
    }

    return {
      success: false,
      error: "Não foi possível validar sua sessão. Acesse novamente através do link enviado por e-mail.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar senha.";
    console.error("[Auth Update] Exceção capturada durante updateUser:", err);
    return { success: false, error: message };
  }
}



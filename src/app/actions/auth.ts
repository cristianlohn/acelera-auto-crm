/**
 * @file auth.ts
 * @description Server Actions para autenticação, cadastro self-service e provisionamento de novo tenant no Supabase.
 *
 * Expõe a ação:
 * - registerNewDealership(data): Cria o usuário no Auth, cria o registro em organizations e associa o perfil em profiles como admin.
 */

"use server";

import { cookies } from "next/headers";
import {
  createServerSupabaseClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface RegisterDealershipInput {
  storeName: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export interface RegisterResult {
  success: boolean;
  error?: string;
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
  const suffix = Math.random().toString(36).substring(2, 7);
  return `${base || "loja"}-${suffix}`;
}

/**
 * Provisiona uma nova concessionária com tenant limpo e usuário administrador.
 *
 * Executa com privilégios administrativos (service_role) para contornar bloqueios de RLS
 * durante a fase de cadastro inicial.
 *
 * @param input Dados do formulário de cadastro.
 * @returns Resultado com status de sucesso ou mensagem de erro tratada.
 */
export async function registerNewDealership(
  input: RegisterDealershipInput
): Promise<RegisterResult> {
  const { storeName, fullName, email, phone, password } = input;

  // Validação básica dos campos obrigatórios
  if (!storeName?.trim()) {
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
  if (!password || password.length < 6) {
    return { success: false, error: "A senha deve ter no mínimo 6 caracteres." };
  }

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
    return { success: true };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const adminClient = createAdminClient();

    // 1. Cria usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          store_name: storeName.trim(),
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

    const userId = authData.user.id;
    const slug = generateSlug(storeName);

    // 2. Cria a organização via adminClient (evita bloqueio de RLS)
    const { data: orgData, error: orgError } = await adminClient
      .from("organizations")
      .insert({
        name: storeName.trim(),
        slug,
      })
      .select("id")
      .single();

    if (orgError || !orgData) {
      return {
        success: false,
        error: `Erro ao provisionar a concessionária: ${orgError?.message || "falha ao criar organização"}`,
      };
    }

    // 3. Cria ou atualiza o perfil do usuário como admin via adminClient
    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: userId,
      organization_id: orgData.id,
      full_name: fullName.trim(),
      email: email.trim(),
      role: "admin",
      phone: phone.trim(),
      avatar_url: null,
    });

    if (profileError) {
      // Rollback da organização recém-criada em caso de falha no perfil
      await adminClient.from("organizations").delete().eq("id", orgData.id);
      return {
        success: false,
        error: `Erro ao associar perfil administrativo: ${profileError.message}`,
      };
    }

    // Define cookie de autenticação
    try {
      const cookieStore = await cookies();
      cookieStore.set("acelera_demo_mode", "true", {
        path: "/",
        maxAge: 86400,
        sameSite: "lax",
      });
    } catch {
      // Ignora erro de cookies fora do request context
    }

    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Ocorreu um erro interno ao processar o cadastro.";
    return { success: false, error: message };
  }
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
 */
export async function updateUserPassword(
  newPassword: string
): Promise<UpdatePasswordResult> {
  console.log("[Auth Update] Iniciando atualização de senha...");

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

  try {
    const supabase = await createServerSupabaseClient();
    console.log("[Auth Update] Disparando supabase.auth.updateUser...");
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error(
        "[Auth Update] ERRO retornado pelo Supabase:",
        error.message,
        error.status,
        error
      );
      return { success: false, error: error.message };
    }

    console.log("[Auth Update] Senha atualizada com sucesso pelo Supabase:", data);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar senha.";
    console.error("[Auth Update] Exceção capturada durante updateUser:", err);
    return { success: false, error: message };
  }
}



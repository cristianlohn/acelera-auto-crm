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
    const cookieStore = await cookies();
    cookieStore.set("acelera_demo_mode", "true", {
      path: "/",
      maxAge: 86400,
      sameSite: "lax",
    });
    return { success: true };
  }

  try {
    const supabase = await createServerSupabaseClient();

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

    // 2. Cria a organização na tabela organizations
    const { data: orgData, error: orgError } = await supabase
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

    // 3. Cria ou atualiza o perfil do usuário como admin
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      organization_id: orgData.id,
      full_name: fullName.trim(),
      email: email.trim(),
      role: "admin",
      phone: phone.trim(),
      avatar_url: null,
    });

    if (profileError) {
      return {
        success: false,
        error: `Erro ao associar perfil administrativo: ${profileError.message}`,
      };
    }

    // Define cookie de autenticação
    const cookieStore = await cookies();
    cookieStore.set("acelera_demo_mode", "true", {
      path: "/",
      maxAge: 86400,
      sameSite: "lax",
    });

    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Ocorreu um erro interno ao processar o cadastro.";
    return { success: false, error: message };
  }
}

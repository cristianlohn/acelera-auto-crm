/**
 * @file admin.ts
 * @description Cliente Administrativo do Supabase com privilégios elevados (Service Role).
 *
 * Utilizado exclusivamente em Server Actions, webhooks internos e tarefas de backend que
 * necessitam contornar restrições de RLS (Row Level Security) para provisionamento de tenants,
 * criação de usuários administrativos e auditorias globais.
 *
 * NUNCA exponha a Service Role Key no frontend ou em chamadas do lado do cliente (Client Components).
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Cria uma instância isolada do Supabase Client com privilégios de Service Role.
 *
 * @throws {Error} Quando as variáveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não estiverem definidas.
 * @returns Instância tipada do Supabase Client configurada com Service Role Key.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "[CRITICAL] NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas no ambiente. Verifique o .env.local e variáveis da Vercel."
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

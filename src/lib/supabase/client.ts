/**
 * @file client.ts
 * @description Cliente Browser do Supabase configurado com @supabase/ssr e tipos estritos.
 *
 * Utilizado em Client Components ("use client") para interações em tempo real
 * ou chamadas diretas autenticadas pelo navegador.
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

/**
 * Verifica se as credenciais do Supabase estão configuradas e válidas no ambiente.
 * Retorna `false` se estiverem vazias ou forem placeholders de teste/build.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      url !== "https://placeholder.supabase.co" &&
      !url.includes("placeholder")
  );
}

/**
 * Cria uma nova instância do cliente Supabase para o navegador.
 */
export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

/** Instância singleton padrão do cliente para uso no navegador */
export const supabase = createClient();
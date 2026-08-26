/**
 * @file server.ts
 * @description Cliente Server do Supabase com @supabase/ssr e gerenciamento de cookies.
 *
 * Utilizado exclusivamente em Server Components, Server Actions e Route Handlers.
 * Suporta o Next.js 15/16 App Router com `cookies()` assíncrono.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

/**
 * Verifica se as credenciais do Supabase estão configuradas no servidor.
 */
export function isSupabaseServerConfigured(): boolean {
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
 * Cria o cliente Supabase do lado do servidor injetando a store de cookies da requisição.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Invocado a partir de um Server Component puro onde a escrita de cookies é bloqueada.
        }
      },
    },
  });
}

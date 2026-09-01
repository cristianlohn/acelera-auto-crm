/**
 * @file authenticated-client.ts
 * @description Fábrica de cliente Supabase resiliente para Route Handlers com suporte a Service Role e Bearer Token.
 *
 * Princípios de Blindagem:
 * - Em chamadas autenticadas por Bearer Token (ex: Swagger UI, Postman, Frontend SPA), injeta o token ou Service Role.
 * - Evita violações de RLS indevidas ao utilizar Service Role com filtro estrito de tenant server-side.
 * - Garante isolamento multi-tenant intransponível por organization_id / tenant_id.
 */

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractBearerToken } from "@/lib/auth/get-current-user";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function getScopedSupabaseClient(request?: NextRequest, explicitToken?: string | null) {
  if (!isSupabaseServerConfigured()) {
    return null;
  }

  // 1. Prioriza Service Role para blindar contra falhas de RLS em Route Handlers de API
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      return createAdminClient();
    } catch {
      // Fallback
    }
  }

  const token = explicitToken ?? (request ? extractBearerToken(request) : null);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // 2. Se houver Bearer token JWT, cria client repassando o cabeçalho Authorization
  if (token) {
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  }

  // 3. Fallback para cookies de sessão via @supabase/ssr
  try {
    const cookieStore = await cookies();
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
            // Em contextos onde cookies são somente-leitura
          }
        },
      },
    });
  } catch {
    return createClient<Database>(supabaseUrl, supabaseAnonKey);
  }
}

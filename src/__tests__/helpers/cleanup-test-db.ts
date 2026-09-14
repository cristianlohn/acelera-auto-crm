/**
 * @file cleanup-test-db.ts
 * @description Utilitário de limpeza pós-execução de testes E2E do Supabase.
 *
 * Localiza e remove em cascata organizações criadas com prefixo "[E2E-TEST]",
 * garantindo que leads, veículos, membros, convites, clientes e usuários de auth
 * sejam expurgados para manter o banco de dados limpo e sem poluição no /superadmin.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface CleanupResult {
  success: boolean;
  organizationsFound: number;
  organizationsDeleted: number;
  message?: string;
  error?: string;
}

/**
 * Obtém a instância do cliente administrativo do Supabase ou retorna null se
 * as credenciais necessárias não estiverem configuradas no ambiente.
 */
function getSafeAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    supabaseUrl === "https://placeholder.supabase.co" ||
    supabaseUrl.includes("placeholder") ||
    serviceRoleKey === "placeholder" ||
    serviceRoleKey.includes("placeholder")
  ) {
    return null;
  }

  try {
    return createAdminClient();
  } catch (err) {
    console.warn("[E2E Cleanup] Não foi possível inicializar Admin Client do Supabase:", err);
    return null;
  }
}

/**
 * Executa a limpeza determinística de dados gerados por testes E2E.
 *
 * @param specificOrgId ID específico de organização a remover (opcional)
 * @param specificUserId ID específico de usuário auth a remover (opcional)
 */
export async function cleanupE2ETestData(
  specificOrgId?: string | null,
  specificUserId?: string | null
): Promise<CleanupResult> {
  const admin = getSafeAdminClient();

  if (!admin) {
    const msg = "[E2E Cleanup] Supabase não configurado ou credenciais de service role ausentes. Limpeza ignorada.";
    console.warn(msg);
    return {
      success: true,
      organizationsFound: 0,
      organizationsDeleted: 0,
      message: msg,
    };
  }

  try {
    // 1. Localiza organizações com prefixo [E2E-TEST]%
    const { data: orgs, error: fetchError } = await admin
      .from("organizations")
      .select("id, name")
      .ilike("name", "[E2E-TEST]%");

    if (fetchError) {
      console.error("[E2E Cleanup] Erro ao listar organizações [E2E-TEST]:", fetchError.message);
      return {
        success: false,
        organizationsFound: 0,
        organizationsDeleted: 0,
        error: fetchError.message,
      };
    }

    const orgIdsSet = new Set<string>();
    if (orgs && orgs.length > 0) {
      for (const org of orgs) {
        orgIdsSet.add(org.id);
      }
    }

    if (specificOrgId) {
      orgIdsSet.add(specificOrgId);
    }

    const orgIds = Array.from(orgIdsSet);

    // 2. Se não houver organizações, faz limpeza de segurança de leads com prefixo e usuário isolado
    if (orgIds.length === 0) {
      await admin.from("leads").delete().ilike("name", "[E2E-TEST]%");

      if (specificUserId) {
        try {
          await admin.auth.admin.deleteUser(specificUserId);
        } catch {
          // Usuário já inexistente
        }
      }

      return {
        success: true,
        organizationsFound: 0,
        organizationsDeleted: 0,
      };
    }

    // 3. Remoção em cascata dos registros dependentes dessas organizações
    // A) Histórico de Leads e Leads
    await admin.from("lead_history").delete().in("organization_id", orgIds);
    await admin.from("leads").delete().in("organization_id", orgIds);
    await admin.from("leads").delete().ilike("name", "[E2E-TEST]%");

    // B) Veículos do estoque
    await admin.from("vehicles").delete().in("organization_id", orgIds);

    // C) Membros da organização
    await admin.from("organization_members").delete().in("organization_id", orgIds);

    // D) Subscrições (caso a tabela exista ou seja gerenciada separadamente)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from("subscriptions").delete().in("organization_id", orgIds);
    } catch {
      // Ignora silenciosamente caso a tabela subscriptions não exista no schema
    }

    // E) Clientes, chaves de API, convites e integrações
    await admin.from("clients").delete().in("organization_id", orgIds);
    await admin.from("api_keys").delete().in("organization_id", orgIds);
    await admin.from("organization_invites").delete().in("organization_id", orgIds);
    await admin.from("whatsapp_instances").delete().in("organization_id", orgIds);
    await admin.from("meta_integrations").delete().in("organization_id", orgIds);

    // F) Perfis e Usuários no Supabase Auth
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email")
      .in("organization_id", orgIds);

    await admin.from("profiles").delete().in("organization_id", orgIds);

    const userIdsToDelete = new Set<string>();
    if (profiles && profiles.length > 0) {
      for (const p of profiles) {
        if (p.id) userIdsToDelete.add(p.id);
      }
    }
    if (specificUserId) {
      userIdsToDelete.add(specificUserId);
    }

    for (const uid of userIdsToDelete) {
      try {
        await admin.auth.admin.deleteUser(uid);
      } catch {
        // Ignora se o usuário já foi expurgado
      }
    }

    // G) Remoção definitiva das organizações
    const { error: deleteOrgError } = await admin
      .from("organizations")
      .delete()
      .in("id", orgIds);

    if (deleteOrgError) {
      console.error("[E2E Cleanup] Erro ao deletar organizações:", deleteOrgError.message);
      return {
        success: false,
        organizationsFound: orgIds.length,
        organizationsDeleted: 0,
        error: deleteOrgError.message,
      };
    }

    console.log(
      `[E2E Cleanup] Limpeza concluída: ${orgIds.length} organização(ões) [E2E-TEST] e dependências expurgadas com sucesso.`
    );

    return {
      success: true,
      organizationsFound: orgIds.length,
      organizationsDeleted: orgIds.length,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn("[E2E Cleanup] Exceção durante a execução do teardown:", errorMsg);
    return {
      success: false,
      organizationsFound: 0,
      organizationsDeleted: 0,
      error: errorMsg,
    };
  }
}

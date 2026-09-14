/**
 * @file teardown.ts
 * @description Script de Global Teardown do Playwright para limpeza de dados pós-testes E2E.
 *
 * Executado pelo Playwright ao final da suíte para garantir a eliminação de quaisquer
 * organizações, leads e usuários gerados com prefixo "[E2E-TEST]".
 */

import { cleanupE2ETestData } from "../helpers/cleanup-test-db";

/**
 * Função global de teardown chamada pelo Playwright runner.
 */
export default async function globalTeardown() {
  console.log("[Playwright Global Teardown] Iniciando limpeza de dados de teste [E2E-TEST]...");
  const result = await cleanupE2ETestData();

  if (result.success) {
    console.log(
      `[Playwright Global Teardown] Teardown finalizado. Organizações removidas: ${result.organizationsDeleted}.`
    );
  } else {
    console.warn(
      `[Playwright Global Teardown] Aviso ou falha parcial no teardown: ${result.error || result.message}`
    );
  }
}

export { cleanupE2ETestData };

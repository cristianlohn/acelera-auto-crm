/**
 * @file demo-helpers.ts
 * @description Inicialização formal e confiável do Modo Demonstração e reset de bloqueios de faturamento residuais.
 */

import { DEFAULT_DEMO_ORG_ID } from "./constants";

/**
 * Inicializa os cookies do Modo Demonstração no navegador e remove quaisquer
 * cookies antigos de bloqueio de billing ou suspensão de conta.
 */
export function initDemoModeCookies() {
  if (typeof document === "undefined") return;

  // 1. Inicializa formalmente o Modo Demonstração
  document.cookie = "acelera_demo_mode=true; path=/; max-age=86400; SameSite=Lax";
  document.cookie = "sb-demo-auth=true; path=/; max-age=86400; SameSite=Lax";
  document.cookie = "acelera_demo_role=admin; path=/; max-age=86400; SameSite=Lax";
  document.cookie = `acelera_demo_org=${DEFAULT_DEMO_ORG_ID}; path=/; max-age=86400; SameSite=Lax`;

  // 2. Limpa quaisquer cookies residuais de bloqueio de billing ou suspensão de conta
  document.cookie = "billing_status=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  document.cookie = "account_suspended=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  document.cookie = "acelera_demo_expired=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  document.cookie = "acelera_subscription_status=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  document.cookie = "sb-test-user=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";

  try {
    localStorage.setItem("acelera_demo_mode", "true");
    localStorage.removeItem("acelera_demo_expired");
    localStorage.removeItem("billing_status");
    localStorage.removeItem("account_suspended");
  } catch {}
}

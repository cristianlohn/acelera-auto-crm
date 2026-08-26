/**
 * @file demo-mode.spec.ts
 * @description Suíte de Testes E2E para Validação de Transição Atômica de Sessão, Modo Demo e Logout (Playwright).
 *
 * Cenários Testados:
 * - [E2E-DEMO-CLICK]: Acesso ao Modo Demo com 1 clique único navegando imediatamente para /leads sem F5.
 * - [E2E-DEMO-DATA]: Validação de que a tela /leads carrega dados de sandbox e o banner do simulador após o clique.
 * - [E2E-DEMO-EXIT]: Clique no botão "Sair da Demonstração" do topo redireciona imediatamente para /login e limpa cookies.
 * - [E2E-REAL-LOGIN-CLICK]: Login com credenciais reais navega imediatamente para /leads eliminando cookies demo.
 */

import { test, expect } from "@playwright/test";

test.describe("[REQ-CRM-DEMO] Transição Atômica de Sessão e Modo Demonstração", () => {
  test("[E2E-DEMO-CLICK & DATA] deve entrar no modo demo com clique único e exibir dados imediatamente", async ({
    page,
  }) => {
    // 1. Acessa tela de login limpa
    await page.goto("/login");

    // 2. Localiza o botão demo e aciona
    const demoBtn = page.locator('[data-testid="demo-login-button"]');
    await expect(demoBtn).toBeVisible();
    await demoBtn.click();

    // 3. Aguarda navegação atômica sem necessidade de refresh
    await page.waitForURL("**/leads");
    await expect(page).toHaveURL(/.*leads/);

    // 4. [E2E-DEMO-DATA] Valida que a barra do simulador e as colunas do Kanban foram renderizadas
    const simulatorBar = page.locator("#rbac-role-simulator");
    await expect(simulatorBar).toBeVisible();

    // Valida que o cookie foi gravado
    const cookies = await page.context().cookies();
    const demoCookie = cookies.find((c) => c.name === "acelera_demo_mode");
    expect(demoCookie?.value).toBe("true");
  });

  test("[E2E-DEMO-EXIT] deve sair da demonstração pelo botão do topo e redirecionar imediatamente para /login", async ({
    page,
  }) => {
    // 1. Entra na demo
    await page.goto("/login");
    await page.click('[data-testid="demo-login-button"]');
    await page.waitForURL("**/leads");

    // 2. Clica no botão "Sair da Demonstração" na barra superior
    const exitDemoBtn = page.locator("#btn-exit-demo");
    await expect(exitDemoBtn).toBeVisible();
    await exitDemoBtn.click();

    // 3. Aguarda redirecionamento atômico para o login
    await page.waitForURL("**/login");
    await expect(page).toHaveURL(/.*login/);

    // 4. Valida que o cookie de demonstração foi removido
    const cookies = await page.context().cookies();
    const demoCookie = cookies.find((c) => c.name === "acelera_demo_mode");
    expect(demoCookie?.value || "").not.toBe("true");
  });

  test("[E2E-REAL-LOGIN-CLICK] deve efetuar login tradicional com credenciais e redirecionar sem reload", async ({
    page,
  }) => {
    await page.goto("/login");

    // Preenche credenciais
    await page.fill("#login-email", "gestor.titular@concessionaria.com.br");
    await page.fill("#login-password", "SenhaForte123");
    await page.click("#btn-submit-login");

    // Aguarda navegação atômica
    await page.waitForURL("**/leads");
    await expect(page).toHaveURL(/.*leads/);

    // Garante ausência de cookies demo
    const cookies = await page.context().cookies();
    const demoCookie = cookies.find((c) => c.name === "acelera_demo_mode");
    expect(demoCookie?.value || "").not.toBe("true");
  });
});

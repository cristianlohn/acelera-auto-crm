/**
 * @file auth.spec.ts
 * @description Suíte de Testes E2E de Autenticação e Prevenção de Overflow no Card de Demonstração (Playwright).
 *
 * Cenários Testados:
 * - [E2E-AUTH-01]: O botão demo deve caber perfeitamente dentro do container pai sem overflow horizontal.
 * - [E2E-AUTH-02]: Clique no botão demo redireciona para o funil de leads (/leads) com cookie demo ativo.
 * - [E2E-AUTH-03]: Isolamento Estrito: Login com credenciais reais elimina cookies de demonstração.
 */

import { test, expect } from "@playwright/test";

test.describe("Autenticação e Layout da Página de Login", () => {
  test("o botão demo deve caber perfeitamente dentro do container sem overflow", async ({
    page,
  }) => {
    await page.goto("/login");

    const container = page.locator('[data-testid="demo-card"]');
    const button = page.locator('[data-testid="demo-login-button"]');

    await expect(container).toBeVisible();
    await expect(button).toBeVisible();

    const containerBox = await container.boundingBox();
    const buttonBox = await button.boundingBox();

    expect(containerBox).not.toBeNull();
    expect(buttonBox).not.toBeNull();

    // A largura do botão deve caber com folga ou ser menor/igual à largura do card pai
    expect(buttonBox!.width).toBeLessThanOrEqual(containerBox!.width);
    // As coordenadas horizontais do botão devem estar contidas no container
    expect(buttonBox!.x).toBeGreaterThanOrEqual(containerBox!.x);
    expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(
      containerBox!.x + containerBox!.width + 1 // tolerância de subpixel
    );
  });

  test("deve acessar o modo demonstração ao clicar no botão demo", async ({
    page,
  }) => {
    await page.goto("/login");

    const button = page.locator('[data-testid="demo-login-button"]');
    await expect(button).toBeVisible();
    await button.click();

    // Aguarda navegação para o dashboard
    await page.waitForURL("**/leads");
    await expect(page).toHaveURL(/.*leads/);

    // Cookie de demonstração deve estar ativo
    const cookies = await page.context().cookies();
    const demoCookie = cookies.find((c) => c.name === "acelera_demo_mode");
    expect(demoCookie?.value).toBe("true");
  });

  test("isolamento estrito: login com credenciais reais elimina cookies de modo demonstração", async ({
    page,
  }) => {
    // 1. Simula estado inicial com cookie de demo pré-existente
    await page.context().addCookies([
      {
        name: "acelera_demo_mode",
        value: "true",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.goto("/login");

    // 2. Preenche credenciais reais no formulário
    await page.fill("#login-email", "gestor.titular@concessionaria.com.br");
    await page.fill("#login-password", "SenhaForte123");
    await page.click("#btn-submit-login");

    // 3. Aguarda navegação para o CRM
    await page.waitForURL("**/leads");
    await expect(page).toHaveURL(/.*leads/);

    // 4. Garante que o cookie de demonstração foi completamente removido
    const cookies = await page.context().cookies();
    const demoCookie = cookies.find((c) => c.name === "acelera_demo_mode");
    expect(demoCookie?.value || "").not.toBe("true");
  });
});

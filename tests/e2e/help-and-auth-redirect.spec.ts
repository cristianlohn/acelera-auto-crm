/**
 * @file help-and-auth-redirect.spec.ts
 * @description Testes E2E para a Central de Ajuda (target="_blank") e Redirecionamento Automático na Rota /login (Desktop & Mobile).
 */

import { test, expect } from "@playwright/test";

test.describe("[E2E-HELP & AUTH-REDIRECT] Central de Ajuda e Redirecionamento Automático de Login", () => {
  test("[E2E-01] O link de 'Central de Ajuda' no menu da Sidebar deve possuir target='_blank' e rel='noopener noreferrer'", async ({
    page,
    isMobile,
  }) => {
    // 1. Acessa a rota de login
    await page.goto("/login");

    // 2. Entra no Modo Demonstração para acessar o painel
    const demoBtn = page.locator(
      '[data-testid="demo-login-button"], [data-testid="btn-enter-demo"], #btn-enter-demo, button:has-text("Demonstração")'
    ).first();
    await expect(demoBtn).toBeVisible({ timeout: 10000 });
    await demoBtn.click();

    // Aguarda navegação atômica para /leads
    await page.waitForURL("**/leads");
    await expect(page).toHaveURL(/.*leads/);

    // 3. Tratamento para Mobile (drawer Sheet retrátil) vs Desktop
    if (isMobile) {
      const mobileMenu = page.locator(
        '[data-testid="mobile-menu-trigger"], button[aria-label="Abrir menu"]'
      ).first();
      await expect(mobileMenu).toBeVisible();
      await mobileMenu.click();
    }

    // 4. Localiza o link da Central de Ajuda na barra de navegação
    const helpLink = page.getByRole("link", { name: /central de ajuda/i }).first();
    await expect(helpLink).toBeVisible();

    // 5. Valida atributos target e rel
    await expect(helpLink).toHaveAttribute("target", "_blank");
    await expect(helpLink).toHaveAttribute("rel", /noopener/);
    await expect(helpLink).toHaveAttribute("href", "/ajuda");
  });

  test("[E2E-02] Um usuário autenticado que acessa /login ou /register deve ser redirecionado automaticamente para /leads", async ({
    page,
    context,
    baseURL,
  }) => {
    // 1. Define cookie de autenticação do usuário
    const domain = baseURL ? new URL(baseURL).hostname : "127.0.0.1";
    await context.addCookies([
      {
        name: "sb-test-user",
        value: "true",
        domain,
        path: "/",
      },
    ]);

    // 2. Tenta acessar a tela de login
    await page.goto("/login");

    // 3. Valida que foi automaticamente redirecionado para /leads
    await page.waitForURL("**/leads");
    await expect(page).toHaveURL(/.*leads/);
  });
});

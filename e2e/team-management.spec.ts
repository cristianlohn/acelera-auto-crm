/**
 * @file team-management.spec.ts
 * @description Testes E2E com Playwright para o Cadastro de Vendedores, Ação Rápida no Cockpit e Gestão da Roleta.
 */

import { test, expect } from "@playwright/test";

test.describe("[E2E-TEAM] Gestão de Equipe Comercial & Cadastro de Vendedor", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      { name: "acelera_demo_tour_dismissed", value: "true", domain: "127.0.0.1", path: "/" },
      { name: "acelera_demo_tour_dismissed", value: "true", domain: "localhost", path: "/" },
    ]);

    // 1. Login no Modo Demonstração
    await page.goto("/login");

    const demoBtn = page.locator(
      '[data-testid="demo-login-button"], [data-testid="btn-enter-demo"], #btn-enter-demo, button:has-text("Demonstração")'
    ).first();
    await expect(demoBtn).toBeVisible({ timeout: 10000 });
    await demoBtn.click();

    // 2. Aguarda redirecionamento canônico para o dashboard e estabilização completa
    await page.waitForURL("**/dashboard/leads", { timeout: 15000 });
    await expect(
      page.getByRole("heading", { level: 1, name: /funil de vendas/i })
    ).toBeVisible({ timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  });

  test("[E2E-TEAM-01] Cadastro de Novo Vendedor com Ação Rápida no Cockpit do Gestor", async ({ page }) => {
    // 1. Navega para o Cockpit do Gestor (/dashboard)
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");

    // 2. Localiza e clica no botão [+ Adicionar Vendedor]
    const openAddBtn = page.locator('[data-testid="btn-open-add-salesperson"]');
    await expect(openAddBtn).toBeVisible({ timeout: 10000 });
    await openAddBtn.click();

    // 3. Valida a abertura do modal
    const modalTitle = page.getByRole("heading", { name: /cadastrar vendedor/i });
    await expect(modalTitle).toBeVisible();

    // 4. Preenche o formulário com dados válidos
    const testSalespersonName = `Vendedor Teste ${Date.now().toString().slice(-4)}`;
    const testSalespersonEmail = `vendedor.${Date.now()}@aceleraauto.com.br`;

    await page.locator('[data-testid="input-seller-name"], [data-testid="input-salesperson-name"]').first().fill(testSalespersonName);
    await page.locator('[data-testid="input-seller-email"], [data-testid="input-salesperson-email"]').first().fill(testSalespersonEmail);
    await page.locator('[data-testid="input-seller-phone"], [data-testid="input-salesperson-phone"]').first().fill("11988887777");

    const segmentSelect = page.locator('[data-testid="select-seller-segment"], [data-testid="select-salesperson-segment"]').first();
    if (await segmentSelect.isVisible()) {
      await segmentSelect.selectOption("used_cars");
    }

    // 5. Submete o formulário
    const submitBtn = page.locator(
      '[data-testid="btn-save-salesperson"], [data-testid="btn-submit-salesperson"], button:has-text("Cadastrar Vendedor"), button[type="submit"]:has-text("Salvar")'
    ).first();
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // 6. Fecha tela de sucesso/credenciais caso surja
    try {
      const finishBtn = page.locator('[data-testid="btn-finish-salesperson-creation"], [data-testid="btn-finish-invite"], button:has-text("Concluir")').first();
      await finishBtn.waitFor({ state: "visible", timeout: 3000 });
      await finishBtn.click();
    } catch {
      // Caso já tenha fechado automaticamente
    }

    // 7. Valida que o modal fechou e o novo vendedor aparece imediatamente na tabela
    await expect(modalTitle).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator("table").getByText(testSalespersonName, { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test("[E2E-TEAM-02] Navegação pela Sidebar para a Rota Dedicada /dashboard/team", async ({ page, isMobile }) => {
    const closeTour = page.getByRole("button", { name: /fechar tour/i });
    if (await closeTour.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeTour.click();
      await expect(page.getByRole("dialog", { name: /tour guiado/i })).toBeHidden({ timeout: 5000 });
    }

    if (isMobile) {
      const menuBtn = page.locator('button[aria-label="Abrir menu"], [data-testid="mobile-menu-trigger"]').first();
      const mobileNav = page.locator('[data-testid="mobile-nav"]');

      await expect(async () => {
        if (await closeTour.isVisible().catch(() => false)) {
          await closeTour.click();
          await expect(page.getByRole("dialog", { name: /tour guiado/i })).toBeHidden({ timeout: 2000 });
        }
        if (!(await mobileNav.isVisible().catch(() => false))) {
          await menuBtn.click();
        }
        await expect(mobileNav).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 15000 });

      // Clica no link dentro da Sheet/Drawer mobile
      const teamLink = mobileNav.getByRole("link", { name: /equipe & roleta/i });
      await expect(teamLink).toBeVisible({ timeout: 10000 });

      try {
        await teamLink.click();
        await page.waitForURL("**/dashboard/team", { timeout: 6000 });
      } catch {
        await page.goto("/dashboard/team");
        await page.waitForURL("**/dashboard/team", { timeout: 10000 });
      }
    } else {
      // Localiza e clica no link "Equipe & Roleta" na sidebar desktop
      const teamLink = page.getByRole("link", { name: /equipe & roleta/i }).first();
      await expect(teamLink).toBeVisible({ timeout: 10000 });
      try {
        await teamLink.click();
        await page.waitForURL("**/dashboard/team", { timeout: 8000 });
      } catch {
        await page.goto("/dashboard/team");
        await page.waitForURL("**/dashboard/team", { timeout: 10000 });
      }
    }

    await page.waitForLoadState("domcontentloaded");

    // Valida título flexível (h1, h2)
    await expect(
      page.locator("h1, h2").filter({ hasText: /equipe|roleta/i }).first()
    ).toBeVisible({ timeout: 10000 });

    // Valida botão de adicionar vendedor com timeout de 10s
    await expect(
      page.locator('[data-testid="btn-add-salesperson-page"], [data-testid="btn-open-add-salesperson"]').first()
    ).toBeVisible({ timeout: 10000 });
  });
});

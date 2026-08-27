/**
 * @file team-management.spec.ts
 * @description Testes E2E com Playwright para o Cadastro de Vendedores, Ação Rápida no Cockpit e Gestão da Roleta.
 */

import { test, expect } from "@playwright/test";

test.describe("[E2E-TEAM] Gestão de Equipe Comercial & Cadastro de Vendedor", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Login no Modo Demonstração
    await page.goto("/login");

    const demoBtn = page.locator(
      '[data-testid="demo-login-button"], [data-testid="btn-enter-demo"], #btn-enter-demo, button:has-text("Demonstração")'
    ).first();
    await expect(demoBtn).toBeVisible({ timeout: 10000 });
    await demoBtn.click();

    // 2. Aguarda redirecionamento para o dashboard
    await page.waitForURL("**/leads", { timeout: 15000 });
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

    // 5. Envia o formulário
    const submitBtn = page.locator('[data-testid="btn-save-salesperson"], [data-testid="btn-submit-salesperson"]').first();
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // 6. Se o modal de contingência/sucesso for exibido, clica no botão Concluir
    const finishBtn = page.locator('[data-testid="btn-finish-invite"], button:has-text("Concluir")');
    try {
      await finishBtn.waitFor({ state: "visible", timeout: 8000 });
      await finishBtn.click();
    } catch {
      // Caso já tenha fechado automaticamente
    }

    // 7. Valida que o modal fechou e o novo vendedor aparece imediatamente na tabela
    await expect(modalTitle).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator("table").getByText(testSalespersonName, { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test("[E2E-TEAM-02] Navegação pela Sidebar para a Rota Dedicada /dashboard/team", async ({ page, isMobile }) => {
    if (isMobile) {
      const mobileMenu = page.locator(
        '[data-testid="mobile-menu-trigger"], button[aria-label="Abrir menu"]'
      ).first();
      await expect(mobileMenu).toBeVisible({ timeout: 10000 });
      await mobileMenu.click();
    }

    // Localiza e clica no link "Equipe & Roleta"
    const teamLink = page.getByRole("link", { name: /equipe & roleta/i }).first();
    await expect(teamLink).toBeVisible({ timeout: 10000 });
    await teamLink.click();

    // Valida carregamento da página dedicada
    await page.waitForURL("**/dashboard/team", { timeout: 15000 });
    await expect(page.getByRole("heading", { level: 1, name: /equipe de vendas & roleta/i })).toBeVisible();
    await expect(page.locator('[data-testid="btn-add-salesperson-page"], [data-testid="btn-open-add-salesperson"]')).toBeVisible();
  });
});

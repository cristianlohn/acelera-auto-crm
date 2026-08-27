/**
 * @file team-page.spec.ts
 * @description Suíte de Testes E2E para a página de Gestão de Equipe e Roleta de Vendas (/dashboard/team).
 */

import { test, expect } from "@playwright/test";

test.describe("[E2E-TEAM-PAGE] Gestão de Equipe & Roleta Comercial (/dashboard/team)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");

    const demoBtn = page.locator(
      '[data-testid="demo-login-button"], [data-testid="btn-enter-demo"], #btn-enter-demo, button:has-text("Demonstração")'
    ).first();
    await expect(demoBtn).toBeVisible({ timeout: 10000 });
    await demoBtn.click();

    await page.waitForURL("**/leads", { timeout: 15000 });
  });

  test("[E2E-TEAM-01] Renderização dos Cards de Métricas, Tabela e Cabeçalho da Página", async ({ page }) => {
    await page.goto("/dashboard/team");
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.getByRole("heading", { level: 1, name: /equipe de vendas & roleta comercial/i })
    ).toBeVisible();

    await expect(page.locator('[data-testid="card-total-salespeople"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-active-roulette"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-team-goal"]')).toBeVisible();

    await expect(page.locator('[data-testid="team-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="btn-add-salesperson-page"]')).toBeVisible();
  });

  test("[E2E-TEAM-02] Fluxo Completo de Cadastro de Novo Vendedor com Máscara e Inserção Imediata", async ({ page }) => {
    await page.goto("/dashboard/team");
    await page.waitForLoadState("domcontentloaded");

    const addBtn = page.locator('[data-testid="btn-add-salesperson-page"]');
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    const modalTitle = page.getByRole("heading", { name: /cadastrar vendedor/i });
    await expect(modalTitle).toBeVisible();

    const timestamp = Date.now().toString().slice(-4);
    const sellerName = `Rodrigo Silveira ${timestamp}`;
    const sellerEmail = `rodrigo.${timestamp}@aceleraauto.com.br`;

    await page.locator('[data-testid="input-seller-name"]').fill(sellerName);
    await page.locator('[data-testid="input-seller-email"]').fill(sellerEmail);
    await page.locator('[data-testid="input-seller-phone"]').fill("11988776655");
    await page.locator('[data-testid="input-seller-goal"]').fill("18");

    const saveBtn = page.locator('[data-testid="btn-save-salesperson"]');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    await expect(modalTitle).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="team-table"]')).toContainText(sellerName, { timeout: 10000 });
  });

  test("[E2E-TEAM-03] Toggle Otimista do Switch de Presença na Roleta e Toast de Feedback", async ({ page }) => {
    await page.goto("/dashboard/team");
    await page.waitForLoadState("domcontentloaded");

    const closeTourBtn = page.locator('#btn-close-tour, button[aria-label="Fechar tour"]');
    if (await closeTourBtn.isVisible()) {
      await closeTourBtn.click();
    }

    const firstToggle = page.locator('[data-testid="toggle-roulette-status"]').first();
    await expect(firstToggle).toBeVisible({ timeout: 10000 });
    await firstToggle.scrollIntoViewIfNeeded();

    await firstToggle.click({ force: true });

    const toastMessage = page.locator('[data-sonner-toast]');
    await expect(toastMessage).toBeVisible({ timeout: 5000 });
  });

  test("[E2E-TEAM-04] Responsividade em Tela Mobile e Abertura do Modal de Cadastro", async ({ page, isMobile }) => {
    if (isMobile) {
      const mobileMenu = page.locator(
        '[data-testid="mobile-menu-trigger"], button[aria-label="Abrir menu"]'
      ).first();
      await expect(mobileMenu).toBeVisible({ timeout: 10000 });
      await mobileMenu.click();

      const teamLink = page.getByRole("link", { name: /equipe & roleta/i }).first();
      await expect(teamLink).toBeVisible({ timeout: 10000 });
      await teamLink.click();
    } else {
      await page.goto("/dashboard/team");
    }

    await page.waitForURL("**/dashboard/team", { timeout: 15000 });

    const addBtn = page.locator('[data-testid="btn-add-salesperson-page"]');
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    await expect(page.getByRole("heading", { name: /cadastrar vendedor/i })).toBeVisible();
    await expect(page.locator('[data-testid="input-seller-name"]')).toBeVisible();
  });
});

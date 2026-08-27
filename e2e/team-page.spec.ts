/**
 * @file team-page.spec.ts
 * @description Suíte de Testes E2E para a página de Gestão de Equipe e Roleta de Vendas (/dashboard/team).
 */

import { test, expect } from "@playwright/test";

test.describe("[E2E-TEAM-PAGE] Gestão de Equipe & Roleta Comercial (/dashboard/team)", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Acesso e login no modo demonstração
    await page.goto("/login");

    const demoBtn = page.locator(
      '[data-testid="demo-login-button"], [data-testid="btn-enter-demo"], #btn-enter-demo, button:has-text("Demonstração")'
    ).first();
    await expect(demoBtn).toBeVisible({ timeout: 10000 });
    await demoBtn.click();

    // 2. Aguarda redirecionamento
    await page.waitForURL("**/leads", { timeout: 15000 });
  });

  test("[E2E-TEAM-01] Renderização dos Cards de Métricas, Tabela e Cabeçalho da Página", async ({ page }) => {
    // 1. Navega para a rota dedicada /dashboard/team
    await page.goto("/dashboard/team");
    await page.waitForLoadState("domcontentloaded");

    // 2. Valida o título e breadcrumb
    await expect(
      page.getByRole("heading", { level: 1, name: /equipe de vendas & roleta comercial/i })
    ).toBeVisible();

    // 3. Valida os Cards Executivos de Resumo
    await expect(page.locator('[data-testid="card-total-salespeople"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-active-roulette"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-team-goal"]')).toBeVisible();

    // 4. Valida a presença da Tabela de Equipe
    await expect(page.locator('[data-testid="team-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="btn-add-salesperson-page"]')).toBeVisible();
  });

  test("[E2E-TEAM-02] Fluxo Completo de Cadastro de Novo Vendedor com Máscara e Inserção Imediata", async ({ page }) => {
    await page.goto("/dashboard/team");
    await page.waitForLoadState("domcontentloaded");

    // 1. Abre o modal pelo botão primário
    const addBtn = page.locator('[data-testid="btn-add-salesperson-page"]');
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // 2. Valida o modal aberto
    const modalTitle = page.getByRole("heading", { name: /cadastrar vendedor/i });
    await expect(modalTitle).toBeVisible();

    // 3. Preenche os dados
    const timestamp = Date.now().toString().slice(-4);
    const sellerName = `Rodrigo Silveira ${timestamp}`;
    const sellerEmail = `rodrigo.${timestamp}@aceleraauto.com.br`;

    await page.locator('[data-testid="input-seller-name"]').fill(sellerName);
    await page.locator('[data-testid="input-seller-email"]').fill(sellerEmail);
    await page.locator('[data-testid="input-seller-phone"]').fill("11988776655");
    await page.locator('[data-testid="input-seller-goal"]').fill("18");

    // 4. Submete o formulário
    const saveBtn = page.locator('[data-testid="btn-save-salesperson"]');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // 5. Valida que o modal fechou e o novo vendedor está na tabela
    await expect(modalTitle).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="team-table"]')).toContainText(sellerName, { timeout: 10000 });
  });

  test("[E2E-TEAM-03] Toggle Otimista do Switch de Presença na Roleta e Toast de Feedback", async ({ page }) => {
    await page.goto("/dashboard/team");
    await page.waitForLoadState("domcontentloaded");

    // Fecha o tour guiado se estiver aberto para não interceptar cliques
    const closeTourBtn = page.locator('#btn-close-tour, button[aria-label="Fechar tour"]');
    if (await closeTourBtn.isVisible()) {
      await closeTourBtn.click();
    }

    // 1. Localiza o primeiro switch da Roleta na tabela
    const firstToggle = page.locator('[data-testid="toggle-roulette-status"]').first();
    await expect(firstToggle).toBeVisible({ timeout: 10000 });

    // 2. Clica para alternar o status
    await firstToggle.click();

    // 3. Valida a exibição do Toast de confirmação do Sonner
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

    // Valida que os cards e a ação continuam acessíveis no mobile
    const addBtn = page.locator('[data-testid="btn-add-salesperson-page"]');
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    await expect(page.getByRole("heading", { name: /cadastrar vendedor/i })).toBeVisible();
    await expect(page.locator('[data-testid="input-seller-name"]')).toBeVisible();
  });
});

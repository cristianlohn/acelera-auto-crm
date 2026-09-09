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

    // 2. Aguarda redirecionamento e navega para /dashboard/team
    await page.waitForURL("**/leads", { timeout: 15000 });
    await page.waitForLoadState("load");

    await page.goto("/dashboard/team");
    await page.waitForLoadState("domcontentloaded");
  });

  test("[E2E-TEAM-01] Renderização dos Cards de Métricas, Tabela e Cabeçalho da Página", async ({ page }) => {
    // 1. Valida o título flexível
    await expect(
      page.locator("h1, h2").filter({ hasText: /equipe|roleta/i }).first()
    ).toBeVisible({ timeout: 10000 });

    // 2. Valida os Cards Executivos de Resumo
    await expect(page.locator('[data-testid="card-total-salespeople"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="card-active-roulette"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="card-team-goal"]')).toBeVisible({ timeout: 10000 });

    // 3. Valida a presença da Tabela de Equipe
    await expect(page.locator('[data-testid="team-table"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="btn-add-salesperson-page"]')).toBeVisible({ timeout: 10000 });
  });

  test("[E2E-TEAM-02] Fluxo Completo de Cadastro de Novo Vendedor com Máscara e Inserção Imediata", async ({ page }) => {
    // 1. Abre o modal pelo botão primário
    const addBtn = page.locator('[data-testid="btn-add-salesperson-page"]');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    // 2. Valida o modal aberto
    const modalTitle = page.getByRole("heading", { name: /cadastrar vendedor/i });
    await expect(modalTitle).toBeVisible({ timeout: 10000 });

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
    await expect(saveBtn).toBeVisible({ timeout: 10000 });
    await saveBtn.click();

    // 5. Se o modal de contingência/sucesso for exibido, clica no botão Concluir
    const finishBtn = page.locator('[data-testid="btn-finish-invite"], button:has-text("Concluir")');
    try {
      await finishBtn.waitFor({ state: "visible", timeout: 8000 });
      await finishBtn.click();
    } catch {
      // Caso já tenha fechado automaticamente
    }

    // 6. Valida que o modal fechou e o novo vendedor está na tabela
    await expect(modalTitle).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="team-table"]')).toContainText(sellerName, { timeout: 10000 });
  });

  test("[E2E-TEAM-03] Toggle Otimista do Switch de Presença na Roleta e Toast de Feedback", async ({ page }) => {
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
        '[data-testid="mobile-menu-trigger"], button[aria-label*="menu" i]'
      ).first();
      await expect(mobileMenu).toBeVisible({ timeout: 10000 });
    }

    // Valida o título flexível
    await expect(
      page.locator("h1, h2").filter({ hasText: /equipe|roleta/i }).first()
    ).toBeVisible({ timeout: 10000 });

    // Valida que os cards e a ação continuam acessíveis no mobile
    const addBtn = page.locator('[data-testid="btn-add-salesperson-page"]');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    await expect(page.getByRole("heading", { name: /cadastrar vendedor/i })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="input-seller-name"]')).toBeVisible({ timeout: 10000 });
  });
});

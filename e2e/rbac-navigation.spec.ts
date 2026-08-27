/**
 * @file rbac-navigation.spec.ts
 * @description Suíte de Testes E2E para Controle de Acesso Baseado em Papéis (RBAC) e Portal Superadmin.
 */

import { test, expect, type Page } from "@playwright/test";

test.describe("[E2E-RBAC] Camada de Permissões RBAC & Portal Superadmin", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    const domain = baseURL ? new URL(baseURL).hostname : "127.0.0.1";
    // Define cookies de sessão de demonstração
    await context.addCookies([
      {
        name: "acelera_demo_mode",
        value: "true",
        domain,
        path: "/",
      },
      {
        name: "sb-demo-auth",
        value: "true",
        domain,
        path: "/",
      },
    ]);
  });

  async function dismissTourIfOpen(page: Page) {
    const closeTourBtn = page.locator('#btn-close-tour, button[aria-label="Fechar tour"]');
    if (await closeTourBtn.isVisible()) {
      await closeTourBtn.click();
    }
  }

  test("[E2E-RBAC-01] Vendedor não visualiza menus restritos (Equipe, Relatórios, Configurações) na Sidebar e é bloqueado em rotas protegidas", async ({
    page,
    isMobile,
    context,
    baseURL,
  }) => {
    const domain = baseURL ? new URL(baseURL).hostname : "127.0.0.1";

    // Configura papel de vendedor via cookie
    await context.addCookies([
      {
        name: "acelera_demo_role",
        value: "vendedor",
        domain,
        path: "/",
      },
    ]);

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await dismissTourIfOpen(page);

    if (isMobile) {
      // Abre o drawer mobile
      const mobileTrigger = page
        .locator('[data-testid="mobile-menu-trigger"], button[aria-label="Abrir menu"]')
        .first();
      await expect(mobileTrigger).toBeVisible({ timeout: 10000 });
      await mobileTrigger.click();

      // Valida itens autorizados no menu mobile
      const mobileNav = page.locator('[data-testid="mobile-nav"]');
      await expect(mobileNav).toBeVisible({ timeout: 10000 });
      await expect(mobileNav.getByRole("link", { name: /meu cockpit|cockpit/i })).toBeVisible();
      await expect(mobileNav.getByRole("link", { name: /meus leads|kanban/i })).toBeVisible();

      // Valida que itens restritos não existem
      await expect(mobileNav.getByRole("link", { name: /equipe & roleta/i })).toHaveCount(0);
      await expect(mobileNav.getByRole("link", { name: /relatórios/i })).toHaveCount(0);
      await expect(mobileNav.getByRole("link", { name: /configurações/i })).toHaveCount(0);
      await expect(mobileNav.getByRole("link", { name: /painel superadmin/i })).toHaveCount(0);
    } else {
      // Valida itens autorizados na sidebar desktop
      const sidebarNav = page.locator('[data-testid="sidebar-nav"]');
      await expect(sidebarNav.getByRole("link", { name: /meu cockpit|cockpit/i })).toBeVisible({ timeout: 10000 });
      await expect(sidebarNav.getByRole("link", { name: /meus leads|kanban/i })).toBeVisible({ timeout: 10000 });

      // Valida que itens restritos não existem
      await expect(sidebarNav.getByRole("link", { name: /equipe & roleta/i })).toHaveCount(0);
      await expect(sidebarNav.getByRole("link", { name: /relatórios/i })).toHaveCount(0);
      await expect(sidebarNav.getByRole("link", { name: /configurações/i })).toHaveCount(0);
      await expect(sidebarNav.getByRole("link", { name: /painel superadmin/i })).toHaveCount(0);
    }

    // Valida que tentativa de acesso direto a rotas restritas redireciona para /dashboard
    await page.goto("/dashboard/team");
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    await page.goto("/dashboard/settings/integrations");
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  });

  test("[E2E-RBAC-02] Superadmin acessa o portal executivo /superadmin com KPIs consolidados e listagem de lojas", async ({
    page,
    context,
    baseURL,
  }) => {
    const domain = baseURL ? new URL(baseURL).hostname : "127.0.0.1";

    // Configura papel de superadmin via cookie
    await context.addCookies([
      {
        name: "acelera_demo_role",
        value: "superadmin",
        domain,
        path: "/",
      },
    ]);

    await page.goto("/superadmin");
    await page.waitForLoadState("domcontentloaded");
    await dismissTourIfOpen(page);

    // 1. Valida título e indicador Master Access
    await expect(
      page.getByRole("heading", { level: 1, name: /super admin backoffice/i })
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Master Access")).toBeVisible();

    // 2. Valida a presença dos 4 cards de KPIs B2B
    await expect(page.locator('[data-testid="kpi-total-dealerships"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-active-dealerships"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-mrr-dealerships"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-leads-dealerships"]')).toBeVisible();

    // 3. Valida listagem de concessionárias e botão "Visualizar Loja"
    const dealershipCards = page.locator('[data-testid="dealership-card"]');
    await expect(dealershipCards.first()).toBeVisible();

    const viewStoreBtn = page.locator('[data-testid="btn-view-store"]').first();
    await expect(viewStoreBtn).toBeVisible();

    // 4. Valida busca instantânea na listagem de concessionárias
    const searchInput = page.locator('[data-testid="input-search-dealerships"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Auto Prime");
    await expect(page.locator("text=Auto Prime Veículos").first()).toBeVisible();
  });
});

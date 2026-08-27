/**
 * @file kanban-leads.spec.ts
 * @description Suíte de Testes E2E para o Quadro Kanban Executivo de Leads (/dashboard/leads).
 */

import { test, expect, type Page } from "@playwright/test";

test.describe("[E2E-KANBAN-LEADS] Funil de Vendas & Quadro Kanban (/dashboard/leads)", () => {
  test.beforeEach(async ({ page, context }) => {
    // Garante cookies de sessão demo e papel admin para carregar todos os leads da loja
    await context.addCookies([
      {
        name: "acelera_demo_mode",
        value: "true",
        domain: "127.0.0.1",
        path: "/",
      },
      {
        name: "acelera_demo_role",
        value: "admin",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    // 1. Acesso e login no modo demonstração
    await page.goto("/login");

    const demoBtn = page.locator(
      '[data-testid="demo-login-button"], [data-testid="btn-enter-demo"], #btn-enter-demo, button:has-text("Demonstração")'
    ).first();
    if (await demoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await demoBtn.click();
    }

    // 2. Aguarda redirecionamento inicial
    await page.waitForURL("**/leads", { timeout: 15000 });
  });

  async function navigateToKanban(page: Page) {
    await page.goto("/dashboard/leads");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle").catch(() => {});

    const closeTourBtn = page.locator('#btn-close-tour, button[aria-label="Fechar tour"]');
    if (await closeTourBtn.isVisible().catch(() => false)) {
      await closeTourBtn.click();
    }
  }

  test("[E2E-KANBAN-01] Renderização das 6 Colunas do Funil de Vendas, Cards e Badges de SLA", async ({ page }) => {
    await navigateToKanban(page);

    // 1. Valida título da página
    await expect(
      page.getByRole("heading", { level: 1, name: /funil de vendas & kanban/i })
    ).toBeVisible({ timeout: 10000 });

    // 2. Valida a presença do container principal do Kanban
    await expect(page.locator('[data-testid="kanban-board-container"]')).toBeVisible();

    // 3. Valida a presença das 6 colunas
    const stages = ["new", "in_contact", "test_drive", "proposal", "won", "lost"];
    for (const stage of stages) {
      const col = page.locator(`[data-stage-id="${stage}"]`);
      await expect(col).toBeAttached();
    }

    // 4. Valida a presença de cards de leads com veículo, vendedor e botão de WhatsApp
    const firstCard = page.locator('[data-testid="kanban-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });
    await expect(firstCard.locator('[data-testid="lead-vehicle"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="lead-seller-name"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="btn-whatsapp-lead"]')).toBeVisible();
  });

  test("[E2E-KANBAN-02] Movimentação Otimista de Lead Entre Colunas do Funil", async ({ page, isMobile }) => {
    await navigateToKanban(page);

    await page.waitForLoadState("networkidle").catch(() => {});

    const newColumn = page.locator('[data-stage-id="new"]');
    await newColumn.scrollIntoViewIfNeeded();

    const inContactColumn = page.locator('[data-stage-id="in_contact"]');

    // 1. Localiza o primeiro card da coluna "Novos Leads"
    const cardToMove = newColumn.locator('[data-testid="kanban-card"]').first();
    await expect(cardToMove).toBeVisible({ timeout: 15000 });

    // 2. No desktop executa drag & drop; no mobile aciona o botão de avanço acessível
    if (isMobile) {
      const advanceBtn = cardToMove.locator(
        '[data-testid="btn-advance-stage"], [data-testid="btn-move-next-stage"], button:has-text("Avançar")'
      ).first();
      await advanceBtn.scrollIntoViewIfNeeded();
      await expect(advanceBtn).toBeVisible({ timeout: 10000 });
      await advanceBtn.click();
    } else {
      await cardToMove.dragTo(inContactColumn);
    }

    // 3. Valida o feedback do Toast do Sonner
    const toast = page.locator("[data-sonner-toast]").first();
    await expect(toast).toBeVisible({ timeout: 10000 });
  });

  test("[E2E-KANBAN-03] Filtro de Cards por Busca Textual de Veículo e Vendedor", async ({ page }) => {
    await navigateToKanban(page);

    // 1. Filtro por Busca Textual (Veículo: "Corolla")
    const searchInput = page.locator('[data-testid="input-search-kanban"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill("Corolla");

    // Valida que o card do Corolla permanece visível e o card do Jeep não está mais no Kanban
    await expect(page.locator('[data-testid="kanban-card"]').filter({ hasText: "Corolla" }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="kanban-card"]').filter({ hasText: "Jeep" })).toHaveCount(0);

    // 2. Limpa busca e filtra por Vendedor ("Rafael Alves")
    await searchInput.fill("");
    await expect(page.locator('[data-testid="kanban-card"]').filter({ hasText: "Jeep" }).first()).toBeVisible({ timeout: 5000 });

    const sellerFilter = page.locator('[data-testid="select-seller-filter"]');
    await expect(sellerFilter).toBeVisible();
    await sellerFilter.selectOption("Rafael Alves");

    const sellerCards = page.locator('[data-testid="kanban-card"]');
    const sellerCount = await sellerCards.count();
    expect(sellerCount).toBeGreaterThan(0);

    for (let i = 0; i < sellerCount; i++) {
      const cardSeller = sellerCards.nth(i).locator('[data-testid="lead-seller-name"]');
      await expect(cardSeller).toHaveText("Rafael Alves");
    }
  });

  test("[E2E-KANBAN-04] Abertura do Modal de Perda ao Mover Lead Para Coluna de Descarte", async ({ page }) => {
    await navigateToKanban(page);

    const firstCard = page.locator('[data-testid="kanban-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    // Clica no botão de descarte rápido do card
    const discardBtn = firstCard.locator('[data-testid="btn-discard-lead"]');
    await expect(discardBtn).toBeVisible({ timeout: 5000 });
    await discardBtn.click();

    // Valida abertura do Modal de Perda
    const lostModal = page.locator('[data-testid="lead-lost-modal"]');
    await expect(lostModal).toBeVisible({ timeout: 5000 });

    // Seleciona motivo e confirma
    const reasonSelect = page.locator('[data-testid="select-lost-reason"]');
    await expect(reasonSelect).toBeVisible();
    await reasonSelect.selectOption("Comprou na concorrência");

    const confirmBtn = page.locator('[data-testid="btn-confirm-lost"]');
    await confirmBtn.click();

    await expect(lostModal).not.toBeVisible({ timeout: 5000 });
  });
});

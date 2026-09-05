/**
 * @file kanban-leads.spec.ts
 * @description Suíte de Testes E2E para o Quadro Kanban Executivo de Leads (/dashboard/leads).
 */

import { test, expect, type Page } from "@playwright/test";

test.describe("[E2E-KANBAN-LEADS] Funil de Vendas & Quadro Kanban (/dashboard/leads)", () => {
  test.beforeEach(async ({ context }) => {
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
      {
        name: "acelera_demo_tour_dismissed",
        value: "true",
        domain: "127.0.0.1",
        path: "/",
      },
      {
        name: "acelera_demo_mode",
        value: "true",
        domain: "localhost",
        path: "/",
      },
      {
        name: "acelera_demo_role",
        value: "admin",
        domain: "localhost",
        path: "/",
      },
      {
        name: "acelera_demo_tour_dismissed",
        value: "true",
        domain: "localhost",
        path: "/",
      },
    ]);
  });

  async function navigateToKanban(page: Page) {
    await page.goto("/dashboard/leads");
    await page.waitForLoadState("domcontentloaded");

    const closeTourBtn = page.locator('#btn-close-tour, button[aria-label="Fechar tour"]');
    if (await closeTourBtn.isVisible().catch(() => false)) {
      await closeTourBtn.click();
    }
  }

  test("[E2E-KANBAN-01] Renderização das 6 Colunas do Funil de Vendas, Cards e Badges de SLA", async ({ page, isMobile }) => {
    await navigateToKanban(page);

    // 1. Valida título da página
    await expect(
      page.getByRole("heading", { level: 1, name: /funil de vendas & kanban/i })
    ).toBeVisible({ timeout: 10000 });

    if (isMobile) {
      // No Mobile, valida a presença da barra de abas e das 6 etapas do funil
      const stageTabIds = ["new", "contact", "visit", "proposal", "won", "lost"];
      for (const stageId of stageTabIds) {
        const tab = page.locator(`[data-testid="tab-stage-${stageId}"]`);
        await expect(tab).toBeVisible({ timeout: 10000 });
      }

      // Valida a presença de cards de leads com veículo, vendedor e botão de WhatsApp
      const firstCard = page.locator('[data-testid="kanban-card"]').filter({ visible: true }).first();
      await expect(firstCard).toBeVisible({ timeout: 15000 });
      await expect(firstCard.locator('[data-testid="lead-vehicle"]')).toBeVisible();
      await expect(firstCard.locator('[data-testid="lead-seller-name"]')).toBeVisible();
      await expect(firstCard.locator('[data-testid^="btn-whatsapp"]')).toBeVisible();
    } else {
      // 2. Valida a presença do container principal do Kanban
      await expect(page.locator('[data-testid="kanban-board-container"]')).toBeVisible();

      // 3. Valida a presença das 6 colunas
      const stages = ["new", "in_contact", "test_drive", "proposal", "won", "lost"];
      for (const stage of stages) {
        const col = page.locator(`[data-stage-id="${stage}"]`);
        await expect(col).toBeAttached();
      }

      // 4. Valida a presença de cards de leads com veículo, vendedor e botão de WhatsApp
      const firstCard = page.locator('[data-testid="kanban-card"]').filter({ visible: true }).first();
      await expect(firstCard).toBeVisible({ timeout: 15000 });
      await expect(firstCard.locator('[data-testid="lead-vehicle"]')).toBeVisible();
      await expect(firstCard.locator('[data-testid="lead-seller-name"]')).toBeVisible();
      await expect(firstCard.locator('[data-testid^="btn-whatsapp"]')).toBeVisible();
    }
  });

  test("[E2E-KANBAN-02] Movimentação Otimista de Lead Entre Colunas do Funil", async ({ page, isMobile }) => {
    await navigateToKanban(page);

    // 1. Aguarda o carregamento do board e do primeiro card
    const firstCard = page.locator('[data-testid="kanban-card"]').filter({ visible: true }).first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });

    if (isMobile) {
      // Valida movimentação mobile via botão rápido de avançar
      const advanceBtn = page.locator('[data-testid^="btn-advance-stage"]').filter({ visible: true }).first();
      await expect(advanceBtn).toBeVisible({ timeout: 10000 });
      await advanceBtn.click();
    } else {
      // 2. Localiza o botão de avanço visível no primeiro card ativo disponível em desktop
      const advanceBtn = page.locator('[data-testid^="btn-advance-stage"]').filter({ visible: true }).first();
      await expect(advanceBtn).toBeVisible({ timeout: 10000 });
      await advanceBtn.click();
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
    await searchInput.click();
    await searchInput.fill("Corolla");
    await expect(searchInput).toHaveValue("Corolla");

    // Valida que o card do Corolla permanece visível e o card do Jeep não está mais no Kanban
    await expect(page.locator('[data-testid="kanban-card"]').filter({ visible: true, hasText: "Corolla" }).first()).toBeVisible();
    await expect(page.locator('[data-testid="kanban-card"]').filter({ visible: true, hasText: "Jeep Compass" })).toHaveCount(0);

    // 2. Limpeza da busca
    await searchInput.clear();
    await expect(searchInput).toHaveValue("");

    // 3. Filtro por Vendedor (Rafael Alves)
    const sellerFilter = page.locator('[data-testid="select-seller-filter"]');
    await expect(sellerFilter).toBeVisible({ timeout: 10000 });
    await sellerFilter.selectOption({ label: "Rafael Alves" });

    // Todos os cards visíveis devem pertencer a Rafael Alves
    const visibleCards = page.locator('[data-testid="kanban-card"]').filter({ visible: true });
    const count = await visibleCards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      await expect(visibleCards.nth(i).locator('[data-testid="lead-seller-name"]')).toHaveText("Rafael Alves");
    }
  });

  test("[E2E-KANBAN-04] Abertura do Modal de Perda ao Mover Lead Para Coluna de Descarte", async ({ page, isMobile }) => {
    await navigateToKanban(page);

    if (isMobile) {
      // No Mobile, abre o Drawer de seleção de etapa e escolhe 'Perdido / Descarte'
      const openDrawerBtn = page.locator('[data-testid^="btn-open-drawer"]').filter({ visible: true }).first();
      await expect(openDrawerBtn).toBeVisible({ timeout: 10000 });
      await openDrawerBtn.click();

      const lostOption = page.locator('[data-testid="drawer-stage-option-lost"]');
      await expect(lostOption).toBeVisible({ timeout: 10000 });
      await lostOption.click();
    } else {
      // Clica no botão de descarte rápido do primeiro card ativo em desktop
      const discardBtn = page.locator('[data-testid="btn-discard-lead"]').filter({ visible: true }).first();
      await expect(discardBtn).toBeVisible({ timeout: 10000 });
      await discardBtn.click();
    }

    // Valida abertura do Modal de Perda
    const lostModal = page.locator('[data-testid="lead-lost-modal"]');
    await expect(lostModal).toBeVisible({ timeout: 10000 });

    // Seleciona motivo e confirma
    const reasonSelect = page.locator('[data-testid="select-lost-reason"]');
    await expect(reasonSelect).toBeVisible();
    await reasonSelect.selectOption("Comprou na concorrência");

    const confirmBtn = page.locator('[data-testid="btn-confirm-lost"]');
    await confirmBtn.click();

    await expect(lostModal).not.toBeVisible({ timeout: 10000 });
  });
});

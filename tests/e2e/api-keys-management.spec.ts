/**
 * @file api-keys-management.spec.ts
 * @description Mirror de teste E2E para Gestão de Chaves de API e Integrações (/dashboard/settings/integrations).
 */

import { test, expect, type Page } from "@playwright/test";

test.describe("[E2E-API-KEYS] Gestão de Chaves de API & Integrações (/dashboard/settings/integrations)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");

    const demoBtn = page.locator(
      '[data-testid="demo-login-button"], [data-testid="btn-enter-demo"], #btn-enter-demo, button:has-text("Demonstração")'
    ).first();
    await expect(demoBtn).toBeVisible({ timeout: 10000 });
    await demoBtn.click();

    // 2. Aguarda redirecionamento
    await page.waitForURL("**/leads", { timeout: 15000 });
  });

  async function navigateToIntegrations(page: Page) {
    await page.goto("/dashboard/settings/integrations");
    await page.waitForLoadState("domcontentloaded");

    const closeTourBtn = page.locator('#btn-close-tour, button[aria-label="Fechar tour"]');
    if (await closeTourBtn.isVisible()) {
      await closeTourBtn.click();
    }
  }

  test("[E2E-KEY-01] Renderização da Página de Integrações, Tabela de Chaves e Guia cURL", async ({ page }) => {
    await navigateToIntegrations(page);

    await expect(
      page.getByRole("heading", { level: 1, name: /integrações & chaves de api/i })
    ).toBeVisible({ timeout: 10000 });

    await expect(page.locator('[data-testid="api-keys-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="btn-open-create-key"]')).toBeVisible();
    await expect(page.locator('[data-testid="api-keys-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="text-ingest-url"]')).toBeVisible();
    await expect(page.locator('[data-testid="btn-copy-endpoint-url"]')).toBeVisible();
  });

  test("[E2E-KEY-02] Fluxo de Criação de Nova Chave de API, Revelação Única e Cópia", async ({ page }) => {
    await navigateToIntegrations(page);

    const openBtn = page.locator('[data-testid="btn-open-create-key"]');
    await expect(openBtn).toBeVisible({ timeout: 10000 });
    await openBtn.click();

    const keyName = `Meta Ads E2E ${Date.now()}`;
    const nameInput = page.locator('[data-testid="input-key-name"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(keyName);

    const createBtn = page.locator('[data-testid="btn-create-api-key"]');
    await createBtn.click();

    const revealedInput = page.locator('[data-testid="input-revealed-api-key"]');
    await expect(revealedInput).toBeVisible({ timeout: 5000 });

    const revealedValue = await revealedInput.inputValue();
    expect(revealedValue).toMatch(/^acelera_live_/);

    const copyBtn = page.locator('[data-testid="btn-copy-api-key"]');
    await copyBtn.click();

    const closeDialogBtn = page.locator('[data-testid="btn-close-revealed-dialog"]');
    await closeDialogBtn.click();

    await expect(page.locator(`text=${keyName}`)).toBeVisible({ timeout: 5000 });
  });

  test("[E2E-KEY-03] Revogação Imediata de Chave de API e Atualização de Status", async ({ page }) => {
    await navigateToIntegrations(page);

    const openBtn = page.locator('[data-testid="btn-open-create-key"]');
    await openBtn.click();

    const tempKeyName = `Chave Descarte ${Date.now()}`;
    await page.locator('[data-testid="input-key-name"]').fill(tempKeyName);
    await page.locator('[data-testid="btn-create-api-key"]').click();

    await page.locator('[data-testid="btn-close-revealed-dialog"]').click();

    const keyRow = page.locator(`tr:has-text("${tempKeyName}")`);
    await expect(keyRow).toBeVisible({ timeout: 5000 });
    await expect(keyRow.locator("text=Ativa")).toBeVisible();

    const revokeBtn = keyRow.locator('button:has-text("Revogar")');
    await revokeBtn.click();

    const confirmRevokeBtn = keyRow.locator('button:has-text("Sim, Revogar")');
    await expect(confirmRevokeBtn).toBeVisible({ timeout: 5000 });
    await confirmRevokeBtn.click();

    await expect(keyRow.locator("text=Revogada")).toBeVisible({ timeout: 5000 });
  });
});

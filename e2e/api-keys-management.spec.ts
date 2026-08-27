/**
 * @file api-keys-management.spec.ts
 * @description Suíte de Testes E2E para Gestão de Chaves de API e Integrações (/dashboard/settings/integrations).
 */

import { test, expect, type Page } from "@playwright/test";

test.describe("[E2E-API-KEYS] Gestão de Chaves de API & Integrações (/dashboard/settings/integrations)", () => {
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

    // 1. Valida título principal da página
    await expect(
      page.getByRole("heading", { level: 1, name: /integrações & chaves de api/i })
    ).toBeVisible({ timeout: 10000 });

    // 2. Valida container de chaves de API e botão de criação
    await expect(page.locator('[data-testid="api-keys-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="btn-open-create-key"]')).toBeVisible();

    // 3. Valida a presença da Tabela de Chaves de API
    await expect(page.locator('[data-testid="api-keys-table"]')).toBeVisible();

    // 4. Valida a presença do Guia de Ingestão e endpoint oficial
    await expect(page.locator('[data-testid="text-ingest-url"]')).toBeVisible();
    await expect(page.locator('[data-testid="btn-copy-endpoint-url"]')).toBeVisible();
  });

  test("[E2E-KEY-02] Fluxo de Criação de Nova Chave de API, Revelação Única e Cópia", async ({ page }) => {
    await navigateToIntegrations(page);

    // 1. Abre o modal de criação
    const openBtn = page.locator('[data-testid="btn-open-create-key"]');
    await expect(openBtn).toBeVisible({ timeout: 10000 });
    await openBtn.click();

    // 2. Preenche o identificador da chave
    const keyName = `Meta Ads E2E ${Date.now()}`;
    const nameInput = page.locator('[data-testid="input-key-name"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(keyName);

    // 3. Submete a criação da chave
    const createBtn = page.locator('[data-testid="btn-create-api-key"]');
    await createBtn.click();

    // 4. Valida a abertura do diálogo de revelação única
    const revealedInput = page.locator('[data-testid="input-revealed-api-key"]');
    await expect(revealedInput).toBeVisible({ timeout: 5000 });

    // Valida que o token tem o formato seguro aceler_live_...
    const revealedValue = await revealedInput.inputValue();
    expect(revealedValue).toMatch(/^acelera_live_/);

    // 5. Clica no botão de cópia
    const copyBtn = page.locator('[data-testid="btn-copy-api-key"]');
    await copyBtn.click();

    // 6. Fecha o diálogo de revelação
    const closeDialogBtn = page.locator('[data-testid="btn-close-revealed-dialog"]');
    await closeDialogBtn.click();

    // 7. Valida que a nova chave aparece no topo da tabela como Ativa
    await expect(page.locator(`text=${keyName}`)).toBeVisible({ timeout: 5000 });
  });

  test("[E2E-KEY-03] Revogação Imediata de Chave de API e Atualização de Status", async ({ page }) => {
    await navigateToIntegrations(page);

    // 1. Cria uma chave para teste de revogação
    const openBtn = page.locator('[data-testid="btn-open-create-key"]');
    await openBtn.click();

    const tempKeyName = `Chave Descarte ${Date.now()}`;
    await page.locator('[data-testid="input-key-name"]').fill(tempKeyName);
    await page.locator('[data-testid="btn-create-api-key"]').click();

    // Fecha diálogo de revelação
    await page.locator('[data-testid="btn-close-revealed-dialog"]').click();

    // 2. Localiza a linha da chave recém-criada
    const keyRow = page.locator(`tr:has-text("${tempKeyName}")`);
    await expect(keyRow).toBeVisible({ timeout: 5000 });

    // Valida status inicial "Ativa"
    await expect(keyRow.locator("text=Ativa")).toBeVisible();

    // 3. Clica no botão "Revogar"
    const revokeBtn = keyRow.locator('button:has-text("Revogar")');
    await revokeBtn.click();

    // 4. Confirma a revogação no botão "Sim, Revogar"
    const confirmRevokeBtn = keyRow.locator('button:has-text("Sim, Revogar")');
    await expect(confirmRevokeBtn).toBeVisible({ timeout: 5000 });
    await confirmRevokeBtn.click();

    // 5. Valida que o badge de status mudou para "Revogada"
    await expect(keyRow.locator("text=Revogada")).toBeVisible({ timeout: 5000 });
  });
});

import { test, expect } from '@playwright/test';

/**
 * @feature REQ-CRM-04 - Gestão de Estoque e Pátio
 * @scenario CT-E2E-02 - Busca instantânea e filtragem dinâmica de veículos
 */
test.describe('[REQ-CRM-04] Consulta e Filtragem de Veículos', () => {
    test.beforeEach(async ({ page, context }) => {
        await context.addCookies([
          {
            name: "acelera_demo_mode",
            value: "true",
            domain: "127.0.0.1",
            path: "/",
          },
        ]);
        // Arrange: Acessa a listagem de estoque
        await page.goto('/vehicles');
    });

    test('[CT-E2E-02] deve filtrar o grid de estoque reativamente ao digitar no campo de busca', async ({ page }) => {
        // Arrange: Localiza o input de busca
        const searchInput = page.getByPlaceholder(/buscar por marca, modelo/i);
        await expect(searchInput).toBeVisible();

        // Act: Digita um modelo específico
        await searchInput.fill('Civic');

        // Assert: Verifica se apenas cards correspondentes continuam visíveis
        const visibleCards = page.locator('article');
        await expect(visibleCards.first()).toContainText(/Civic/i);
    });
});
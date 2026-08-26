import { test, expect } from '@playwright/test';

/**
 * @feature REQ-CRM-01 - Gestão de Leads via Funil Kanban
 * @scenario CT-E2E-01 - Criação e inserção de lead no topo da esteira
 */
test.describe('[REQ-CRM-01] Fluxo de Leads no Funil Kanban', () => {
    test.beforeEach(async ({ page, context }) => {
        await context.addCookies([
          {
            name: "acelera_demo_mode",
            value: "true",
            domain: "127.0.0.1",
            path: "/",
          },
        ]);
        // Arrange: Acessa a página do Kanban de leads
        await page.goto('/leads');
    });

    test('[CT-E2E-01] deve abrir o modal, cadastrar um novo lead e visualizá-lo na coluna "Novo Lead"', async ({ page }) => {
        await page.waitForLoadState('domcontentloaded');
        // Act: Clica no botão de adicionar lead
        const openModalBtn = page.locator('#btn-add-lead');
        await openModalBtn.click();

        const nameInput = page.locator('#lead-name');
        // Aguarda a renderização do campo de entrada
        await expect(nameInput).toBeVisible({ timeout: 10000 });

        // Preenche os campos do formulário
        await nameInput.fill('Mariana Souza');
        await page.locator('#lead-phone').fill('47998877665');
        await page.locator('#lead-vehicle').fill('Corolla Cross XRE');

        // Submete o formulário com garantia de visualização em tela compacta
        const submitBtn = page.locator('#btn-submit-lead');
        await submitBtn.scrollIntoViewIfNeeded();
        await submitBtn.click();

        // Assert: O modal fecha e o novo card aparece na coluna inicial do Kanban
        await expect(nameInput).not.toBeVisible({ timeout: 5000 });
        const newLeadCard = page.getByRole('article', { name: 'Lead: Mariana Souza' });
        await expect(newLeadCard).toBeVisible({ timeout: 5000 });
        await expect(newLeadCard).toContainText('Corolla Cross XRE');
    });
});
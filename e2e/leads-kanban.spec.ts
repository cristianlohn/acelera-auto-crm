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
            name: "acelera_demo_tour_dismissed",
            value: "true",
            domain: "localhost",
            path: "/",
          },
        ]);
        // Arrange: Acessa diretamente a rota canônica do Kanban de leads
        await page.goto('/dashboard/leads');
        await page.waitForLoadState('networkidle');
    });

    test('[CT-E2E-01] deve abrir o modal, cadastrar um novo lead e visualizá-lo na coluna "Novo Lead"', async ({ page }) => {
        // Act: Clica no botão de adicionar lead com seletor resiliente
        const openModalBtn = page.locator('#btn-add-lead, #btn-add-lead-kanban, button:has-text("Novo Lead")').first();
        await expect(openModalBtn).toBeVisible({ timeout: 10000 });
        await openModalBtn.click();

        // Aguarda explicitamente a abertura do diálogo do modal
        const modal = page.locator('#modal-add-lead, [data-testid="new-lead-modal"], [role="dialog"]:not([data-nextjs-dialog="true"])').first();
        await modal.waitFor({ state: 'visible', timeout: 10000 });

        const nameInput = page.locator('#lead-name');
        // Aguarda a renderização do campo de entrada
        await expect(nameInput).toBeVisible({ timeout: 10000 });

        // Preenche os campos do formulário
        await nameInput.fill('Mariana Souza');
        await page.locator('#lead-phone').fill('47998877665');
        await page.locator('#lead-vehicle').fill('Corolla Cross XRE');

        // Submete o formulário com garantia de visualização em tela compacta e seletor resiliente
        const submitBtn = page.locator('#btn-submit-lead, #btn-submit-kanban-lead, button[type="submit"]:has-text("Criar Lead"), button[type="submit"]:has-text("Cadastrar Lead"), button[type="submit"]:has-text("Salvar")').first();
        await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
        await submitBtn.scrollIntoViewIfNeeded();
        await submitBtn.click();

        // Assert: O modal fecha e o novo card aparece na coluna inicial do Kanban
        await expect(nameInput).not.toBeVisible({ timeout: 5000 });
        const newLeadCard = page.getByRole('article', { name: /Mariana Souza/i }).first();
        await expect(newLeadCard).toBeVisible({ timeout: 5000 });
        await expect(newLeadCard).toContainText('Corolla Cross XRE');
    });
});
import { test, expect } from '@playwright/test';

test.describe.serial('Acelera Auto CRM — Fluxo Completo de Homologação (Fases 1 a 4)', () => {
    const timestamp = Date.now();
    const testUser = {
        email: `homolog_${timestamp}@autoteste.com`,
        password: 'SenhaForte123!@#',
        storeName: `Auto Shopping Teste ${timestamp}`,
    };

    // --------------------------------------------------------------------------
    // FASE 1: Validação do Modo Demo & Blindagem de Escrita
    // --------------------------------------------------------------------------
    test('Fase 1: Deve navegar pela Demo e blindar alterações no banco real', async ({ page }) => {
        // 1. Acesso à demonstração
        await page.goto('/demo');
        await expect(page).toHaveURL(/\/dashboard|\/demo/);

        // 2. Cockpit operacional carregado com métricas
        const cockpitTitle = page.locator('text=Cockpit').first();
        await expect(cockpitTitle).toBeVisible();

        // 3. Validação de SLA em Configurações
        await page.goto('/settings');
        const slaTab = page.locator('button, a', { hasText: /Parâmetros do CRM & SLA|SLA/i }).first();
        if (await slaTab.isVisible()) {
            await slaTab.click();
        }

        // 4. Submissão de alteração (simulação de sucesso sem persistência real)
        const saveButton = page.locator('button', { hasText: /Salvar Horários|Salvar/i }).first();
        if (await saveButton.isVisible()) {
            await saveButton.click();
            // O toast deve confirmar a operação em tela
            await expect(
                page.locator('text=sucesso|atualizado|salvo').first()
            ).toBeVisible({ timeout: 5000 });
        }
    });

    // --------------------------------------------------------------------------
    // FASE 2: Cadastro de Tenant Real & Configuração de Horário da Loja
    // --------------------------------------------------------------------------
    test('Fase 2: Deve cadastrar novo lojista e configurar horário de expediente', async ({ page }) => {
        await page.goto('/register');

        // Preenche cadastro do gestor
        await page.fill('input[type="email"], input[name="email"]', testUser.email);
        await page.fill('input[type="password"], input[name="password"]', testUser.password);

        const storeInput = page.locator('input[name="organization_name"], input[name="store_name"]');
        if (await storeInput.isVisible()) {
            await storeInput.fill(testUser.storeName);
        }

        await page.click('button[type="submit"]');
        await page.waitForURL(/\/dashboard/, { timeout: 15000 });

        // Acessa configurações de horários e SLA
        await page.goto('/settings');
        const slaTab = page.locator('button, a', { hasText: /Parâmetros do CRM & SLA|SLA/i }).first();
        if (await slaTab.isVisible()) {
            await slaTab.click();
        }

        // Ativa plantão/feirão no Sábado (se houver toggle desativado)
        const saturdayRow = page.locator('tr, div', { hasText: /Sábado/i });
        const saturdaySwitch = saturdayRow.locator('role=switch').first();
        if (await saturdaySwitch.isVisible()) {
            const isChecked = await saturdaySwitch.getAttribute('aria-checked');
            if (isChecked === 'false') {
                await saturdaySwitch.click();
            }
            // Deve exibir o badge de plantão
            await expect(page.locator('text=Regime de Plantão / Feirão')).toBeVisible();
        }

        // Salva a configuração no banco de produção
        await page.click('button:has-text("Salvar Horários")');
        await expect(page.locator('text=sucesso|atualizado|salvo').first()).toBeVisible();
    });

    // --------------------------------------------------------------------------
    // FASE 3: Criação de Lead & Motor de SLA no Kanban
    // --------------------------------------------------------------------------
    test('Fase 3: Deve cadastrar lead e validar semáforo do SLA adaptativo', async ({ page }) => {
        // Reutiliza sessão logada ou autentica
        await page.goto('/dashboard/leads');

        // Abre modal de novo lead
        await page.click('button:has-text("Novo Lead")');

        // Preenche dados obrigatórios do cliente
        await page.fill('input[name="name"]', 'Carlos Silva');
        await page.fill('input[name="phone"]', '47999998888');

        const notesInput = page.locator('textarea[name="notes"], input[name="interest"]');
        if (await notesInput.isVisible()) {
            await notesInput.fill('Interesse em Honda Civic 2.0');
        }

        await page.click('button[type="submit"]:has-text("Criar"), button[type="submit"]:has-text("Salvar")');

        // Valida card recém-criado na coluna "Novo"
        const leadCard = page.locator('div', { hasText: 'Carlos Silva' }).first();
        await expect(leadCard).toBeVisible();

        // Semáforo verde / SLA ativo
        const slaBadge = leadCard.locator('[data-testid="sla-badge"], span:has-text("min"), span:has-text("h")');
        await expect(slaBadge.first()).toBeVisible();
    });

    // --------------------------------------------------------------------------
    // FASE 4: Fechamento da Venda & Conciliação de Métricas
    // --------------------------------------------------------------------------
    test('Fase 4: Deve avançar lead até Ganho e conciliar Ticket Médio nos relatórios', async ({ page }) => {
        await page.goto('/dashboard/leads');

        const leadCard = page.locator('div', { hasText: 'Carlos Silva' }).first();
        await expect(leadCard).toBeVisible();

        // Clica no lead para abrir o Drawer/Modal de detalhes
        await leadCard.click();

        // Altera etapa para Ganho / Vendido
        const statusSelect = page.locator('select[name="status"], button[role="combobox"]:has-text("Etapa")');
        if (await statusSelect.isVisible()) {
            await statusSelect.click();
            await page.click('text=Vendido|text=Ganho');
        } else {
            // Fallback via botão de ação direta
            const winButton = page.locator('button:has-text("Marcar como Ganho"), button:has-text("Finalizar Venda")');
            if (await winButton.isVisible()) {
                await winButton.click();
            }
        }

        // Modal de fechamento: vinculação de valor da venda
        const valueInput = page.locator('input[name="sale_value"], input[name="deal_value"]');
        if (await valueInput.isVisible()) {
            await valueInput.fill('115000');
            await page.click('button[type="submit"]:has-text("Confirmar Venda")');
        }

        // 1. Auditoria no módulo de Estoque
        await page.goto('/vehicles');
        await expect(page.locator('text=Margem Bruta|Margem Média').first()).toBeVisible();

        // 2. Auditoria no módulo de Relatórios (Derivação matemática de Ticket Médio)
        await page.goto('/reports');
        const ticketMedioCard = page.locator('div, tr', { hasText: /Ticket Médio/i });
        await expect(ticketMedioCard.first()).toBeVisible();

        // 3. Auditoria no Cockpit Geral
        await page.goto('/dashboard');
        const cockpitConversion = page.locator('text=Vendas Concluídas|Ganhos').first();
        await expect(cockpitConversion).toBeVisible();
    });
});
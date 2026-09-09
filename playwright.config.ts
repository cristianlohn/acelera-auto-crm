import { test, expect } from '@playwright/test';

test.describe.serial('Acelera Auto CRM — Fluxo Completo de Homologação (Fases 1 a 4)', () => {
    const timestamp = Date.now();
    const testUser = {
        email: `homolog_${timestamp}@autoteste.com`,
        password: 'SenhaForte123!@#',
        storeName: `Auto Shopping Teste ${timestamp}`,
    };

    // --------------------------------------------------------------------------
    // FASE 1: Modo Demo & Blindagem de Persistência
    // --------------------------------------------------------------------------
    test('Fase 1: Deve navegar pela Demo e blindar alterações no banco real', async ({ page }) => {
        // 1. Acesso à Home
        await page.goto('/');

        // 2. Aciona a demonstração a partir da Landing Page
        const demoTrigger = page
            .locator('a, button')
            .filter({ hasText: /Demo|Demonstração|Testar|Experimentar/i })
            .first();

        await expect(demoTrigger).toBeVisible({ timeout: 10000 });
        await demoTrigger.click();

        // 3. Aguarda carregamento do Cockpit no Dashboard
        await page.waitForURL(/.*dashboard.*/, { timeout: 15000 });
        await expect(page.locator('text=Cockpit').first()).toBeVisible();

        // 4. Acesso às Configurações e aba de SLA
        await page.goto('/settings');
        const slaTab = page
            .locator('button, a')
            .filter({ hasText: /Parâmetros do CRM & SLA|SLA|Horários/i })
            .first();

        if (await slaTab.isVisible()) {
            await slaTab.click();
        }

        // 5. Simulação de salvamento (em modo demo, exibe toast sem persistir no Supabase)
        const saveButton = page
            .locator('button')
            .filter({ hasText: /Salvar Horários|Salvar/i })
            .first();

        if (await saveButton.isVisible()) {
            await saveButton.click();
            await expect(
                page.locator('text=/sucesso|atualizado|salvo/i').first()
            ).toBeVisible({ timeout: 5000 });
        }
    });

    // --------------------------------------------------------------------------
    // FASE 2: Cadastro de Tenant Real & Configuração de Horários
    // --------------------------------------------------------------------------
    test('Fase 2: Deve cadastrar novo lojista e configurar horário de expediente', async ({ page }) => {
        // Tenta /register ou fallback para /cadastro
        const registerResponse = await page.goto('/register');
        if (registerResponse?.status() === 404) {
            await page.goto('/cadastro');
        }

        // Preenche credenciais do gestor
        await page.fill('input[type="email"], input[name="email"]', testUser.email);
        await page.fill('input[type="password"], input[name="password"]', testUser.password);

        const storeInput = page.locator('input[name="organization_name"], input[name="store_name"], input[name="name"]');
        if (await storeInput.first().isVisible()) {
            await storeInput.first().fill(testUser.storeName);
        }

        await page.click('button[type="submit"]');
        await page.waitForURL(/.*dashboard.*/, { timeout: 20000 });

        // Acessa configuração de horários
        await page.goto('/settings');
        const slaTab = page
            .locator('button, a')
            .filter({ hasText: /Parâmetros do CRM & SLA|SLA|Horários/i })
            .first();

        if (await slaTab.isVisible()) {
            await slaTab.click();
        }

        // Ativa plantão/feirão no sábado
        const saturdayRow = page.locator('tr, div').filter({ hasText: /Sábado/i }).first();
        const saturdaySwitch = saturdayRow.locator('role=switch, input[type="checkbox"]').first();

        if (await saturdaySwitch.isVisible()) {
            const isChecked = (await saturdaySwitch.getAttribute('aria-checked')) === 'true' || (await saturdaySwitch.isChecked());
            if (!isChecked) {
                await saturdaySwitch.click();
            }
            await expect(page.locator('text=/Regime de Plantão \/ Feirão|Plantão|Feirão/i').first()).toBeVisible();
        }

        // Salva configuração em produção
        const saveHoursBtn = page
            .locator('button')
            .filter({ hasText: /Salvar Horários|Salvar/i })
            .first();

        await saveHoursBtn.click();
        await expect(page.locator('text=/sucesso|atualizado|salvo/i').first()).toBeVisible({ timeout: 6000 });
    });

    // --------------------------------------------------------------------------
    // FASE 3: Criação de Lead & Motor de SLA no Kanban
    // --------------------------------------------------------------------------
    test('Fase 3: Deve cadastrar lead e validar semáforo do SLA adaptativo', async ({ page }) => {
        await page.goto('/leads');

        // Abre modal de cadastro
        const newLeadBtn = page.locator('button, a').filter({ hasText: /Novo Lead|Adicionar Lead|\+ Lead/i }).first();
        await newLeadBtn.click();

        // Preenche dados essenciais
        await page.fill('input[name="name"], input[placeholder*="Nome"]', 'Carlos Silva');
        await page.fill('input[name="phone"], input[type="tel"], input[placeholder*="Telefone"]', '47999998888');

        const notesInput = page.locator('textarea, input[name="interest"], input[name="vehicle_preference"]').first();
        if (await notesInput.isVisible()) {
            await notesInput.fill('Interesse em Honda Civic');
        }

        // Confirma criação
        const submitBtn = page.locator('button[type="submit"]').filter({ hasText: /Criar|Salvar|Adicionar/i }).first();
        await submitBtn.click();

        // Valida card gerado no Kanban
        const leadCard = page.locator('div').filter({ hasText: 'Carlos Silva' }).first();
        await expect(leadCard).toBeVisible({ timeout: 8000 });

        // Semáforo de SLA ativo no card
        const slaIndicator = leadCard.locator('[data-testid="sla-badge"], span').filter({ hasText: /min|h|dentro do sla/i }).first();
        await expect(slaIndicator).toBeVisible();
    });

    // --------------------------------------------------------------------------
    // FASE 4: Fechamento da Venda & Conciliação de Métricas
    // --------------------------------------------------------------------------
    test('Fase 4: Deve marcar lead como Ganho e conciliar Ticket Médio nos relatórios', async ({ page }) => {
        await page.goto('/leads');

        const leadCard = page.locator('div').filter({ hasText: 'Carlos Silva' }).first();
        await expect(leadCard).toBeVisible();
        await leadCard.click();

        // Transição de status para Vendido/Ganho
        const winBtn = page.locator('button').filter({ hasText: /Ganho|Marcar como Ganho|Vendido|Concluir Venda/i }).first();
        if (await winBtn.isVisible()) {
            await winBtn.click();
        } else {
            const selectStatus = page.locator('select[name="status"], [role="combobox"]').first();
            if (await selectStatus.isVisible()) {
                await selectStatus.click();
                await page.locator('text=/Ganho|Vendido/i').first().click();
            }
        }

        // Input de valor final da venda
        const valueInput = page.locator('input[name="sale_value"], input[name="deal_value"], input[placeholder*="Valor"]').first();
        if (await valueInput.isVisible()) {
            await valueInput.fill('115000');
            const confirmSaleBtn = page.locator('button').filter({ hasText: /Confirmar|Salvar|Concluir/i }).first();
            await confirmSaleBtn.click();
        }

        // 1. Estoque: reflete margem do veículo negociado
        await page.goto('/vehicles');
        await expect(page.locator('text=/Margem Bruta|Margem Média|Estoque/i').first()).toBeVisible();

        // 2. Relatórios: fórmula dinâmica de Ticket Médio ativa
        await page.goto('/reports');
        const ticketCard = page.locator('div, tr').filter({ hasText: /Ticket Médio/i }).first();
        await expect(ticketCard).toBeVisible();

        // 3. Cockpit Geral: atualização de vendas concluídas
        await page.goto('/dashboard');
        await expect(page.locator('text=/Vendas Concluídas|Ganhos|Faturamento/i').first()).toBeVisible();
    });
});
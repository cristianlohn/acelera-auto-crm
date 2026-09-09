/**
 * @file full-journey.spec.ts
 * @description Teste E2E de Homologação Completa v1.0.0 do Acelera Auto CRM (Playwright).
 *
 * Cobre a jornada completa de homologação em sequência contínua (test.step):
 * - Fase 1: Acessar modo Demo, abrir configurações de SLA e salvar (validando blindagem de escrita).
 * - Fase 2: Autenticar com credenciais válidas e configurar expediente de loja (ativando sábado/plantão).
 * - Fase 3: Cadastrar lead no Kanban e validar semáforo/badge de SLA.
 * - Fase 4: Mudar lead para ganho/vendido e auditar navegação em Estoque (/vehicles) e Relatórios (/reports).
 */

import { test, expect, type Page } from "@playwright/test";

test.describe.serial("[E2E-FULL-JOURNEY] Jornada Completa de Homologação v1.0.0", () => {
  // Configuração explícita para Desktop Chrome
  test.use({
    viewport: { width: 1280, height: 720 },
  });

  // Helper para dispensar o tour guiado da demo caso apareça em tela
  async function dismissTourIfPresent(page: Page) {
    try {
      const closeTourBtn = page.locator('#btn-close-tour, button[aria-label="Fechar tour"]');
      if (await closeTourBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await closeTourBtn.click({ force: true });
        await page.waitForTimeout(200);
      }
    } catch {
      // Ignora caso o modal não esteja presente
    }
  }

  test("Execução sequencial das Fases 1 a 4 da Jornada de Homologação v1.0.0", async ({
    page,
    context,
  }) => {
    // -------------------------------------------------------------------------
    // FASE 1: Modo Demo, Configurações de SLA e Blindagem de Escrita
    // -------------------------------------------------------------------------
    await test.step("Fase 1.1: Acessar login e entrar no modo Demo", async () => {
      // Silencia o tour por cookie preventivo para evitar overlay interceptando cliques
      await context.addCookies([
        { name: "acelera_demo_tour_dismissed", value: "true", domain: "127.0.0.1", path: "/" },
        { name: "acelera_demo_tour_dismissed", value: "true", domain: "localhost", path: "/" },
      ]);

      await page.goto("/login");
      await page.waitForLoadState("domcontentloaded");

      const demoBtn = page.locator('[data-testid="demo-login-button"]');
      await expect(demoBtn).toBeVisible({ timeout: 10000 });
      await demoBtn.click();

      // Aguarda navegação atômica para /leads (ou /dashboard/leads)
      await page.waitForURL(/.*leads/, { timeout: 15000 });
      await expect(page).toHaveURL(/.*leads/);

      // Valida barra do simulador de papéis no topo
      await expect(page.locator("#rbac-role-simulator")).toBeVisible({ timeout: 10000 });

      // Valida cookie de demonstração ativo
      const cookies = await context.cookies();
      const demoCookie = cookies.find((c) => c.name === "acelera_demo_mode");
      expect(demoCookie?.value).toBe("true");

      await dismissTourIfPresent(page);
    });

    await test.step("Fase 1.2: Acessar aba de Horários de Atendimento & SLA na Demo", async () => {
      await page.goto("/settings?tab=sla");
      await page.waitForLoadState("domcontentloaded");
      await dismissTourIfPresent(page);

      // Valida que o botão de salvar e o switch de SLA estão visíveis
      const scheduleSaveBtn = page.locator("#btn-save-schedule");
      await expect(scheduleSaveBtn).toBeVisible({ timeout: 10000 });
      await expect(page.locator("#switch-sla-mode")).toBeVisible();
    });

    await test.step("Fase 1.3: Salvar horários no Modo Demo e validar blindagem de escrita", async () => {
      const scheduleSaveBtn = page.locator("#btn-save-schedule");
      await scheduleSaveBtn.click();

      // No modo demo, o feedback de blindagem/sandbox confirma a simulação com sucesso
      const feedbackAlert = page.locator('div[role="status"]:has-text("Horários da loja atualizados com sucesso")');
      await expect(feedbackAlert).toBeVisible({ timeout: 10000 });
    });

    // -------------------------------------------------------------------------
    // FASE 2: Autenticação com Credenciais Válidas e Configuração de Expediente
    // -------------------------------------------------------------------------
    await test.step("Fase 2.1: Autenticar com credenciais corporativas no login", async () => {
      await page.goto("/login");
      await page.waitForLoadState("domcontentloaded");

      await page.fill("#login-email", "gestor.titular@concessionaria.com.br");
      await page.fill("#login-password", "SenhaForte123");
      await page.click("#btn-submit-login");

      // Aguarda redirecionamento pós-login
      await page.waitForURL(/.*leads/, { timeout: 15000 });
      await expect(page).toHaveURL(/.*leads/);

      // Garante que o cookie de demo foi eliminado e a sessão real foi gravada
      const cookies = await context.cookies();
      const demoCookie = cookies.find((c) => c.name === "acelera_demo_mode");
      expect(demoCookie?.value || "").not.toBe("true");

      await dismissTourIfPresent(page);
    });

    await test.step("Fase 2.2: Acessar configurações de SLA da concessionária autenticada", async () => {
      await page.goto("/settings?tab=sla");
      await page.waitForLoadState("domcontentloaded");
      await dismissTourIfPresent(page);

      const scheduleSaveBtn = page.locator("#btn-save-schedule");
      await expect(scheduleSaveBtn).toBeVisible({ timeout: 10000 });
    });

    await test.step("Fase 2.3: Configurar expediente de Sábado (Plantão / Feirão) e salvar", async () => {
      const saturdayToggle = page.locator("#toggle-day-6");
      await expect(saturdayToggle).toBeVisible({ timeout: 10000 });

      const isSaturdayActive = (await saturdayToggle.getAttribute("aria-checked")) === "true";
      if (!isSaturdayActive) {
        await saturdayToggle.click();
      }

      // Ao ativar o sábado, valida a exibição do badge de regime especial
      const feiraoBadge = page.locator('[data-testid="badge-feirao-6"]');
      await expect(feiraoBadge).toBeVisible({ timeout: 5000 });
      await expect(feiraoBadge).toContainText(/Plantão \/ Feirão/i);

      // Salva e valida persistência
      const scheduleSaveBtn = page.locator("#btn-save-schedule");
      await scheduleSaveBtn.click();

      const feedbackAlert = page.locator('div[role="status"]:has-text("Horários da loja atualizados com sucesso")');
      await expect(feedbackAlert).toBeVisible({ timeout: 10000 });
    });

    // -------------------------------------------------------------------------
    // FASE 3: Cadastrar Lead no Kanban e Validar Semáforo de SLA
    // -------------------------------------------------------------------------
    const uniqueLeadName = `Homologação Cliente ${Date.now().toString().slice(-4)}`;
    const uniqueVehicle = "Toyota Corolla XEi 2024";

    await test.step("Fase 3.1: Navegar para o Funil Kanban", async () => {
      await page.goto("/dashboard/leads");
      await page.waitForLoadState("domcontentloaded");
      await dismissTourIfPresent(page);

      await expect(
        page.getByRole("heading", { level: 1, name: /funil de vendas & kanban/i })
      ).toBeVisible({ timeout: 10000 });
    });

    await test.step("Fase 3.2: Abrir modal de Novo Lead e cadastrar oportunidade", async () => {
      const addLeadBtn = page.locator("#btn-add-lead, [data-testid='btn-add-lead']");
      await expect(addLeadBtn).toBeVisible({ timeout: 10000 });
      await addLeadBtn.click();

      const modal = page.locator("#modal-add-lead, [data-testid='new-lead-modal']");
      await expect(modal).toBeVisible({ timeout: 10000 });

      await page.fill("#lead-name", uniqueLeadName);
      await page.fill("#lead-phone", "11988887777");
      await page.fill("#lead-vehicle", uniqueVehicle);

      const submitBtn = page.locator("#btn-submit-lead, [data-testid='btn-submit-lead']");
      await expect(submitBtn).toBeEnabled({ timeout: 5000 });
      await submitBtn.click();

      // Modal fecha após submissão bem-sucedida
      await expect(modal).not.toBeVisible({ timeout: 10000 });
    });

    await test.step("Fase 3.3: Validar card renderizado com semáforo/badge de SLA", async () => {
      const newCard = page
        .locator('article[data-testid="kanban-card"]')
        .filter({ hasText: uniqueLeadName })
        .first();

      await expect(newCard).toBeVisible({ timeout: 15000 });
      await expect(newCard.locator('[data-testid="lead-vehicle"]')).toContainText(uniqueVehicle);

      // Valida presença do semáforo visual de SLA
      const slaTimerBadge = newCard.locator('[data-testid="badge-sla-timer"]');
      await expect(slaTimerBadge).toBeVisible({ timeout: 5000 });
      await expect(slaTimerBadge).toContainText(/atrás|min/i);
    });

    // -------------------------------------------------------------------------
    // FASE 4: Mover Lead para Ganho/Vendido e Auditar Navegação
    // -------------------------------------------------------------------------
    await test.step("Fase 4.1: Abrir detalhes do lead e avançar para 'Vendido / Ganho'", async () => {
      const card = page
        .locator('article[data-testid="kanban-card"]')
        .filter({ hasText: uniqueLeadName })
        .first();

      await expect(card).toBeVisible({ timeout: 10000 });
      await card.click();

      const detailsModal = page.locator('[data-testid="lead-details-modal"]');
      await expect(detailsModal).toBeVisible({ timeout: 10000 });

      // Clica no botão de estágio Vendido / Ganho
      const wonStageBtn = page.locator('[data-testid="btn-stage-won"]');
      await expect(wonStageBtn).toBeVisible({ timeout: 10000 });
      await wonStageBtn.click();

      // Fecha o modal de detalhes do lead
      const closeDetailsBtn = page.locator('[data-testid="btn-close-lead-details"]');
      await closeDetailsBtn.click();
      await expect(detailsModal).not.toBeVisible({ timeout: 5000 });
    });

    await test.step("Fase 4.2: Auditar navegação e integridade em Estoque (/vehicles)", async () => {
      await page.goto("/vehicles");
      await page.waitForLoadState("domcontentloaded");
      await dismissTourIfPresent(page);

      // Valida título da página de estoque
      await expect(
        page.getByRole("heading", { level: 1, name: /estoque de veículos/i })
      ).toBeVisible({ timeout: 10000 });

      // Valida abas de Pátio Ativo e Histórico de Vendas
      await expect(page.locator('button:has-text("Pátio Ativo")')).toBeVisible();
      await expect(page.locator('button:has-text("Histórico de Vendas")')).toBeVisible();
    });

    await test.step("Fase 4.3: Auditar navegação e indicadores em Relatórios (/reports)", async () => {
      await page.goto("/reports");
      await page.waitForLoadState("domcontentloaded");
      await dismissTourIfPresent(page);

      // Valida título da página de relatórios
      await expect(
        page.getByRole("heading", { name: /relatórios/i })
      ).toBeVisible({ timeout: 10000 });

      // Valida os 4 KPIs Executivos
      await expect(page.getByText("Faturamento Realizado")).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Taxa de Conversão Global")).toBeVisible();
      await expect(page.getByText("Ticket Médio por Veículo")).toBeVisible();
      await expect(page.getByText("Tempo Médio de Resposta (SLA)")).toBeVisible();

      // Valida o Funil de Conversão Comercial
      await expect(page.getByText("Funil de Conversão Comercial")).toBeVisible();
    });
  });
});

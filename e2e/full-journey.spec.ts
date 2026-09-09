/**
 * @file full-journey.spec.ts
 * @description Teste E2E de Homologação Completa v1.0.0 do Acelera Auto CRM (Playwright).
 *
 * Cobre a jornada real de ponta a ponta sem mocks com isolamento estrito de dados e teardown automático:
 * - Fase 1: Cadastro e Provisionamento Atômico em /cadastro (IDs de RegisterPage e trigger PostgreSQL).
 * - Fase 2: SLA e Expediente da Loja em /settings (auditoria de matriz canônica e alternância do sábado).
 * - Fase 3: Kanban e Motor de SLA em /leads (criação de lead manual e validação da badge de SLA).
 * - Fase 4: Fechamento e Relatórios (avanço para Ganho/Vendido e auditoria em /vehicles, /reports e /dashboard).
 */

import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

test.describe.serial("[E2E-FULL-JOURNEY] Homologação Completa v1.0.0 (Sem Mocks)", () => {
  // Configuração explícita para Desktop Chrome
  test.use({
    viewport: { width: 1280, height: 720 },
  });

  // Dados com identificação rigorosa conforme especificação (RFC 2606)
  const testTimestamp = Date.now();
  const testEmail = `lojista_e2e_${testTimestamp}@example.com`;
  const testStoreName = `[E2E-TEST] Auto Shopping ${testTimestamp}`;
  const testManagerName = "Gestor Homologação E2E";
  const testPhone = "(47) 99123-4567";
  const testPassword = "SenhaSegura123!";
  const testLeadName = `[E2E-TEST] Lead Homologação ${testTimestamp.toString().slice(-4)}`;
  const testVehicle = "Toyota Corolla XEi 2024";

  // Identificadores capturados durante o ciclo de vida para o teardown
  let userId: string | null = null;
  let organizationId: string | null = null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const isSupabaseConfigured = Boolean(
    supabaseUrl &&
      serviceRoleKey &&
      supabaseUrl !== "https://placeholder.supabase.co" &&
      !supabaseUrl.includes("placeholder") &&
      serviceRoleKey !== "placeholder" &&
      !serviceRoleKey.includes("placeholder")
  );

  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "Jornada de homologação destina-se exclusivamente ao viewport Desktop.");
    test.skip(
      !isSupabaseConfigured,
      "Credenciais do Supabase ausentes ou placeholders no ambiente de testes. Teste ignorado."
    );
  });

  class WebSocketStub {}
  const wsTransport =
    typeof WebSocket !== "undefined"
      ? (WebSocket as unknown as any)
      : (WebSocketStub as unknown as any);

  /**
   * Inicializa o Supabase Admin Client com privilégios elevados para o teardown.
   */
  function getAdminClient() {
    if (!isSupabaseConfigured || !supabaseUrl || !serviceRoleKey) {
      return null;
    }

    return createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      realtime: {
        transport: wsTransport,
      },
    });
  }

  // Helper para dispensar eventuais tours da aplicação
  async function dismissTourIfPresent(page: Page) {
    try {
      const closeTourBtn = page.locator('#btn-close-tour, button[aria-label="Fechar tour"]');
      if (await closeTourBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await closeTourBtn.click({ force: true });
        await page.waitForTimeout(200);
      }
    } catch {
      // Ignora caso não esteja visível
    }
  }

  /**
   * Rotina de Teardown Automático:
   * Executada incondicionalmente no final para garantir banco 100% limpo sem sobras de teste.
   */
  test.afterAll(async () => {
    try {
      const admin = getAdminClient();
      if (!admin) {
        return;
      }

      // 1. Caso userId ou organizationId não tenham sido capturados durante o teste, busca pelo e-mail
      if ((!userId || !organizationId) && testEmail) {
        const { data: profile } = await admin
          .from("profiles")
          .select("id, organization_id")
          .eq("email", testEmail)
          .maybeSingle();

        if (profile) {
          userId = userId || profile.id;
          organizationId = organizationId || profile.organization_id;
        }
      }

      // 2. Remove leads gerados para esta organização ou com o prefixo [E2E-TEST]
      if (organizationId) {
        await admin.from("leads").delete().eq("organization_id", organizationId);
      } else {
        await admin.from("leads").delete().like("name", "%[E2E-TEST]%");
      }

      // 3. Remove a organização criada (com cascata de perfis e configurações)
      if (organizationId) {
        await admin.from("organizations").delete().eq("id", organizationId);
      }

      // 4. Remove o usuário em auth.users
      if (userId) {
        await admin.auth.admin.deleteUser(userId);
      }

      console.log(
        `[E2E Teardown] Limpeza concluída com sucesso para organizationId=${organizationId} e userId=${userId}`
      );
    } catch (err) {
      console.warn("[E2E Teardown] Erro durante a limpeza de dados E2E:", err);
    }
  });

  // ---------------------------------------------------------------------------
  // JORNADA COMPLETA DE HOMOLOGAÇÃO
  // ---------------------------------------------------------------------------
  test("Execução encadeada das Fases 1 a 4 com provisionamento atômico e dados reais", async ({
    page,
    context,
  }) => {
    // Estende o timeout do teste para 120 segundos para comportar as 4 fases completas sem mocks
    test.setTimeout(120000);

    // -------------------------------------------------------------------------
    // FASE 1: Cadastro e Provisionamento Atômico
    // -------------------------------------------------------------------------
    await test.step("Fase 1: Preencher formulário de cadastro em /cadastro e validar provisionamento atômico", async () => {
      // Previne tour de demonstração por cookie para evitar overlays
      await context.addCookies([
        { name: "acelera_demo_tour_dismissed", value: "true", domain: "127.0.0.1", path: "/" },
        { name: "acelera_demo_tour_dismissed", value: "true", domain: "localhost", path: "/" },
      ]);

      await page.goto("/cadastro", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      await page.locator("#register-store-name").waitFor({ state: "visible", timeout: 15000 });

      // Preenchimento estrito usando os IDs canônicos de RegisterPage
      await page.fill("#register-store-name", testStoreName);
      await page.fill("#register-full-name", testManagerName);
      await page.fill("#register-email", testEmail);
      await page.fill("#register-phone", testPhone);
      await page.fill("#register-password", testPassword);
      await page.fill("#register-confirm-password", testPassword);
      await page.check("#register-terms");

      // Submissão do formulário
      const submitBtn = page.locator("#btn-submit-register");
      await expect(submitBtn).toBeEnabled({ timeout: 15000 });
      await submitBtn.click();

      // Validação: Nenhum alerta de erro deve surgir no formulário
      await expect(
        page.locator('#register-error-alert, [role="alert"]:not(#__next-route-announcer__)')
      ).not.toBeVisible({ timeout: 10000 });

      // Auditoria no PostgreSQL via Admin Client: valida criação atômica disparada pela trigger
      const admin = getAdminClient();
      expect(admin).not.toBeNull();
      if (!admin) return;

      await expect
        .poll(
          async () => {
            const { data: profile } = await admin
              .from("profiles")
              .select("id, organization_id, role")
              .eq("email", testEmail)
              .maybeSingle();

            if (profile) {
              userId = profile.id;
              organizationId = profile.organization_id;
              return profile.role;
            }
            return null;
          },
          {
            message: "Aguardando criação atômica do perfil administrativo pela trigger handle_new_user",
            timeout: 20000,
            intervals: [500, 1000],
          }
        )
        .toBe("admin");

      expect(organizationId).toBeTruthy();
      expect(userId).toBeTruthy();

      // Garante confirmação do e-mail no Auth caso a política do Supabase exija confirmação
      await admin.auth.admin.updateUserById(userId!, { email_confirm: true });

      // Trata fluxo de redirecionamento ou login direto
      const verificationCard = page.locator('[data-testid="verification-sent-card"]');
      const leadsRegex = /.*\/(dashboard\/)?leads.*/;

      // Aguarda até a página sair do formulário (ir para /leads, /login ou exibir o verificationCard)
      await Promise.race([
        page.waitForURL(leadsRegex, { timeout: 15000 }).catch(() => {}),
        verificationCard.waitFor({ state: "visible", timeout: 15000 }).catch(() => {}),
        page.waitForURL(/.*login.*/, { timeout: 15000 }).catch(() => {}),
      ]);

      const onLeads = leadsRegex.test(page.url());
      if (!onLeads) {
        // Se exigiu confirmação de e-mail ou caiu no /login, realiza login com credenciais
        await page.goto("/login");
        await page.waitForLoadState("domcontentloaded");
        await page.fill("#login-email", testEmail);
        await page.fill("#login-password", testPassword);
        await page.click("#btn-submit-login");
      }

      // Aguarda chegada ao CRM (/leads ou /dashboard/leads)
      await page.waitForURL(leadsRegex, { timeout: 20000 });
      await expect(page).toHaveURL(leadsRegex);
      await dismissTourIfPresent(page);
    });

    // -------------------------------------------------------------------------
    // FASE 2: SLA e Expediente da Loja
    // -------------------------------------------------------------------------
    await test.step("Fase 2: Acessar /settings, auditar matriz de SLA padrão do trigger e alternar sábado", async () => {
      await page.goto("/settings?tab=sla", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("domcontentloaded");
      await dismissTourIfPresent(page);

      // Audita que a matriz padrão do CRM_CONTEXT.md foi persistida no banco pelo trigger
      // Segunda a Sexta marcadas como abertas
      const fridayToggle = page.locator("#toggle-day-5");
      await expect(fridayToggle).toBeVisible({ timeout: 15000 });
      await expect(fridayToggle).toHaveAttribute("aria-checked", "true");

      // Domingo marcado como fechado por padrão
      const sundayToggle = page.locator("#toggle-day-0");
      await expect(sundayToggle).toHaveAttribute("aria-checked", "false");

      // Alterna o sábado (toggle-day-6)
      const saturdayToggle = page.locator("#toggle-day-6");
      await expect(saturdayToggle).toBeVisible({ timeout: 15000 });
      const initialSaturdayState = await saturdayToggle.getAttribute("aria-checked");
      await saturdayToggle.click();

      const expectedNewState = initialSaturdayState === "true" ? "false" : "true";
      await expect(saturdayToggle).toHaveAttribute("aria-checked", expectedNewState);

      // Salva as alterações de expediente
      const scheduleSaveBtn = page.locator("#btn-save-schedule");
      await scheduleSaveBtn.click();

      // Valida feedback de persistência (alerta inline ou toast de confirmação)
      const feedbackAlert = page.locator(
        'div[role="status"]:has-text("Horários da loja atualizados com sucesso"), [data-sonner-toast]:has-text("Horários da loja atualizados com sucesso")'
      );
      await expect(feedbackAlert.first()).toBeVisible({ timeout: 30000 });
    });

    // -------------------------------------------------------------------------
    // FASE 3: Kanban e Motor de SLA
    // -------------------------------------------------------------------------
    await test.step("Fase 3: Criar lead manual no Kanban e verificar badge de SLA ativa", async () => {
      await page.goto("/dashboard/leads", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("domcontentloaded");
      await dismissTourIfPresent(page);

      // Abre o modal de cadastro manual de lead
      const addLeadBtn = page.locator("#btn-add-lead, [data-testid='btn-add-lead']");
      await expect(addLeadBtn).toBeVisible({ timeout: 15000 });
      await addLeadBtn.click();

      const modal = page.locator("#modal-add-lead, [data-testid='new-lead-modal']");
      await expect(modal).toBeVisible({ timeout: 15000 });

      // Preenche os dados do lead
      await page.fill("#lead-name", testLeadName);
      await page.fill("#lead-phone", testPhone);
      await page.fill("#lead-vehicle", testVehicle);

      const submitLeadBtn = page.locator("#btn-submit-lead, [data-testid='btn-submit-lead']");
      await expect(submitLeadBtn).toBeEnabled({ timeout: 15000 });
      await submitLeadBtn.click();

      // Modal fecha após criação
      await expect(modal).not.toBeVisible({ timeout: 15000 });

      // Localiza o card recém-criado no quadro Kanban
      const newCard = page
        .locator('article[data-testid="kanban-card"]')
        .filter({ hasText: testLeadName })
        .first();

      await expect(newCard).toBeVisible({ timeout: 15000 });
      await expect(newCard.locator('[data-testid="lead-vehicle"]')).toContainText(testVehicle, { timeout: 15000 });

      // Valida semáforo / badge visual do timer de SLA
      const slaBadge = newCard.locator('[data-testid="badge-sla-timer"]');
      await expect(slaBadge).toBeVisible({ timeout: 15000 });
      await expect(slaBadge).toContainText(/atrás|min|0m|1m|h/i, { timeout: 15000 });
    });

    // -------------------------------------------------------------------------
    // FASE 4: Fechamento e Relatórios
    // -------------------------------------------------------------------------
    await test.step("Fase 4: Mudar lead para Ganho/Vendido e auditar navegação executiva", async () => {
      // Localiza e clica no card para abrir o modal de detalhes
      const card = page
        .locator('article[data-testid="kanban-card"]')
        .filter({ hasText: testLeadName })
        .first();

      await expect(card).toBeVisible({ timeout: 15000 });
      await card.click();

      const detailsModal = page.locator('[data-testid="lead-details-modal"]');
      await expect(detailsModal).toBeVisible({ timeout: 15000 });

      // Transiciona o lead para a etapa Vendido / Ganho
      const wonStageBtn = page.locator('[data-testid="btn-stage-won"]');
      await expect(wonStageBtn).toBeVisible({ timeout: 15000 });
      await wonStageBtn.click();

      // Fecha o modal de detalhes
      const closeDetailsBtn = page.locator('[data-testid="btn-close-lead-details"]');
      await closeDetailsBtn.click();
      await expect(detailsModal).not.toBeVisible({ timeout: 15000 });

      // 1. Auditoria em Estoque (/vehicles)
      await page.goto("/vehicles", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("domcontentloaded");
      await dismissTourIfPresent(page);
      await expect(
        page.getByRole("heading", { level: 1, name: /estoque de veículos/i })
      ).toBeVisible({ timeout: 15000 });
      await expect(page.locator('button:has-text("Pátio Ativo")')).toBeVisible({ timeout: 15000 });

      // 2. Auditoria em Relatórios (/reports)
      await page.goto("/reports", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("domcontentloaded");
      await dismissTourIfPresent(page);
      await expect(page.getByRole("heading", { name: /relatórios/i })).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("Faturamento Realizado")).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("Taxa de Conversão Global")).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("Ticket Médio por Veículo")).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("Tempo Médio de Resposta (SLA)")).toBeVisible({ timeout: 15000 });

      // 3. Auditoria no Cockpit / Dashboard (/dashboard)
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("domcontentloaded");
      await dismissTourIfPresent(page);
      await expect(
        page.getByRole("heading", { level: 1, name: /cockpit (geral|do gestor)|meu cockpit/i })
      ).toBeVisible({ timeout: 15000 });
    });
  });
});

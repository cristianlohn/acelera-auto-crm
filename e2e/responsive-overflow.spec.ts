/**
 * @file responsive-overflow.spec.ts
 * @description Suíte de Testes E2E de Responsividade Mobile e Detecção de Vazamento Horizontal (Horizontal Overflow).
 *
 * ============================================================================
 * ESCOPO DE TESTE & RASTREABILIDADE (REQ-CRM-11)
 * ============================================================================
 * Rotas Auditadas:
 *   - `/` (Landing Page Institucional)
 *   - `/leads` (Funil Kanban de Vendas)
 *   - `/vehicles` (Estoque e Gestão de Pátio)
 *   - `/reports` (Relatórios Executivos e Indicadores)
 *   - `/clients` (Gestão de Clientes e Carteira)
 *   - `/settings` (Configurações da Concessionária e Perfil)
 *
 * Viewports Testados:
 *   - Mobile Small: 375 x 667 (iPhone SE)
 *   - Mobile Standard: 390 x 844 (iPhone 12/13/14)
 *   - Mobile Android: 412 x 915 (Pixel 5 / Galaxy)
 *
 * Asserções Formais:
 *   - [E2E-RESP-01]: document.documentElement.scrollWidth <= window.innerWidth (Zero Scroll Horizontal)
 *   - [E2E-RESP-02]: Elementos principais (H1 e botões primários) visíveis e acessíveis no viewport
 *   - [E2E-RESP-03]: Modais de criação (Novo Lead, Novo Veículo, Novo Cliente) com largura compatível (< 100vw)
 * ============================================================================
 */

import { test, expect, Page } from "@playwright/test";

const VIEWPORTS = [
  { name: "Mobile Small (375x667)", width: 375, height: 667 },
  { name: "Mobile Standard (390x844)", width: 390, height: 844 },
  { name: "Mobile Android (412x915)", width: 412, height: 915 },
];

const ROUTES = [
  { path: "/", title: "Acelera Auto CRM" },
  { path: "/login", title: "Acessar sua Conta" },
  { path: "/register", title: "Criar Conta da Concessionária" },
  { path: "/leads", title: "Funil de Vendas" },
  { path: "/vehicles", title: "Estoque de Veículos" },
  { path: "/reports", title: "Relatórios e Indicadores" },
  { path: "/clients", title: "Carteira de Clientes" },
  { path: "/settings", title: "Configurações do Sistema" },
  { path: "/superadmin", title: "Super Admin Backoffice" },
  { path: "/ajuda", title: "Central de Ajuda & Guia Rápido" },
  { path: "/termos", title: "Termos de Uso e Licenciamento" },
  { path: "/privacidade", title: "Política de Privacidade" },
];

/**
 * Função utilitária para verificar se a página tem overflow horizontal de forma resiliente.
 */
async function assertZeroHorizontalOverflow(page: Page, routePath: string, viewportName: string) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.locator("body").waitFor({ state: "attached" });

  // Aguarda elemento principal (main, container de modal ou body) estar visível
  await page
    .locator("main, [role='main'], [role='dialog'], #modal-new-vehicle, #modal-add-client, #modal-add-lead, body")
    .first()
    .waitFor({ state: "visible", timeout: 10000 })
    .catch(() => {});

  let overflow: { scrollWidth: number; innerWidth: number; hasOverflow: boolean; diff: number } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      overflow = await page.evaluate(() => {
        const scrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        return {
          scrollWidth,
          innerWidth,
          hasOverflow: scrollWidth > innerWidth,
          diff: scrollWidth - innerWidth,
        };
      });
      break;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        (msg.includes("Execution context was destroyed") ||
          msg.includes("Target page, context or browser has been closed") ||
          msg.includes("navigation")) &&
        attempt < 2
      ) {
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(500);
        continue;
      }
      throw err;
    }
  }

  if (!overflow) {
    throw new Error(`Falha ao auditar overflow horizontal para ${routePath}`);
  }

  expect(
    overflow.hasOverflow,
    `[E2E-RESP-01] Vazamento horizontal detectado em '${routePath}' no viewport '${viewportName}': scrollWidth (${overflow.scrollWidth}px) > innerWidth (${overflow.innerWidth}px) por ${overflow.diff}px`
  ).toBe(false);
}

test.describe("[REQ-CRM-11] Auditoria de Responsividade Mobile e Zero Overflow Horizontal", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    const url = baseURL || "http://127.0.0.1:3000";
    const hostname = new URL(url).hostname;
    const domains = Array.from(new Set([hostname, "127.0.0.1", "localhost"]));

    const defaultCookies = [
      { name: "acelera_demo_mode", value: "true" },
      { name: "sb-demo-auth", value: "true" },
      { name: "acelera_demo_tour_dismissed", value: "true" },
      { name: "acelera_user_role", value: "admin" },
      { name: "acelera_demo_role", value: "admin" },
    ];

    await context.addCookies(
      domains.flatMap((domain) =>
        defaultCookies.map((c) => ({
          ...c,
          domain,
          path: "/",
        }))
      )
    );
  });

  for (const vp of VIEWPORTS) {
    test.describe(`Viewport: ${vp.name}`, () => {
      for (const route of ROUTES) {
        test(`[E2E-RESP-01 & 02] Rota ${route.path} deve renderizar sem overflow e com cabeçalho visível`, async ({
          page,
        }) => {
          // Arrange: Define o tamanho da tela do dispositivo móvel
          await page.setViewportSize({ width: vp.width, height: vp.height });

          if (route.path.startsWith("/superadmin")) {
            await page.context().addCookies([
              { name: "acelera_demo_role", value: "superadmin", domain: "127.0.0.1", path: "/" },
              { name: "acelera_demo_role", value: "superadmin", domain: "localhost", path: "/" },
              { name: "acelera_user_role", value: "superadmin", domain: "127.0.0.1", path: "/" },
              { name: "acelera_user_role", value: "superadmin", domain: "localhost", path: "/" },
            ]);
          }

          // Act: Navega até a rota
          await page.goto(route.path, { waitUntil: "domcontentloaded" });

          // Assert 1: Zero overflow horizontal na viewport
          await assertZeroHorizontalOverflow(page, route.path, vp.name);

          // Assert 2: Título principal H1 visível na viewport
          const heading = page.locator("h1");
          await expect(heading.first()).toBeVisible({ timeout: 10000 });
        });
      }

      test(`[E2E-RESP-03] Modal de Novo Lead (/dashboard/leads) não deve vazar a largura da viewport`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto("/dashboard/leads", { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

        // Abre o modal de lead com seletor resiliente
        const btnAddLead = page
          .getByRole("button", { name: /novo lead|\+ lead/i })
          .first();
        await expect(btnAddLead).toBeVisible({ timeout: 15000 });
        await btnAddLead.click();

        const dialog = page
          .locator("#modal-add-lead, #modal-add-kanban-lead, [data-testid='modal-add-lead']")
          .first();
        await expect(dialog).toBeVisible({ timeout: 15000 });

        // Valida que o modal não causa overflow
        await assertZeroHorizontalOverflow(page, "/dashboard/leads [Modal Novo Lead]", vp.name);
      });

      test(`[E2E-RESP-03] Modal de Novo Veículo (/vehicles) não deve vazar a largura da viewport`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto("/vehicles", { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

        // Abre o modal de veículo
        const btnAddVehicle = page.locator("#btn-new-vehicle, [data-testid='btn-new-vehicle']").first();
        await expect(btnAddVehicle).toBeVisible({ timeout: 15000 });
        await btnAddVehicle.click();

        const dialog = page.locator("#modal-new-vehicle, [data-testid='modal-new-vehicle']").first();
        await expect(dialog).toBeVisible({ timeout: 15000 });

        // Valida que o modal não causa overflow
        await assertZeroHorizontalOverflow(page, "/vehicles [Modal Novo Veículo]", vp.name);
      });

      test(`[E2E-RESP-03] Modal de Novo Cliente (/clients) não deve vazar a largura da viewport`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto("/clients", { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

        // Abre o modal de cliente
        const btnAddClient = page.locator("#btn-add-client, [data-testid='btn-add-client']").first();
        await expect(btnAddClient).toBeVisible({ timeout: 15000 });
        await btnAddClient.click();

        const dialog = page.locator("#modal-add-client, [data-testid='modal-add-client']").first();
        await expect(dialog).toBeVisible({ timeout: 15000 });

        // Valida que o modal não causa overflow
        await assertZeroHorizontalOverflow(page, "/clients [Modal Novo Cliente]", vp.name);
      });
    });
  }
});

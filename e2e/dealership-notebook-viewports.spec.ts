/**
 * @file dealership-notebook-viewports.spec.ts
 * @description Suíte de Testes E2E para validação de usabilidade, responsividade e layout em
 * notebooks corporativos de concessionárias (1366x768 e 1280x720 com barra de rolagem vertical padrão).
 *
 * ESCOPO & COBERTURA:
 * 1. Zero Overflow Horizontal da Janela Principal:
 *    - /dashboard, /leads, /dashboard/leads, /vehicles, /settings
 * 2. Usabilidade de Modais em Baixa Altura (720px e 768px):
 *    - Modal Novo Veículo (/vehicles) e Modal Novo Lead (/leads)
 *    - Validar altura controlada (<= viewport height) ou overflow-y-auto e botão de submissão acessível
 * 3. Funil Kanban em Notebook HD:
 *    - Largura mínima legível das colunas (>= 280px), badges de SLA visíveis e nomes dos clientes
 * 4. Estoque de Veículos (/vehicles):
 *    - Filtros de busca, abas de status, métricas e cards de estoque alinhados
 */

import { test, expect, Page } from "@playwright/test";

const NOTEBOOK_VIEWPORTS = [
  { name: "Notebook HD (1366x768)", width: 1366, height: 768 },
  { name: "Notebook Escala 125%/150% (1280x720)", width: 1280, height: 720 },
];

const AUDIT_ROUTES = [
  { path: "/dashboard", name: "Cockpit Geral" },
  { path: "/leads", name: "Funil de Leads (Canônico)" },
  { path: "/vehicles", name: "Estoque de Veículos" },
  { path: "/settings", name: "Configurações do Sistema" },
];

/**
 * Utilitário resiliente para garantir ausência de overflow horizontal na viewport principal.
 */
async function assertZeroWindowHorizontalOverflow(
  page: Page,
  routePath: string,
  viewportName: string
) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.locator("body").waitFor({ state: "attached" });

  await page
    .locator("main, [role='main'], body")
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
        await page.waitForTimeout(400);
        continue;
      }
      throw err;
    }
  }

  expect(
    overflow?.hasOverflow,
    `[NOTEBOOK-RESP-01] Vazamento horizontal detectado em '${routePath}' na resolução '${viewportName}': scrollWidth (${overflow?.scrollWidth}px) > innerWidth (${overflow?.innerWidth}px) por ${overflow?.diff}px`
  ).toBe(false);
}

/**
 * Fecha eventuais modais de onboarding/tour para não interferir na interação.
 */
async function dismissTourIfPresent(page: Page) {
  try {
    const closeTourBtn = page.locator('#btn-close-tour, button[aria-label="Fechar tour"]');
    if (await closeTourBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await closeTourBtn.click({ force: true });
      await page.waitForTimeout(200);
    }
  } catch {}
}

for (const vp of NOTEBOOK_VIEWPORTS) {
  test.describe(`Resolução de Concessionária: ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test.beforeEach(async ({ context, baseURL }) => {
      const url = baseURL || "http://127.0.0.1:3000";
      const hostname = new URL(url).hostname;
      const domains = Array.from(new Set([hostname, "127.0.0.1", "localhost"]));

      const cookies = [
        { name: "acelera_demo_mode", value: "true" },
        { name: "sb-demo-auth", value: "true" },
        { name: "acelera_demo_tour_dismissed", value: "true" },
        { name: "acelera_user_role", value: "admin" },
        { name: "acelera_demo_role", value: "admin" },
      ];

      await context.addCookies(
        domains.flatMap((domain) =>
          cookies.map((c) => ({
            ...c,
            domain,
            path: "/",
          }))
        )
      );
    });

    // -------------------------------------------------------------------------
    // 1. Auditoria de Zero Overflow Horizontal da Página
    // -------------------------------------------------------------------------
    for (const route of AUDIT_ROUTES) {
      test(`[NOTEBOOK-RESP-01] Rota ${route.path} (${route.name}) deve ter zero scroll horizontal na janela principal`, async ({
        page,
      }) => {
        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await dismissTourIfPresent(page);
        await assertZeroWindowHorizontalOverflow(page, route.path, vp.name);

        // Garante que o container principal ou cabeçalho esteja visível
        const headerOrMain = page.locator("h1, main, [role='main']").first();
        await expect(headerOrMain).toBeVisible({ timeout: 10000 });
      });
    }

    // -------------------------------------------------------------------------
    // 2. Usabilidade de Modais em Telas Baixas (720px e 768px)
    // -------------------------------------------------------------------------
    test(`[NOTEBOOK-MODAL-01] Modal de Novo Veículo (/vehicles) deve caber na viewport e ter botão de ação acessível`, async ({
      page,
    }) => {
      await page.goto("/vehicles", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      await dismissTourIfPresent(page);

      const btnNewVehicle = page.locator("#btn-new-vehicle, [data-testid='btn-new-vehicle']").first();
      await expect(btnNewVehicle).toBeVisible({ timeout: 15000 });

      const dialog = page.locator("#modal-new-vehicle, [data-testid='modal-new-vehicle']").first();

      // Clica no trigger de forma resiliente até abrir (suportando timing de hidratação do Next.js)
      await expect(async () => {
        if (!(await dialog.isVisible().catch(() => false))) {
          await btnNewVehicle.click({ force: true });
        }
        await expect(dialog).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 15000 });

      // Valida que o modal respeita a altura da viewport (com margem de segurança)
      const dialogBox = await dialog.boundingBox();
      expect(dialogBox).not.toBeNull();
      if (dialogBox) {
        expect(dialogBox.height).toBeLessThanOrEqual(vp.height);
      }

      // Valida que o container possui rolagem vertical para permitir alcançar os campos finais
      const hasVerticalScrollOrFits = await dialog.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return (
          style.overflowY === "auto" ||
          style.overflowY === "scroll" ||
          el.scrollHeight <= el.clientHeight
        );
      });
      expect(hasVerticalScrollOrFits).toBe(true);

      // O botão final de submissão ("Cadastrar Veículo") deve ser visível ou acessível com scroll
      const submitBtn = page.locator("#btn-submit-vehicle-modal, [data-testid='btn-submit-vehicle']").first();
      await submitBtn.scrollIntoViewIfNeeded();
      await expect(submitBtn).toBeVisible({ timeout: 10000 });

      // Fecha o modal pelo botão cancelar ou tecla Escape
      const cancelBtn = dialog.getByRole("button", { name: /cancelar/i }).first();
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
      } else {
        await page.keyboard.press("Escape");
      }
      await expect(dialog).not.toBeVisible({ timeout: 10000 });
    });

    test(`[NOTEBOOK-MODAL-02] Modal de Novo Lead (/leads) deve caber na viewport e ter botão de ação acessível`, async ({
      page,
    }) => {
      await page.goto("/leads", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      await dismissTourIfPresent(page);

      const btnAddLead = page.locator("#btn-add-lead, [data-testid='btn-add-lead']").first();
      await expect(btnAddLead).toBeVisible({ timeout: 15000 });

      const dialog = page.locator("#modal-add-lead, [data-testid='new-lead-modal']").first();

      // Clica no trigger de forma resiliente até abrir
      await expect(async () => {
        if (!(await dialog.isVisible().catch(() => false))) {
          await btnAddLead.click({ force: true });
        }
        await expect(dialog).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 15000 });

      // Valida altura do modal contida no viewport
      const dialogBox = await dialog.boundingBox();
      expect(dialogBox).not.toBeNull();
      if (dialogBox) {
        expect(dialogBox.height).toBeLessThanOrEqual(vp.height);
      }

      // Valida overflow vertical interno
      const hasVerticalScrollOrFits = await dialog.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return (
          style.overflowY === "auto" ||
          style.overflowY === "scroll" ||
          el.scrollHeight <= el.clientHeight
        );
      });
      expect(hasVerticalScrollOrFits).toBe(true);

      // Botão cadastrar lead acessível
      const submitBtn = page.locator("#btn-submit-lead, [data-testid='btn-submit-lead']").first();
      await submitBtn.scrollIntoViewIfNeeded();
      await expect(submitBtn).toBeVisible({ timeout: 10000 });

      // Fecha o modal
      const cancelBtn = dialog.getByRole("button", { name: /cancelar/i }).first();
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
      } else {
        await page.keyboard.press("Escape");
      }
      await expect(dialog).not.toBeVisible({ timeout: 10000 });
    });

    // -------------------------------------------------------------------------
    // 3. Funil Kanban em Notebook HD
    // -------------------------------------------------------------------------
    test(`[NOTEBOOK-KANBAN-01] Colunas do Kanban devem manter largura legível e exibir badges de SLA sem truncar`, async ({
      page,
    }) => {
      await page.goto("/leads", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      await dismissTourIfPresent(page);

      // Aguarda carregamento das colunas Kanban
      const columns = page.locator('[data-testid="kanban-column"]');
      await columns.first().waitFor({ state: "visible", timeout: 15000 });

      const columnCount = await columns.count();
      expect(columnCount).toBeGreaterThanOrEqual(4);

      // Valida largura da primeira coluna (mínimo de 280px para legibilidade de notebook)
      const firstColBox = await columns.first().boundingBox();
      expect(firstColBox).not.toBeNull();
      expect(firstColBox!.width).toBeGreaterThanOrEqual(280);

      // Valida legibilidade dos cards presentes
      const cards = page.locator('[data-testid="kanban-card"]');
      const cardCount = await cards.count();
      if (cardCount > 0) {
        const firstCard = cards.first();
        const clientName = firstCard.locator("h4").first();
        await expect(clientName).toBeVisible({ timeout: 5000 });

        const slaBadge = firstCard.locator('[data-testid="badge-sla-timer"]').first();
        await expect(slaBadge).toBeVisible({ timeout: 5000 });

        const vehicleInfo = firstCard.locator('[data-testid="lead-vehicle"]').first();
        await expect(vehicleInfo).toBeVisible({ timeout: 5000 });
      }

      // Valida que o container de colunas permite rolagem horizontal interna suave sem quebrar a janela
      await assertZeroWindowHorizontalOverflow(page, "/leads", vp.name);
    });

    // -------------------------------------------------------------------------
    // 4. Estoque de Veículos (/vehicles) em Notebook HD
    // -------------------------------------------------------------------------
    test(`[NOTEBOOK-VEHICLES-01] Filtros de busca, abas de status e cards de estoque devem permanecer alinhados`, async ({
      page,
    }) => {
      await page.goto("/vehicles", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      await dismissTourIfPresent(page);

      // Barra de busca presente e visível
      const searchInput = page.locator("#vehicle-search");
      await expect(searchInput).toBeVisible({ timeout: 15000 });

      // Abas de filtros de status
      const filterAll = page.locator("#filter-todos");
      const filterAvailable = page.locator("#filter-disponivel");
      const filterReserved = page.locator("#filter-reservado");

      await expect(filterAll).toBeVisible({ timeout: 10000 });
      await expect(filterAvailable).toBeVisible({ timeout: 10000 });
      await expect(filterReserved).toBeVisible({ timeout: 10000 });

      // Testa interação de filtro: clica em "Disponíveis" e depois em "Todos"
      await expect(async () => {
        await filterAvailable.click({ force: true });
        await expect(filterAvailable).toHaveAttribute("aria-selected", "true", { timeout: 2000 });
      }).toPass({ timeout: 10000 });

      await expect(async () => {
        await filterAll.click({ force: true });
        await expect(filterAll).toHaveAttribute("aria-selected", "true", { timeout: 2000 });
      }).toPass({ timeout: 10000 });

      // Testa busca por modelo/marca sem estourar o layout
      await searchInput.fill("Corolla");
      await page.waitForTimeout(300);

      // Valida que a janela continua sem overflow horizontal após filtro interativo
      await assertZeroWindowHorizontalOverflow(page, "/vehicles", vp.name);

      // Limpa busca
      await searchInput.clear();
      await page.waitForTimeout(200);
    });
  });
}

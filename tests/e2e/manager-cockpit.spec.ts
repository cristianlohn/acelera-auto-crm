/**
 * @file manager-cockpit.spec.ts
 * @description Testes E2E com Playwright para o Cockpit do Gestor, Indicadores Analíticos e Exportação CSV/PDF.
 */

import { test, expect } from "@playwright/test";

test.describe("[E2E-COCKPIT] Cockpit do Gestor, Métricas Comerciais e Exportação", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");

    const demoBtn = page.locator(
      '[data-testid="demo-login-button"], [data-testid="btn-enter-demo"], #btn-enter-demo, button:has-text("Demonstração")'
    ).first();
    await expect(demoBtn).toBeVisible({ timeout: 10000 });
    await demoBtn.click();

    await page.waitForURL("**/leads", { timeout: 15000 });
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");
  });

  test("[E2E-COCKPIT-01] Carregamento dos Cards e Indicadores Analíticos", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Cockpit do Gestor" })).toBeVisible();

    const pipelineCard = page.locator('[data-testid="card-dinheiro-na-mesa"]');
    await expect(pipelineCard).toBeVisible();
    await expect(pipelineCard).toContainText(/dinheiro na mesa/i);
    await expect(pipelineCard).toContainText(/R\$/);
    await expect(pipelineCard).toContainText(/em risco por estouro de SLA/i);

    const slaCard = page.locator('[data-testid="card-sla-atendimento"]');
    await expect(slaCard).toBeVisible();
    await expect(slaCard).toContainText(/SLA de Primeiro Atendimento/i);
    await expect(slaCard).toContainText(/min/i);
    await expect(slaCard).toContainText(/%/);

    await expect(page.getByText(/ranking da equipe & auditoria da roleta/i)).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /vendedor/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /leads recebidos/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /status sla/i })).toBeVisible();
  });

  test("[E2E-COCKPIT-02] Exportação e Validação Estrutural do Arquivo CSV", async ({ page }) => {
    const exportCsvBtn = page.locator('[data-testid="btn-export-csv"]');
    await expect(exportCsvBtn).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await exportCsvBtn.click();
    const download = await downloadPromise;

    const filename = download.suggestedFilename();
    expect(filename).toMatch(/^relatorio-performance-equipe-.*\.csv$/);

    const readable = await download.createReadStream();
    expect(readable).not.toBeNull();

    const chunks: Buffer[] = [];
    for await (const chunk of readable!) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const buffer = Buffer.concat(chunks);
    const content = buffer.toString("utf-8");

    expect(content.startsWith("\uFEFF")).toBe(true);
    expect(content).toContain(";");
    expect(content).toContain("Concessionária");
    expect(content).toContain("Dinheiro na Mesa");
    expect(content).toContain("SLA Médio");
    expect(content).toContain("AUDITORIA DA EQUIPE & ROLETA DE VENDAS");
  });

  test("[E2E-COCKPIT-03] Disparo de Exportação / Layout de Impressão PDF", async ({ page }) => {
    await page.evaluate(() => {
      (window as unknown as { __printed: boolean }).__printed = false;
      const originalOpen = window.open;
      window.open = (url, target, features) => {
        (window as unknown as { __printed: boolean }).__printed = true;
        return originalOpen ? originalOpen.call(window, url, target, features) : null;
      };
    });

    const exportPdfBtn = page.locator('[data-testid="btn-export-pdf"]');
    await expect(exportPdfBtn).toBeVisible();
    await exportPdfBtn.click();

    const wasPrinted = await page.evaluate(
      () => (window as unknown as { __printed: boolean }).__printed
    );
    expect(wasPrinted).toBe(true);
  });

  test("[E2E-COCKPIT-04] Responsividade e Usabilidade Mobile", async ({ page, isMobile }) => {
    if (!isMobile) {
      await page.setViewportSize({ width: 390, height: 844 });
    }

    const pipelineCard = page.locator('[data-testid="card-dinheiro-na-mesa"]');
    await expect(pipelineCard).toBeVisible();

    const exportCsvBtn = page.locator('[data-testid="btn-export-csv"]');
    await expect(exportCsvBtn).toBeVisible();

    const exportPdfBtn = page.locator('[data-testid="btn-export-pdf"]');
    await expect(exportPdfBtn).toBeVisible();
  });
});

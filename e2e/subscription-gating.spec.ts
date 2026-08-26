/**
 * @file subscription-gating.spec.ts
 * @description Testes E2E de Gating de Assinatura e Paywall (Playwright).
 */

import { test, expect } from "@playwright/test";

test.describe("[REQ-CRM-17] Controle de Acesso por Assinatura e Paywall", () => {
  test("[E2E-SUB-01] Deve redirecionar automaticamente de /leads para /billing quando o trial estiver expirado", async ({
    page,
    context,
  }) => {
    // Arrange: Define cookie de trial expirado
    await context.addCookies([
      {
        name: "acelera_demo_expired",
        value: "true",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    // Act: Tenta acessar rota autenticada do funil de vendas
    await page.goto("/leads");

    // Assert: Deve ser redirecionado para a tela de faturamento com alerta de expiração
    await expect(page).toHaveURL(/.*\/billing\?expired=true/);
    await expect(
      page.getByText(/seu período de teste grátis chegou ao fim/i)
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /ativar plano pro/i })
    ).toBeVisible();
  });

  test("[E2E-SUB-02] Deve permitir acesso normal ao Kanban de /leads quando a assinatura ou trial estiver ativo", async ({
    page,
    context,
  }) => {
    // Arrange: Cookie ativo sem expiração
    await context.addCookies([
      {
        name: "acelera_demo_mode",
        value: "true",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    // Act
    await page.goto("/leads");

    // Assert: Renderiza o funil de vendas normalmente
    await expect(page).toHaveURL(/.*\/leads/);
    await expect(page.getByRole("heading", { name: /funil de vendas/i })).toBeVisible();
  });
});

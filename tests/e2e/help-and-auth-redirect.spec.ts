/**
 * @file help-and-auth-redirect.spec.ts
 * @description Testes E2E para a Central de Ajuda (target="_blank") e Redirecionamento Automático na Rota /login.
 */

import { test, expect } from "@playwright/test";

test.describe("[E2E-HELP & AUTH-REDIRECT] Central de Ajuda e Redirecionamento Automático de Login", () => {
  test("[E2E-01] O link de 'Central de Ajuda' no menu da Sidebar deve possuir target='_blank' e rel='noopener noreferrer'", async ({
    page,
  }) => {
    // 1. Acessa a rota de login
    await page.goto("/login");

    // 2. Entra no Modo Demonstração para acessar o painel
    await page.getByTestId("btn-enter-demo").click();
    await expect(page).toHaveURL(/\/leads/);

    // 3. Localiza o link da Central de Ajuda na barra de navegação
    const helpLink = page.getByRole("link", { name: /central de ajuda/i });
    await expect(helpLink).toBeVisible();

    // 4. Valida atributos target e rel
    await expect(helpLink).toHaveAttribute("target", "_blank");
    await expect(helpLink).toHaveAttribute("rel", "noopener noreferrer");
    await expect(helpLink).toHaveAttribute("href", "/ajuda");
  });

  test("[E2E-02] Um usuário autenticado que acessa /login ou /register deve ser redirecionado automaticamente para /leads", async ({
    page,
    context,
  }) => {
    // 1. Define cookie de autenticação do usuário
    await context.addCookies([
      {
        name: "sb-test-user",
        value: "true",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    // 2. Tenta acessar a tela de login
    await page.goto("/login");

    // 3. Valida que foi automaticamente redirecionado para /leads
    await expect(page).toHaveURL(/\/leads/);
  });
});

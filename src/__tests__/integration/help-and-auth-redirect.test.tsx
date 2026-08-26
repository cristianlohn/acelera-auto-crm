/**
 * @file help-and-auth-redirect.test.tsx
 * @description Suíte de Testes de Integração para Links da Central de Ajuda e Header Sensível à Autenticação.
 *
 * Cenários Testados:
 * - [IT-HELP.1]: Sidebar desktop deve renderizar o link de 'Central de Ajuda' com target="_blank" e rel="noopener noreferrer".
 * - [IT-HELP.2]: MobileHeader deve renderizar o link de 'Central de Ajuda' com target="_blank".
 * - [IT-HELP.3]: MarketingLayout deve exibir 'Voltar ao CRM' quando o usuário estiver autenticado.
 * - [IT-HELP.4]: MarketingLayout deve exibir 'Entrar no CRM' quando o usuário for anônimo.
 * - [IT-HELP.5]: Página /ajuda deve conter o botão 'Voltar ao CRM' no cabeçalho.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar, navItems, NavLink } from "@/components/layout/sidebar";
import { MarketingHeader } from "@/components/layout/marketing-header";
import MarketingHelpPage from "@/app/(marketing)/ajuda/page";

// Mock do UserNav para isolar a renderização da barra de navegação
vi.mock("@/components/layout/user-nav", () => ({
  UserNav: () => <div data-testid="user-nav-mock">User Nav</div>,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/leads",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("[IT-HELP] Navegação da Central de Ajuda e Contexto de Autenticação", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[IT-HELP.1] Deve conter target='_blank' e rel='noopener noreferrer' no item de navegação da Central de Ajuda", () => {
    const helpItem = navItems.find((item) => item.href === "/ajuda");
    expect(helpItem).toBeDefined();
    expect(helpItem?.target).toBe("_blank");
    expect(helpItem?.rel).toBe("noopener noreferrer");
  });

  it("[IT-HELP.2] Deve renderizar o link da Central de Ajuda na Sidebar com target='_blank'", () => {
    // Arrange & Act
    render(<Sidebar />);

    // Assert
    const helpLink = screen.getByRole("link", { name: /central de ajuda/i });
    expect(helpLink).toHaveAttribute("target", "_blank");
    expect(helpLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(helpLink).toHaveAttribute("href", "/ajuda");
  });

  it("[IT-HELP.3] Deve renderizar NavLink da Central de Ajuda com target='_blank' e rel='noopener noreferrer'", () => {
    const helpItem = navItems.find((item) => item.href === "/ajuda")!;
    // Arrange & Act
    render(<NavLink item={helpItem} />);

    // Assert
    const helpLink = screen.getByRole("link", { name: /central de ajuda/i });
    expect(helpLink).toHaveAttribute("target", "_blank");
    expect(helpLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(helpLink).toHaveAttribute("href", "/ajuda");
  });

  it("[IT-HELP.4] MarketingHeader deve exibir 'Voltar ao CRM' quando inicializado como autenticado", () => {
    // Arrange & Act
    render(<MarketingHeader initialAuthenticated={true} />);

    // Assert
    expect(screen.getByRole("link", { name: /voltar ao crm/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /entrar no crm/i })).not.toBeInTheDocument();
  });

  it("[IT-HELP.5] MarketingHeader deve exibir 'Entrar no CRM' quando for anônimo", () => {
    // Arrange & Act
    render(<MarketingHeader initialAuthenticated={false} />);

    // Assert
    expect(screen.getByRole("link", { name: /entrar no crm/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /voltar ao crm/i })).not.toBeInTheDocument();
  });

  it("[IT-HELP.6] A página /ajuda deve conter o botão de retorno 'Voltar ao CRM'", () => {
    // Arrange & Act
    render(<MarketingHelpPage />);

    // Assert
    expect(screen.getByRole("link", { name: /voltar ao crm/i })).toBeInTheDocument();
  });
});

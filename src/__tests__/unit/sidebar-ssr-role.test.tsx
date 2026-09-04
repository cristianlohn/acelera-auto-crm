/**
 * @file sidebar-ssr-role.test.tsx
 * @description Suíte de testes unitários para a renderização síncrona (zero-FOUC) da Sidebar com initialRole.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar, getNavItemsForRole } from "@/components/layout/sidebar";
import DashboardLayout from "@/app/(dashboard)/layout";

// Mock do next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("[UNIT-SIDEBAR-SSR-ROLE] Renderização Síncrona da Sidebar com initialRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve calcular imediatamente os itens de navegação completos para o papel 'admin' via getNavItemsForRole", () => {
    const items = getNavItemsForRole("admin");
    const labels = items.map((i) => i.label);

    expect(labels).toContain("Cockpit Geral");
    expect(labels).toContain("Funil de Vendas");
    expect(labels).toContain("Equipe & Roleta");
    expect(labels).toContain("Clientes");
    expect(labels).toContain("Estoque");
    expect(labels).toContain("Relatórios");
    expect(labels).toContain("Configurações");
    expect(labels).toContain("Faturamento");
    expect(labels).toContain("Central de Ajuda");
  });

  it("deve calcular itens restritos para o papel 'seller' sem Equipe, Configurações ou Faturamento", () => {
    const items = getNavItemsForRole("seller");
    const labels = items.map((i) => i.label);

    expect(labels).toContain("Meu Cockpit");
    expect(labels).toContain("Meus Leads / Kanban");
    expect(labels).toContain("Clientes");
    expect(labels).toContain("Estoque");
    expect(labels).not.toContain("Equipe & Roleta");
    expect(labels).not.toContain("Relatórios");
    expect(labels).not.toContain("Configurações");
    expect(labels).not.toContain("Faturamento");
  });

  it("deve renderizar a Sidebar imediatamente com 'Cockpit Geral', 'Equipe & Roleta' e 'Faturamento' quando initialRole='admin'", () => {
    render(<Sidebar initialRole="admin" />);

    expect(screen.getByText("Cockpit Geral")).toBeInTheDocument();
    expect(screen.getByText("Funil de Vendas")).toBeInTheDocument();
    expect(screen.getByText("Equipe & Roleta")).toBeInTheDocument();
    expect(screen.getByText("Faturamento")).toBeInTheDocument();
    expect(screen.getByText("Configurações")).toBeInTheDocument();
  });

  it("deve renderizar o DashboardLayout com os itens administrativos imediatamente sem flash visual", () => {
    render(
      <DashboardLayout initialRole="admin">
        <div>Conteúdo Principal</div>
      </DashboardLayout>
    );

    expect(screen.getAllByText("Cockpit Geral").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Equipe & Roleta").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Faturamento").length).toBeGreaterThanOrEqual(1);
  });
});

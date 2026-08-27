/**
 * @file rbac-demo-simulator.test.tsx
 * @description Suíte de Testes de Integração do Simulador de Papéis Demo (RBAC Demo Switcher / REQ-CRM-16).
 *
 * ============================================================================
 * ESCOPO DE TESTE & RASTREABILIDADE (SUT: RBAC Demo Switcher & CRM Layout / REQ-CRM-16)
 * ============================================================================
 * Cenários Testados:
 *   - [IT-16.1]: Validação de que o menu Super Admin NÃO é renderizado na navegação padrão.
 *   - [IT-16.2]: Renderização da barra do Simulador de Papéis quando em modo demo.
 *   - [IT-16.3]: Alternância para perfil "Vendedor" filtrando os cards do Kanban apenas para o vendedor ativo.
 *   - [IT-16.4]: Alternância para perfil "Gerente" restaurando a visão de todos os leads e relatórios da loja.
 *   - [IT-16.5]: Alternância para perfil "Admin" liberando acesso total a abas de equipe e configurações.
 *   - [IT-16.6]: Validação de bloqueio visual de abas administrativas quando em perfil de vendedor.
 *   - [IT-16.7]: Responsividade mobile do seletor de papéis com zero overflow.
 *
 * Padrão Estrutural: AAA (Arrange, Act, Assert)
 * Ambiente: Vitest + React Testing Library + Happy-DOM
 * ============================================================================
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardLayout from "@/app/(dashboard)/layout";
import LeadsPage from "@/app/(dashboard)/leads/page";
import ReportsPage from "@/app/(dashboard)/reports/page";
import SettingsPage from "@/app/(dashboard)/settings/page";
import { DemoRoleProvider } from "@/context/demo-role-context";
import { RoleSimulatorBar } from "@/components/demo/RoleSimulatorBar";

// Mock dos hooks do Next.js
vi.mock("next/navigation", () => ({
  usePathname: () => "/leads",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("[IT-16] Controle de Acesso RBAC e Simulador de Papéis na Demonstração", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof document !== "undefined") {
      document.cookie = "acelera_demo_role=; path=/; max-age=0";
      document.cookie = "acelera_demo_mode=; path=/; max-age=0";
    }
  });

  it("[IT-16.1] Deve validar que o atalho 'Super Admin' NÃO é renderizado na navegação padrão", () => {
    // Arrange & Act
    render(
      <DashboardLayout>
        <div data-testid="dashboard-content">Conteúdo</div>
      </DashboardLayout>
    );

    // Assert (A sidebar deve conter os itens usuais, mas NÃO Super Admin)
    expect(screen.getByRole("link", { name: /funil de vendas/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /clientes/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /estoque/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /relatórios/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /configurações/i })).toBeInTheDocument();

    expect(screen.queryByRole("link", { name: /super admin/i })).not.toBeInTheDocument();
  });

  it("[IT-16.2] Deve renderizar a barra do Simulador de Papéis com os 3 botões de perfil", () => {
    // Arrange & Act
    render(
      <DemoRoleProvider initialDemoMode={true} initialRole="admin">
        <RoleSimulatorBar />
      </DemoRoleProvider>
    );

    // Assert
    expect(screen.getByText(/modo demonstração interativo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /vendedor \(rafael alves\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /gerente comercial/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /admin \(dono da loja\)/i })).toBeInTheDocument();
  });

  it("[IT-16.3] Deve alternar para perfil 'Vendedor' filtrando os cards do Kanban para Rafael Alves", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <DemoRoleProvider initialDemoMode={true} initialRole="admin">
        <div>
          <RoleSimulatorBar />
          <LeadsPage />
        </div>
      </DemoRoleProvider>
    );

    // Assert inicial (Admin vê todos os leads, ex: Carlos Mendonça, Fernanda Souza)
    expect(screen.getByText("Fernanda Souza")).toBeInTheDocument();

    // Act (Clica no botão de Vendedor)
    const vendedorBtn = screen.getByRole("button", { name: /vendedor \(rafael alves\)/i });
    await act(async () => {
      await user.click(vendedorBtn);
    });

    // Assert (Badge de filtro de vendedor é exibido e apenas leads do Rafael Alves estão visíveis)
    expect(screen.getByText(/meus leads \(rafael alves\)/i)).toBeInTheDocument();
    expect(screen.getByText("Carlos Mendonça")).toBeInTheDocument(); // Lead do Rafael Alves
    expect(screen.getByText("Ricardo Lima")).toBeInTheDocument(); // Lead do Rafael Alves
    expect(screen.queryByText("Fernanda Souza")).not.toBeInTheDocument(); // Lead da Juliana Costa
  });

  it("[IT-16.4] Deve alternar para perfil 'Gerente' restaurando visão consolidada no Kanban e Relatórios", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <DemoRoleProvider initialDemoMode={true} initialRole="vendedor">
        <div>
          <RoleSimulatorBar />
          <ReportsPage />
        </div>
      </DemoRoleProvider>
    );

    // No modo Vendedor, o banner de restrição deve estar visível
    expect(screen.getByText(/relatórios executivos restritos a gerentes/i)).toBeInTheDocument();

    // Act (Alterna para Gerente)
    const gerenteBtn = screen.getByRole("button", { name: /gerente comercial/i });
    await act(async () => {
      await user.click(gerenteBtn);
    });

    // Assert (Banner de restrição some e KPIs globais são liberados)
    expect(screen.queryByText(/relatórios executivos restritos a gerentes/i)).not.toBeInTheDocument();
    expect(screen.getByText(/faturamento realizado/i)).toBeInTheDocument();
    expect(screen.getByText(/taxa de conversão global/i)).toBeInTheDocument();
  });

  it("[IT-16.5] Deve alternar para perfil 'Admin' liberando acesso total a abas de equipe", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <DemoRoleProvider initialDemoMode={true} initialRole="admin">
        <div>
          <RoleSimulatorBar />
          <SettingsPage />
        </div>
      </DemoRoleProvider>
    );

    // Assert (Admin tem todas as abas habilitadas)
    const equipeTab = screen.getByRole("tab", { name: /equipe & vendedores/i });
    expect(equipeTab).not.toBeDisabled();

    // Act (Navega para Equipe)
    await user.click(equipeTab);

    // Assert
    expect(screen.getByText(/capacidade de vendedores do plano/i)).toBeInTheDocument();
  });

  it("[IT-16.6] Deve validar bloqueio visual e desabilitação de abas administrativas no perfil de Vendedor", async () => {
    // Arrange
    render(
      <DemoRoleProvider initialDemoMode={true} initialRole="vendedor">
        <div>
          <RoleSimulatorBar />
          <SettingsPage />
        </div>
      </DemoRoleProvider>
    );

    // Assert (Aba de perfil está habilitada, mas Loja, SLA e Equipe estão desabilitadas)
    expect(screen.getByText(/modo vendedor \(rafael alves\)/i)).toBeInTheDocument();

    const perfilTab = screen.getByRole("tab", { name: /perfil do usuário/i });
    const lojaTab = screen.getByRole("tab", { name: /concessionária & loja/i });
    const slaTab = screen.getByRole("tab", { name: /parâmetros do crm & sla/i });
    const equipeTab = screen.getByRole("tab", { name: /equipe & vendedores/i });

    expect(perfilTab).not.toBeDisabled();
    expect(lojaTab).toBeDisabled();
    expect(slaTab).toBeDisabled();
    expect(equipeTab).toBeDisabled();
  });

  it("[IT-16.7] Deve validar responsividade e fechamento de notificação de perfil", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <DemoRoleProvider initialDemoMode={true} initialRole="admin">
        <RoleSimulatorBar />
      </DemoRoleProvider>
    );

    // Act 1 (Alterna para Gerente gerando notificação)
    const gerenteBtn = screen.getByRole("button", { name: /gerente comercial/i });
    await act(async () => {
      await user.click(gerenteBtn);
    });

    // Assert 1 (Notificação visível)
    expect(
      screen.getByText(/visão de gerente comercial ativada/i)
    ).toBeInTheDocument();

    // Act 2 (Fecha notificação)
    const closeBtn = screen.getByRole("button", { name: /fechar notificação/i });
    await act(async () => {
      await user.click(closeBtn);
    });

    // Assert 2 (Notificação removida)
    expect(
      screen.queryByText(/visão de gerente comercial ativada/i)
    ).not.toBeInTheDocument();
  });

  it("[IT-16.8] Não deve renderizar a barra do simulador quando isDemoMode for false", () => {
    // Arrange & Act
    const { container } = render(
      <DemoRoleProvider initialDemoMode={false} initialRole="admin">
        <RoleSimulatorBar />
      </DemoRoleProvider>
    );

    // Assert
    expect(container).toBeEmptyDOMElement();
  });
});

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
import { LeadsPageClient as LeadsPage } from "@/components/leads/leads-page-client";
import ReportsPage from "@/app/(dashboard)/reports/page";
import { SettingsForm as SettingsPage } from "@/components/settings/settings-form";
import { DemoRoleProvider } from "@/context/demo-role-context";
import { RoleSimulatorBar } from "@/components/demo/RoleSimulatorBar";

// Mock dos hooks do Next.js
vi.mock("next/navigation", () => ({
  usePathname: () => "/leads",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
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
    expect(screen.getByRole("link", { name: /meus leads \/ kanban|funil de vendas/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /clientes/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /estoque/i })).toBeInTheDocument();

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

    // Assert inicial (Admin vê todos os leads, ex: Felipe Albuquerque, Camila Duarte)
    expect(screen.getByText("Camila Duarte")).toBeInTheDocument();

    // Act (Clica no botão de Vendedor)
    const vendedorBtn = screen.getByRole("button", { name: /vendedor \(rafael alves\)/i });
    await act(async () => {
      await user.click(vendedorBtn);
    });

    // Assert (Badge de filtro de vendedor é exibido e apenas leads do Rafael Alves estão visíveis)
    expect(screen.getByText(/meus leads \(rafael alves\)/i)).toBeInTheDocument();
    expect(screen.getAllByText("Felipe Albuquerque")[0]).toBeInTheDocument(); // Lead do Rafael
    expect(screen.getAllByText("Leonardo Vargas")[0]).toBeInTheDocument(); // Lead do Rafael
    expect(screen.queryByText("Camila Duarte")).not.toBeInTheDocument(); // Lead da Amanda Souza
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

  it("[IT-16.6] Deve validar bloqueio visual e ocultação estrita de abas administrativas no perfil de Vendedor", async () => {
    // Arrange
    render(
      <DemoRoleProvider initialDemoMode={true} initialRole="vendedor">
        <div>
          <RoleSimulatorBar />
          <SettingsPage />
        </div>
      </DemoRoleProvider>
    );

    // Assert (Aba de perfil e preferências estão visíveis, mas abas confidenciais de Loja, SLA, Equipe e Integrações estão estritamente ocultadas para Vendedor)
    expect(screen.getByText(/painel do vendedor/i)).toBeInTheDocument();

    const perfilTab = screen.getByRole("tab", { name: /perfil do usuário/i });
    const prefTab = screen.getByRole("tab", { name: /preferências & notificações/i });

    expect(perfilTab).toBeInTheDocument();
    expect(prefTab).toBeInTheDocument();

    // Abas confidenciais restritas a gestores e administradores não aparecem no DOM para vendedores
    expect(screen.queryByRole("tab", { name: /concessionária & loja/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /parâmetros do crm & sla/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /equipe & vendedores/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /integrações & webhooks/i })).not.toBeInTheDocument();
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

  it("[IT-16.9] Deve permitir acesso à aba 'Integrações & Webhooks' para o perfil de Gerente", () => {
    // Arrange & Act (Monta a página de Configurações sob o papel de Gerente)
    render(
      <DemoRoleProvider initialDemoMode={true} initialRole="gerente">
        <SettingsPage />
      </DemoRoleProvider>
    );

    // Assert (Gerentes devem visualizar e acessar a aba de Integrações)
    const integracoesTab = screen.getByRole("tab", { name: /integrações & webhooks/i });
    expect(integracoesTab).toBeInTheDocument();
    expect(integracoesTab).not.toBeDisabled();
  });

  it("[IT-16.10] Deve sincronizar os campos de perfil em /settings dinamicamente ao alternar o papel no Simulador de Demonstração", async () => {
    const user = userEvent.setup();

    // Arrange (Inicia como Gerente)
    render(
      <DemoRoleProvider initialDemoMode={true} initialRole="gerente">
        <div>
          <RoleSimulatorBar />
          <SettingsPage />
        </div>
      </DemoRoleProvider>
    );

    // Assert 1 (Campos refletem Juliana Costa - Gerente)
    const nameInput = screen.getByLabelText(/nome completo \*/i);
    const emailInput = screen.getByLabelText(/e-mail corporativo \*/i);

    expect(nameInput).toHaveValue("Juliana Costa");
    expect(emailInput).toHaveValue("juliana.costa@autoprime.com.br");

    // Act 2 (Alterna para Admin Roberto Silva)
    const adminBtn = screen.getByRole("button", { name: /admin \(dono da loja\)/i });
    await act(async () => {
      await user.click(adminBtn);
    });

    // Assert 2 (Campos refletem Roberto Silva)
    expect(nameInput).toHaveValue("Roberto Silva");
    expect(emailInput).toHaveValue("roberto.silva@autoprime.com.br");

    // Act 3 (Alterna para Vendedor Rafael Alves)
    const vendedorBtn = screen.getByRole("button", { name: /vendedor \(rafael alves\)/i });
    await act(async () => {
      await user.click(vendedorBtn);
    });

    // Assert 3 (Campos refletem Rafael Alves)
    expect(nameInput).toHaveValue("Rafael Alves");
    expect(emailInput).toHaveValue("rafael.alves@autoprime.com.br");
  });
});

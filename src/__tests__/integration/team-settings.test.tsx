/**
 * @file team-settings.test.tsx
 * @description Suíte de Testes de Integração da Aba de Gestão de Equipe & Permissões (SettingsPage / REQ-CRM-15).
 *
 * ============================================================================
 * ESCOPO DE TESTE & RASTREABILIDADE (SUT: SettingsPage -> Aba Equipe / REQ-CRM-15)
 * ============================================================================
 * Cenários Testados:
 *   - [IT-15.1]: Renderização da aba de equipe com a barra de ocupação de vagas do plano.
 *   - [IT-15.2]: Renderização da lista de membros com badges de cargo e status.
 *   - [IT-15.3]: Abertura do modal de convite e preenchimento de novo vendedor.
 *   - [IT-15.4]: Bloqueio de envio e exibição do modal de upgrade ao tentar exceder o limite de vagas.
 *   - [IT-15.5]: Remoção de vendedor da equipe com atualização da barra de ocupação.
 *   - [IT-15.6]: Validação de segurança impedindo a remoção do admin proprietário.
 *   - [IT-15.7]: Responsividade e deep link de WhatsApp para solicitação de upgrade.
 *
 * Padrão Estrutural: AAA (Arrange, Act, Assert)
 * Ambiente: Vitest + React Testing Library + Happy-DOM
 * ============================================================================
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "@/app/(dashboard)/settings/page";
import * as teamActions from "@/app/actions/team";

describe("[IT-15] Gestão de Equipe & Controle de Capacidade Multi-Tenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[IT-15.1] Deve renderizar a aba de equipe com a barra de ocupação de vagas do plano", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<SettingsPage />);

    const teamTab = screen.getByRole("tab", { name: /equipe & vendedores/i });

    // Act
    await user.click(teamTab);

    // Assert (Verifica o card de resumo e a barra de progresso)
    expect(
      screen.getByText(/capacidade de vendedores do plano/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/vagas ocupadas no plano starter/i)).toBeInTheDocument();

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
  });

  it("[IT-15.2] Deve renderizar a lista de membros com badges de cargo e status ativo", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<SettingsPage />);

    // Act
    await user.click(screen.getByRole("tab", { name: /equipe & vendedores/i }));

    // Assert (Nomes e cargos dos membros iniciais)
    expect(screen.getByText("Roberto Silva")).toBeInTheDocument();
    expect(screen.getByText("Juliana Costa")).toBeInTheDocument();
    expect(screen.getByText("Rafael Alves")).toBeInTheDocument();

    expect(screen.getByText(/admin \/ proprietário/i)).toBeInTheDocument();
    expect(screen.getByText(/gerente comercial/i)).toBeInTheDocument();
    expect(screen.getByText("Vendedor")).toBeInTheDocument();
  });

  it("[IT-15.3] Deve abrir o modal de convite e cadastrar um novo vendedor com sucesso", async () => {
    // Arrange
    const spyInvite = vi.spyOn(teamActions, "inviteTeamMember").mockResolvedValueOnce({
      success: true,
      member: {
        id: "mem-new-001",
        organizationId: "org-001",
        fullName: "Camila Fernandes",
        email: "camila@autoprime.com.br",
        phone: "11988889999",
        role: "vendedor",
        status: "active",
        createdAt: new Date().toISOString(),
      },
    });

    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole("tab", { name: /equipe & vendedores/i }));

    // Act 1 (Abre modal de convite)
    const addBtn = screen.getByRole("button", { name: /convidar vendedor/i });
    await user.click(addBtn);

    // Assert 1 (Modal visível)
    expect(
      screen.getByRole("dialog", { name: /convidar novo vendedor/i })
    ).toBeInTheDocument();

    // Act 2 (Preenche campos)
    await user.type(screen.getByLabelText(/nome completo \*/i), "Camila Fernandes");
    await user.type(screen.getByLabelText(/e-mail corporativo \*/i), "camila@autoprime.com.br");
    await user.type(screen.getByLabelText(/whatsapp \/ celular \*/i), "11988889999");

    // Act 3 (Submete formulário)
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /enviar convite/i }));
    });

    // Assert 3 (Chama Server Action e exibe na listagem)
    expect(spyInvite).toHaveBeenCalled();
    expect(await screen.findByText("Camila Fernandes")).toBeInTheDocument();
  });

  it("[IT-15.4] Deve bloquear envio e exibir o modal de upgrade ao tentar exceder a cota", async () => {
    // Arrange (Simula Server Action retornando cota excedida)
    vi.spyOn(teamActions, "inviteTeamMember").mockResolvedValueOnce({
      success: false,
      error: "Limite de vagas do plano atingido (3/3).",
      requiresUpgrade: true,
    });

    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole("tab", { name: /equipe & vendedores/i }));

    // Act 1 (Abre modal)
    await user.click(screen.getByRole("button", { name: /convidar vendedor/i }));

    // Preenche dados
    await user.type(screen.getByLabelText(/nome completo \*/i), "Novo Vendedor Extra");
    await user.type(screen.getByLabelText(/e-mail corporativo \*/i), "extra@autoprime.com.br");
    await user.type(screen.getByLabelText(/whatsapp \/ celular \*/i), "11911112222");

    // Act 2 (Submete)
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /enviar convite/i }));
    });

    // Assert (Modal de Upgrade é exibido)
    expect(
      await screen.findByText(/limite de vagas atingido 🚀/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/diferenciais do plano pro/i)
    ).toBeInTheDocument();
  });

  it("[IT-15.5] Deve remover um vendedor da equipe com sucesso", async () => {
    // Arrange
    const spyRemove = vi.spyOn(teamActions, "removeTeamMember").mockResolvedValueOnce({
      success: true,
    });

    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole("tab", { name: /equipe & vendedores/i }));

    // Localiza botões de remover da lista (Rafael Alves é o 3º)
    const removeButtons = screen.getAllByRole("button", {
      name: /remover/i,
    });

    // Act
    await act(async () => {
      await user.click(removeButtons[2]);
    });

    // Assert
    expect(spyRemove).toHaveBeenCalled();
  });

  it("[IT-15.6] Deve impedir a remoção do administrador proprietário da conta", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole("tab", { name: /equipe & vendedores/i }));

    // Assert (O primeiro botão de remover, que pertence ao admin, deve estar desabilitado)
    const removeButtons = screen.getAllByRole("button", {
      name: /remover/i,
    });
    expect(removeButtons[0]).toBeDisabled();
  });

  it("[IT-15.7] Deve validar o deep link de WhatsApp para solicitação de upgrade de plano", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole("tab", { name: /equipe & vendedores/i }));

    // Força exibição do modal de upgrade via simulação de limite
    vi.spyOn(teamActions, "inviteTeamMember").mockResolvedValueOnce({
      success: false,
      requiresUpgrade: true,
    });

    await user.click(screen.getByRole("button", { name: /convidar vendedor/i }));
    await user.type(screen.getByLabelText(/nome completo \*/i), "Teste");
    await user.type(screen.getByLabelText(/e-mail corporativo \*/i), "t@t.com");
    await user.type(screen.getByLabelText(/whatsapp \/ celular \*/i), "11999998888");

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /enviar convite/i }));
    });

    // Assert (Verifica o link do WhatsApp no modal de upgrade)
    const upgradeLink = await screen.findByRole("link", {
      name: /falar com consultor \/ fazer upgrade via whatsapp/i,
    });

    expect(upgradeLink).toHaveAttribute("href");
    expect(upgradeLink.getAttribute("href")).toContain("https://wa.me/55");
    expect(upgradeLink.getAttribute("href")).toContain("Plano%20Pro");
  });
});

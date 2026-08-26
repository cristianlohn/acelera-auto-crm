/**
 * @file settings-page.test.tsx
 * @description Suíte de Testes de Integração da Página de Configurações do Sistema (SettingsPage).
 *
 * ============================================================================
 * ESCOPO DE TESTE & RASTREABILIDADE (SUT: SettingsPage)
 * ============================================================================
 * Funcionalidades e Fluxos Testados:
 *   - [IT-10.1]: Renderização das 4 abas organizacionais (Perfil, Loja, SLA/Parâmetros, Preferências).
 *   - [IT-10.2]: Alternância reativa e controle de foco entre as abas com atributos aria-selected.
 *   - [IT-10.3]: Edição dos dados de perfil do usuário (nome, e-mail, cargo) e salvamento com feedback de sucesso.
 *   - [IT-10.4]: Edição e validação dos dados da concessionária (Razão Social, CNPJ, Telefone).
 *   - [IT-10.5]: Atualização dos parâmetros de SLA e meta mensal de vendas (BRL).
 *   - [IT-10.6]: Alternância dos toggles de notificação e seleção do tema visual.
 *
 * Padrão Estrutural: AAA (Arrange, Act, Assert)
 * Ambiente de Execução: Happy-DOM / Vitest / Testing Library
 * ============================================================================
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "@/app/(dashboard)/settings/page";

// ---------------------------------------------------------------------------
// [IT-10] Configurações, Parâmetros do CRM e Perfil
// ---------------------------------------------------------------------------

describe("[IT-10] Configurações e Parâmetros (SettingsPage)", () => {
  it("[IT-10.1] Deve renderizar as 4 abas de navegação de configurações no DOM", () => {
    // Arrange & Act (Dado que a tela de Configurações é montada)
    render(<SettingsPage />);

    // Assert (Então as 4 abas devem estar presentes no tablist)
    expect(
      screen.getByRole("tab", { name: /perfil do usuário/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /concessionária & loja/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /parâmetros do crm & sla/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /preferências & notificações/i })
    ).toBeInTheDocument();
  });

  it("[IT-10.2] Deve alternar reativamente entre as 4 abas atualizando aria-selected e o painel visível", async () => {
    // Arrange (Dado o dashboard montado na aba inicial 'Perfil')
    const user = userEvent.setup();
    render(<SettingsPage />);

    const perfilTab = screen.getByRole("tab", { name: /perfil do usuário/i });
    const lojaTab = screen.getByRole("tab", { name: /concessionária & loja/i });
    const slaTab = screen.getByRole("tab", {
      name: /parâmetros do crm & sla/i,
    });
    const prefTab = screen.getByRole("tab", {
      name: /preferências & notificações/i,
    });

    expect(perfilTab).toHaveAttribute("aria-selected", "true");
    expect(lojaTab).toHaveAttribute("aria-selected", "false");

    // Act 1 (Quando o usuário clica na aba 'Concessionária & Loja')
    await user.click(lojaTab);

    // Assert 1 (Então a aba 'Loja' fica ativa e exibe o campo CNPJ)
    expect(lojaTab).toHaveAttribute("aria-selected", "true");
    expect(perfilTab).toHaveAttribute("aria-selected", "false");
    expect(screen.getByLabelText(/razão social \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cnpj \*/i)).toBeInTheDocument();

    // Act 2 (Quando o usuário clica na aba 'Parâmetros do CRM & SLA')
    await user.click(slaTab);

    // Assert 2 (Então a aba 'SLA' fica ativa e exibe campos de metas e SLA)
    expect(slaTab).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByLabelText(/meta mensal de vendas da loja/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/sla alvo de 1º contato/i)
    ).toBeInTheDocument();

    // Act 3 (Quando o usuário clica na aba 'Preferências & Notificações')
    await user.click(prefTab);

    // Assert 3 (Então a aba 'Preferências' fica ativa)
    expect(prefTab).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByText(/notificações de novos leads via whatsapp/i)
    ).toBeInTheDocument();
  });

  it("[IT-10.3] Deve editar os dados do perfil do usuário e disparar salvamento com feedback de sucesso", () => {
    // Arrange (Dado o formulário na aba Perfil)
    vi.useFakeTimers();
    render(<SettingsPage />);

    const nameInput = screen.getByLabelText(/nome completo \*/i);
    const emailInput = screen.getByLabelText(/e-mail corporativo \*/i);
    const roleSelect = screen.getByLabelText(/função no sistema/i);
    const saveBtn = screen.getByRole("button", { name: /salvar alterações/i });

    // Act 1 (Edita os campos de perfil)
    fireEvent.change(nameInput, { target: { value: "Carlos Eduardo Silva" } });
    fireEvent.change(emailInput, {
      target: { value: "carlos.silva@aceleraauto.com.br" },
    });
    fireEvent.change(roleSelect, { target: { value: "admin" } });

    // Assert 1 (Verifica valores atualizados no estado)
    expect(nameInput).toHaveValue("Carlos Eduardo Silva");
    expect(emailInput).toHaveValue("carlos.silva@aceleraauto.com.br");
    expect(roleSelect).toHaveValue("admin");

    // Act 2 (Dispara o salvamento do formulário)
    act(() => {
      fireEvent.click(saveBtn);
    });

    // Avança o timer de salvamento
    act(() => {
      vi.advanceTimersByTime(400);
    });

    // Assert 2 (Feedback de sucesso é exibido)
    expect(
      screen.getByText("Configurações Salvas com Sucesso!")
    ).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("[IT-10.4] Deve editar e validar os dados da concessionária na aba Loja", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<SettingsPage />);

    const lojaTab = screen.getByRole("tab", { name: /concessionária & loja/i });
    await user.click(lojaTab);

    // Act (Edita dados da loja)
    const tradeNameInput = screen.getByLabelText(/nome fantasia \*/i);
    const cnpjInput = screen.getByLabelText(/cnpj \*/i);

    await user.clear(tradeNameInput);
    await user.type(tradeNameInput, "Acelera Auto Filial Sul");

    await user.clear(cnpjInput);
    await user.type(cnpjInput, "98.765.432/0001-10");

    // Assert (Valida valores preenchidos)
    expect(tradeNameInput).toHaveValue("Acelera Auto Filial Sul");
    expect(cnpjInput).toHaveValue("98.765.432/0001-10");
  });

  it("[IT-10.5] Deve atualizar os parâmetros de SLA e meta mensal de vendas", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<SettingsPage />);

    const slaTab = screen.getByRole("tab", {
      name: /parâmetros do crm & sla/i,
    });
    await user.click(slaTab);

    // Act (Edita meta e SLA)
    const goalInput = screen.getByLabelText(/meta mensal de vendas da loja/i);
    const slaInput = screen.getByLabelText(/sla alvo de 1º contato/i);
    const alertCheckbox = screen.getByRole("checkbox");

    await user.clear(goalInput);
    await user.type(goalInput, "3500000");

    await user.clear(slaInput);
    await user.type(slaInput, "10");

    // Alterna o checkbox
    await user.click(alertCheckbox);

    // Assert
    expect(goalInput).toHaveValue(3500000);
    expect(slaInput).toHaveValue(10);
    expect(alertCheckbox).not.toBeChecked();
  });

  it("[IT-10.6] Deve alternar toggles de notificação e seleção do tema visual", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<SettingsPage />);

    const prefTab = screen.getByRole("tab", {
      name: /preferências & notificações/i,
    });
    await user.click(prefTab);

    // Act (Alterna tema e notificações)
    const themeSelect = screen.getByLabelText(/tema visual da aplicação/i);
    const checkboxes = screen.getAllByRole("checkbox");
    const whatsappCheckbox = checkboxes[0];

    await user.selectOptions(themeSelect, "dark");
    await user.click(whatsappCheckbox);

    // Assert
    expect(themeSelect).toHaveValue("dark");
    expect(whatsappCheckbox).not.toBeChecked();
  });
});

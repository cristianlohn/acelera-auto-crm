/**
 * @file clients-page.test.tsx
 * @description Suíte de Testes de Integração da Página de Gestão de Clientes (ClientsPage).
 *
 * ============================================================================
 * ESCOPO DE TESTE & RASTREABILIDADE (SUT: ClientsPage)
 * ============================================================================
 * Funcionalidades e Fluxos Testados:
 *   - [IT-09.1]: Renderização dos 4 cards de KPIs da carteira de clientes (Total, Ativos, Vendas, Ticket Médio).
 *   - [IT-09.2]: Renderização do grid de clientes populado com dados da carteira inicial.
 *   - [IT-09.3]: Busca instantânea reativa por nome do cliente.
 *   - [IT-09.4]: Busca instantânea reativa por número de telefone/WhatsApp.
 *   - [IT-09.5]: Exibição do estado vazio amigável (Empty State) para buscas sem correspondência.
 *   - [IT-09.6]: Filtragem reativa por abas de status de relacionamento (Todos, Ativos, Compradores, Inativos).
 *   - [IT-09.7]: Abertura do modal de cadastro, validação de campos obrigatórios e inserção do cliente no topo.
 *   - [IT-09.8]: Validação do deep-link codificado do WhatsApp com prefixo DDI 55 e mensagem amigável.
 *
 * Padrão Estrutural: AAA (Arrange, Act, Assert)
 * Ambiente de Execução: Happy-DOM / Vitest / Testing Library
 * ============================================================================
 */

import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClientsPage, { buildClientWhatsAppUrl } from "@/app/(dashboard)/clients/page";

// ---------------------------------------------------------------------------
// [IT-09] Gestão de Clientes e Carteira de Relacionamento
// ---------------------------------------------------------------------------

describe("[IT-09] Gestão de Clientes (ClientsPage)", () => {
  it("[IT-09.1] Deve renderizar os 4 cards de KPIs com contadores e valores formatados em BRL", () => {
    // Arrange & Act (Dado que a tela de Clientes é montada)
    render(<ClientsPage />);

    // Assert (Então os 4 cards de métricas devem estar presentes no DOM)
    expect(screen.getByText("Total de Clientes")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();

    expect(screen.getByText("Clientes Ativos")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    expect(screen.getByText("Vendas na Carteira")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    expect(screen.getByText("Ticket Médio da Base")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?139\.300/)).toBeInTheDocument();
  });

  it("[IT-09.2] Deve renderizar a listagem populada com múltiplos clientes", () => {
    // Arrange & Act (Quando a página é carregada)
    render(<ClientsPage />);

    // Assert (Então múltiplos cards com tag <article> devem estar presentes)
    const cards = screen.getAllByRole("article");
    expect(cards.length).toBe(6);

    expect(screen.getByText("Mariana Souza")).toBeInTheDocument();
    expect(screen.getByText("Carlos Mendonça")).toBeInTheDocument();
    expect(screen.getByText("Roberto Silveira")).toBeInTheDocument();
  });

  it("[IT-09.3] Deve filtrar a listagem instantaneamente ao buscar por nome de cliente", async () => {
    // Arrange (Dado o catálogo com múltiplos clientes)
    const user = userEvent.setup();
    render(<ClientsPage />);

    const searchInput = screen.getByRole("searchbox", {
      name: /buscar clientes/i,
    });
    expect(screen.getByText("Mariana Souza")).toBeInTheDocument();
    expect(screen.getByText("Roberto Silveira")).toBeInTheDocument();

    // Act (Quando o usuário digita 'Mariana' na busca)
    await user.type(searchInput, "Mariana");

    // Assert (Apenas Mariana Souza permanece visível)
    expect(screen.getByText("Mariana Souza")).toBeInTheDocument();
    expect(screen.queryByText("Roberto Silveira")).not.toBeInTheDocument();
    expect(screen.queryByText("Carlos Mendonça")).not.toBeInTheDocument();
  });

  it("[IT-09.4] Deve filtrar a listagem ao buscar pelo número de telefone", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<ClientsPage />);

    const searchInput = screen.getByRole("searchbox", {
      name: /buscar clientes/i,
    });

    // Act (Quando o usuário busca pelo telefone de Roberto '21988887777')
    await user.type(searchInput, "21988887777");

    // Assert (Apenas o card do Roberto deve estar visível)
    expect(screen.getByText("Roberto Silveira")).toBeInTheDocument();
    expect(screen.queryByText("Mariana Souza")).not.toBeInTheDocument();
  });

  it("[IT-09.5] Deve exibir o estado vazio (Empty State) quando nenhum cliente for encontrado", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<ClientsPage />);

    const searchInput = screen.getByRole("searchbox", {
      name: /buscar clientes/i,
    });

    // Act (Quando buscamos por um termo sem correspondência)
    await user.type(searchInput, "ClienteInexistenteXYZ");

    // Assert (Então a mensagem de nenhum resultado é exibida)
    expect(
      screen.getByRole("heading", { name: /nenhum cliente encontrado/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nenhum resultado para "ClienteInexistenteXYZ"/i)
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  it("[IT-09.6] Deve filtrar os clientes ao alternar entre as abas de status (Todos, Ativos, Compradores, Inativos)", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<ClientsPage />);

    // Act 1 (Quando o usuário clica na aba 'Ativos')
    const activeTab = screen.getByRole("tab", { name: "Ativos" });
    await user.click(activeTab);

    // Assert 1 (Então clientes inativos ou compradores não devem aparecer)
    expect(screen.getByText("Carlos Mendonça")).toBeInTheDocument();
    expect(screen.getByText("Aline Gomes")).toBeInTheDocument();
    expect(screen.queryByText("Mariana Souza")).not.toBeInTheDocument(); // Mariana é Compradora

    // Act 2 (Quando clica na aba 'Compradores')
    const buyersTab = screen.getByRole("tab", { name: "Compradores" });
    await user.click(buyersTab);

    // Assert 2 (Clientes que já compraram aparecem)
    expect(screen.getByText("Mariana Souza")).toBeInTheDocument();
    expect(screen.getByText("Roberto Silveira")).toBeInTheDocument();
    expect(screen.queryByText("Carlos Mendonça")).not.toBeInTheDocument();

    // Act 3 (Quando clica na aba 'Inativos')
    const inactivesTab = screen.getByRole("tab", { name: "Inativos" });
    await user.click(inactivesTab);

    // Assert 3 (Clientes inativos aparecem)
    expect(screen.getByText("Eduardo Castro")).toBeInTheDocument();
    expect(screen.queryByText("Mariana Souza")).not.toBeInTheDocument();

    // Act 4 (Quando retorna para 'Todos')
    const todosTab = screen.getByRole("tab", { name: "Todos" });
    await user.click(todosTab);

    // Assert 4 (Todos voltam a ser listados)
    expect(screen.getAllByRole("article")).toHaveLength(6);
  });

  it("[IT-09.7] Deve abrir o modal, validar campos obrigatórios, cadastrar novo cliente e inseri-lo no topo", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<ClientsPage />);

    const addClientBtn = screen.getByRole("button", {
      name: /adicionar novo cliente à base/i,
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Act 1 (Abre o modal de cadastro)
    await user.click(addClientBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/ex: mariana souza/i);
    const phoneInput = screen.getByPlaceholderText(/ex: 47998877665/i);
    const submitBtn = screen.getByRole("button", { name: /cadastrar cliente/i });

    // Assert 1 (Submissão bloqueada se nome ou telefone estiverem vazios)
    expect(submitBtn).toBeDisabled();

    // Act 2 (Preenche os dados do cliente)
    await user.type(nameInput, "Guilherme Santos");
    await user.type(phoneInput, "11988776655");
    await user.type(screen.getByPlaceholderText(/ex: mariana@email\.com/i), "guilherme@email.com");
    await user.type(screen.getByPlaceholderText(/ex: corolla cross xre/i), "BMW 320i M Sport");

    expect(submitBtn).not.toBeDisabled();

    // Act 3 (Submete o formulário)
    await act(async () => {
      await user.click(submitBtn);
    });

    // Assert 3 (O modal é fechado e o novo cliente aparece no topo da lista)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Guilherme Santos")).toBeInTheDocument();
    expect(screen.getByText("Interesse: BMW 320i M Sport")).toBeInTheDocument();
  });

  it("[IT-09.8] Deve gerar deep-link correto para WhatsApp com telefone sanitizado e mensagem codificada", () => {
    // Arrange (Dado um cliente com telefone com máscara)
    const client = {
      id: "test-c1",
      name: "Guilherme Santos",
      phone: "(11) 98877-6655",
      status: "ativo" as const,
      sellerName: "Rafael Alves",
      totalPurchased: 0,
      purchasesCount: 0,
      lastInteractionAt: null,
    };

    // Act (Quando a URL do WhatsApp é gerada)
    const url = buildClientWhatsAppUrl(client);

    // Assert (A URL deve conter o DDI 55, apenas dígitos e mensagem formatada)
    expect(url).toContain("https://wa.me/5511988776655");
    expect(url).toContain(encodeURIComponent("Olá Guilherme Santos!"));
    expect(url).toContain(encodeURIComponent("Acelera Auto"));
  });
});

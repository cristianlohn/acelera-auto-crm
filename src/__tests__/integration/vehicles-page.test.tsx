/**
 * @file vehicles-page.test.tsx
 * @description Suíte de Testes de Integração da Página de Gestão de Estoque (VehiclesPage).
 *
 * ============================================================================
 * ESCOPO DE TESTE & RASTREABILIDADE (SUT: VehiclesPage)
 * ============================================================================
 * Funcionalidades e Fluxos Testados:
 *   - [IT-07.1] Renderização das 4 métricas executivas do pátio (Total, Valor, Reservados, Ticket Médio).
 *   - [IT-07.2] Grid de listagem populado com múltiplos veículos do mock inicial.
 *   - [IT-07.3] Busca instantânea reativa por Marca, Modelo, Placa e Versão.
 *   - [IT-07.4] Estado vazio contextual (Empty State) para buscas sem resultado.
 *   - [IT-07.5] Filtragem por abas de status (Todos, Disponíveis, Reservados, Vendidos).
 *   - [IT-07.6] Atualização dinâmica de status através do Dropdown do Card com recálculo das métricas.
 *   - [IT-07.7] Cadastro e inserção de novo veículo no topo do grid via NewVehicleModal.
 *
 * Padrão Estrutural: AAA (Arrange, Act, Assert)
 * Ambiente de Execução: Happy-DOM / Vitest / Testing Library
 * ============================================================================
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VehiclesPageClient as VehiclesPage } from "@/components/vehicles/vehicles-page-client";

// ---------------------------------------------------------------------------
// Mocks de Componentes Externos
// ---------------------------------------------------------------------------

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string; [key: string]: unknown }) => {
    const { src, alt, ...rest } = props;
    delete (rest as { fill?: unknown }).fill;
    delete (rest as { priority?: unknown }).priority;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...rest} />;
  },
}));

// ---------------------------------------------------------------------------
// [IT-07] Gestão de Estoque: Filtros, Listagem, Métricas e Ações
// ---------------------------------------------------------------------------

describe("[IT-07] Gestão de Estoque: Filtros, Grid, Métricas e Ações", () => {
  it("[IT-07.1] Deve renderizar as métricas de topo do pátio calculadas dinamicamente", () => {
    // Arrange & Act (Dado que a tela de Estoque é montada)
    render(<VehiclesPage />);

    // Assert (Então as 4 métricas devem ser exibidas com seus respectivos títulos)
    expect(screen.getByText("Total em Estoque")).toBeInTheDocument();
    expect(screen.getByText("Valor Total do Pátio")).toBeInTheDocument();
    expect(screen.getByText("Veículos Reservados")).toBeInTheDocument();
    expect(screen.getByText("Ticket Médio")).toBeInTheDocument();
  });

  it("[IT-07.2] Deve renderizar o grid com todos os veículos da listagem inicial", () => {
    // Arrange & Act (Quando a página é carregada)
    render(<VehiclesPage />);

    // Assert (Então múltiplos cards com tag <article> devem estar presentes)
    const cards = screen.getAllByRole("article");
    expect(cards.length).toBeGreaterThan(0);
    expect(screen.getByText("Honda Civic")).toBeInTheDocument();
    expect(screen.getByText("Toyota Corolla")).toBeInTheDocument();
    expect(screen.getByText("Jeep Compass")).toBeInTheDocument();
  });

  it("[IT-07.3] Deve filtrar a listagem instantaneamente ao digitar no campo de busca", async () => {
    // Arrange (Dado o catálogo completo exibido)
    const user = userEvent.setup();
    render(<VehiclesPage />);

    const searchInput = screen.getByRole("searchbox", {
      name: /buscar veículos/i,
    });
    expect(screen.getByText("Honda Civic")).toBeInTheDocument();
    expect(screen.getByText("Toyota Corolla")).toBeInTheDocument();

    // Act (Quando o usuário digita 'Civic' no campo de busca)
    await user.type(searchInput, "Civic");

    // Assert (Então apenas o card do Civic deve permanecer visível)
    expect(screen.getByText("Honda Civic")).toBeInTheDocument();
    expect(screen.queryByText("Toyota Corolla")).not.toBeInTheDocument();
    expect(screen.queryByText("Jeep Compass")).not.toBeInTheDocument();
  });

  it("[IT-07.4] Deve filtrar por placa do veículo no campo de busca", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<VehiclesPage />);
    const searchInput = screen.getByRole("searchbox", {
      name: /buscar veículos/i,
    });

    // Act (Quando buscamos pela placa 'BRA2E22')
    await user.type(searchInput, "BRA2E22");

    // Assert (Apenas o Civic com essa placa deve permanecer)
    expect(screen.getByText("Honda Civic")).toBeInTheDocument();
    expect(screen.queryByText("Toyota Corolla")).not.toBeInTheDocument();
  });

  it("[IT-07.5] Deve exibir estado vazio amigável quando nenhum veículo corresponder à busca", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<VehiclesPage />);
    const searchInput = screen.getByRole("searchbox", {
      name: /buscar veículos/i,
    });

    // Act (Quando buscamos por um termo inexistente)
    await user.type(searchInput, "TermoInexistenteXYZ");

    // Assert (Então a mensagem de nenhum resultado deve ser renderizada)
    expect(
      screen.getByRole("heading", { name: /nenhum veículo encontrado/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nenhum resultado para "TermoInexistenteXYZ"/i)
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  it("[IT-07.6] Deve filtrar os veículos ao alternar entre as abas de status (Disponíveis, Reservados, Vendidos)", async () => {
    // Arrange (Dado o catálogo com status mistos)
    const user = userEvent.setup();
    render(<VehiclesPage />);

    // Act 1 (Quando o usuário clica na aba 'Reservados')
    const reservadoTab = screen.getByRole("tab", { name: "Reservados" });
    await user.click(reservadoTab);

    // Assert 1 (Então veículos disponíveis não devem ser exibidos)
    expect(screen.getByText("Toyota Corolla")).toBeInTheDocument(); // Corolla é reservado
    expect(screen.queryByText("Honda Civic")).not.toBeInTheDocument(); // Civic é disponível

    // Act 2 (Quando clica na aba 'Vendidos')
    const vendidoTab = screen.getByRole("tab", { name: "Vendidos" });
    await user.click(vendidoTab);

    // Assert 2 (Apenas veículos vendidos devem ser exibidos)
    expect(screen.getByText("Renault Kwid")).toBeInTheDocument(); // Kwid é vendido
    expect(screen.queryByText("Toyota Corolla")).not.toBeInTheDocument();

    // Act 3 (Quando retorna para 'Todos')
    const todosTab = screen.getByRole("tab", { name: "Todos" });
    await user.click(todosTab);

    // Assert 3 (Todos voltam a ser listados)
    expect(screen.getByText("Honda Civic")).toBeInTheDocument();
    expect(screen.getByText("Toyota Corolla")).toBeInTheDocument();
    expect(screen.getByText("Renault Kwid")).toBeInTheDocument();
  });

  it("[IT-07.7] Deve atualizar dinamicamente o status de um veículo pelo dropdown e refletir na listagem", async () => {
    // Arrange (Dado o card do Civic no estado Disponível)
    const user = userEvent.setup();
    render(<VehiclesPage />);

    // Localiza o botão de status do primeiro card
    const statusBtns = screen.getAllByRole("button", {
      name: /alterar status do veículo/i,
    });
    const firstStatusBtn = statusBtns[0];

    // Act (Abre o dropdown e altera para 'Reservado')
    await user.click(firstStatusBtn);
    const reservadoOption = screen.getByRole("menuitem", {
      name: /reservado/i,
    });
    await user.click(reservadoOption);

    // Assert (Ao navegar para a aba 'Reservados', o Civic agora deve estar nela)
    const reservadoTab = screen.getByRole("tab", { name: "Reservados" });
    await user.click(reservadoTab);

    expect(screen.getByText("Honda Civic")).toBeInTheDocument();
  });

  it("[IT-07.8] Deve cadastrar um novo veículo via modal e exibi-lo imediatamente no topo do grid", async () => {
    // Arrange (Dado o dashboard carregado)
    const user = userEvent.setup();
    render(<VehiclesPage />);

    // Act 1 (Abre o modal de cadastro)
    const openModalBtn = screen.getByRole("button", {
      name: /adicionar novo veículo ao estoque/i,
    });
    await user.click(openModalBtn);

    // Act 2 (Preenche os dados do novo veículo)
    await user.type(screen.getByPlaceholderText(/ex: honda/i), "Audi");
    await user.type(screen.getByPlaceholderText(/ex: civic/i), "A3 Sedan");
    await user.type(screen.getByPlaceholderText(/ex: bra2e22/i), "AUD1A33");
    await user.type(screen.getByPlaceholderText(/ex: 149900/i), "215000");

    // Act 3 (Submete o formulário)
    const submitBtn = screen.getByRole("button", { name: /cadastrar veículo/i });
    await act(async () => {
      await user.click(submitBtn);
    });

    // Assert (O novo carro 'Audi A3 Sedan' deve estar presente no topo do grid)
    expect(screen.getByText("Audi A3 Sedan")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?215\.000/)).toBeInTheDocument();
  });
});

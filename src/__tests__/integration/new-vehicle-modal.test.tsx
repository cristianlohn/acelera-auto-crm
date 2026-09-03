/**
 * @file new-vehicle-modal.test.tsx
 * @description Suíte de Testes de Integração do Modal de Cadastro de Veículo (NewVehicleModal).
 *
 * ============================================================================
 * ESCOPO DE TESTE & RASTREABILIDADE (SUT: NewVehicleModal / VehicleFormModal)
 * ============================================================================
 * Funcionalidades e Interações Testadas:
 *   - Abertura e fechamento do Dialog com controle de foco e acessibilidade.
 *   - Validação em tempo real dos campos obrigatórios (Marca, Modelo, Placa, Preço).
 *   - Habilitação/Desabilitação condicional do botão de submissão.
 *   - Galeria e seleção rápida de fotos mock automotivas (Sedã, SUV, Hatch, Pickup).
 *   - Submissão com `useTransition` e invocação do callback `onAdd` com entidade `Vehicle`.
 *
 * Padrão Estrutural: AAA (Arrange, Act, Assert)
 * Ambiente de Execução: Happy-DOM / Vitest / Testing Library
 * ============================================================================
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewVehicleModal } from "@/components/vehicles/new-vehicle-modal";
import type { Vehicle } from "@/types/crm";

// ---------------------------------------------------------------------------
// Helpers de Renderização
// ---------------------------------------------------------------------------

/**
 * Renderiza o modal com spy padrão para o callback onAdd.
 *
 * @param onAdd - Mock spy opcional para recepção do veículo cadastrado.
 * @returns Utilitários do testing-library e mock spy.
 */
function renderModal(onAdd = vi.fn()) {
  const utils = render(<NewVehicleModal onAdd={onAdd} />);
  return {
    ...utils,
    onAdd,
  };
}

// ---------------------------------------------------------------------------
// [IT-06] Ciclo de Vida, Formulário e Validação do Modal de Cadastro
// ---------------------------------------------------------------------------

describe("[IT-06] Ciclo de Vida e Formulário do Modal de Veículo", () => {
  it("[IT-06.1] Deve renderizar o botão de disparo e abrir o modal ao ser clicado", async () => {
    // Arrange (Dado o componente renderizado na tela)
    const user = userEvent.setup();
    renderModal();

    const triggerBtn = screen.getByRole("button", { name: /adicionar novo veículo/i });
    expect(triggerBtn).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Act (Quando o usuário clica no botão '+ Novo Veículo')
    await user.click(triggerBtn);

    // Assert (Então o dialog deve ser montado exibindo o título do modal)
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /cadastrar veículo/i })).toBeInTheDocument();
  });

  it("[IT-06.2] Deve fechar o modal e desmontar o formulário ao clicar no botão 'Cancelar'", async () => {
    // Arrange (Dado o modal aberto)
    const user = userEvent.setup();
    renderModal();
    const triggerBtn = screen.getByRole("button", { name: /adicionar novo veículo/i });
    await user.click(triggerBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Act (Quando o usuário clica em 'Cancelar')
    const cancelBtn = screen.getByRole("button", { name: /cancelar/i });
    await user.click(cancelBtn);

    // Assert (Então o modal deve ser fechado)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("[IT-06.3] Deve manter o botão 'Cadastrar Veículo' desabilitado enquanto os campos obrigatórios estiverem vazios", async () => {
    // Arrange (Dado o modal recém-aberto com formulário limpo)
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: /adicionar novo veículo/i }));

    // Act (Quando inspecionamos o botão de submissão)
    const submitBtn = screen.getByRole("button", { name: /cadastrar veículo/i });

    // Assert (Então o botão deve estar desabilitado)
    expect(submitBtn).toBeDisabled();
  });

  it("[IT-06.4] Deve habilitar o botão de submissão assim que Marca, Modelo, Placa e Preço forem preenchidos", async () => {
    // Arrange (Dado o modal aberto)
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: /adicionar novo veículo/i }));

    const makeInput = screen.getByPlaceholderText(/ex: honda/i);
    const modelInput = screen.getByPlaceholderText(/ex: civic/i);
    const plateInput = screen.getByPlaceholderText(/ex: bra2e22/i);
    const priceInput = screen.getByPlaceholderText(/ex: 149900/i);
    const submitBtn = screen.getByRole("button", { name: /cadastrar veículo/i });

    // Act (Quando preenchemos todos os campos mandatórios)
    await user.type(makeInput, "Volkswagen");
    await user.type(modelInput, "Golf");
    await user.type(plateInput, "ABC1D23");
    await user.type(priceInput, "120000");

    // Assert (Então o botão 'Cadastrar Veículo' deve ficar ativo)
    expect(submitBtn).not.toBeDisabled();
  });

  it("[IT-06.5] Deve preencher a URL da foto ao clicar nos botões rápidos de mock (Sedã, SUV, Hatch, Pickup)", async () => {
    // Arrange (Dado o modal aberto)
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: /adicionar novo veículo/i }));

    const urlInput = screen.getByPlaceholderText(/ou cole a url da foto/i);
    expect(urlInput).toHaveValue("");

    // Act 1 (Quando o usuário clica no atalho 'SUV')
    const suvButton = screen.getByRole("button", { name: "SUV" });
    await user.click(suvButton);

    // Assert 1 (Então o input de URL deve receber o link de SUV)
    expect(urlInput).toHaveValue("/vehicles/compass.jpg");

    // Act 2 (Quando clica no atalho 'Sedã')
    const sedaButton = screen.getByRole("button", { name: "Sedã" });
    await user.click(sedaButton);

    // Assert 2 (Então deve trocar a URL para a do Sedã)
    expect(urlInput).toHaveValue("/vehicles/civic.jpg");
  });

  it("[IT-06.6] Deve permitir preenchimento de campos opcionais (versão, km, combustível, status e notas)", async () => {
    // Arrange (Dado o formulário aberto)
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: /adicionar novo veículo/i }));

    // Act (Preenchemos campos opcionais)
    const versionInput = screen.getByPlaceholderText(/ex: exl 2\.0 flex aut\./i);
    const kmInput = screen.getByPlaceholderText(/ex: 45000/i);
    const statusSelect = screen.getByLabelText(/status comercial/i);
    const notesInput = screen.getByPlaceholderText(/ex: único dono, todas revisões/i);

    await user.type(versionInput, "GTI 2.0 Turbo");
    await user.type(kmInput, "45000");
    await user.selectOptions(statusSelect, "reservado");
    await user.type(notesInput, "IPVA 2026 pago, garantia de fábrica");

    // Assert (Valida que os campos retêm os valores preenchidos)
    expect(versionInput).toHaveValue("GTI 2.0 Turbo");
    expect(kmInput).toHaveValue(45000);
    expect(statusSelect).toHaveValue("reservado");
    expect(notesInput).toHaveValue("IPVA 2026 pago, garantia de fábrica");
  });

  it("[IT-06.7] Deve submeter o formulário com sucesso, chamar onAdd com a entidade completa e fechar o modal", async () => {
    // Arrange (Dado o modal e o spy onAdd)
    const user = userEvent.setup();
    let capturedVehicle: Vehicle | null = null;
    const onAddSpy = vi.fn((v: Vehicle) => {
      capturedVehicle = v;
    });

    renderModal(onAddSpy);
    await user.click(screen.getByRole("button", { name: /adicionar novo veículo/i }));

    // Preenchimento completo do veículo
    await user.type(screen.getByPlaceholderText(/ex: honda/i), "BMW");
    await user.type(screen.getByPlaceholderText(/ex: civic/i), "320i");
    await user.type(screen.getByPlaceholderText(/ex: exl 2\.0 flex aut\./i), "M Sport 2.0 Turbo");
    await user.type(screen.getByPlaceholderText(/ex: bra2e22/i), "BMW3I20");
    await user.type(screen.getByPlaceholderText(/ex: 45000/i), "12000");
    await user.type(screen.getByPlaceholderText(/ex: 149900/i), "329900");
    await user.selectOptions(screen.getByLabelText(/status comercial/i), "disponivel");

    const submitBtn = screen.getByRole("button", { name: /cadastrar veículo/i });
    expect(submitBtn).not.toBeDisabled();

    // Act (Quando submetemos o formulário)
    await act(async () => {
      await user.click(submitBtn);
    });

    // Assert (Então o callback onAdd deve ter sido chamado com a entidade estruturada e o modal deve fechar)
    expect(onAddSpy).toHaveBeenCalledTimes(1);
    expect(capturedVehicle).not.toBeNull();
    const result = capturedVehicle as unknown as Vehicle;
    expect(result).toMatchObject({
      make: "BMW",
      model: "320i",
      version: "M Sport 2.0 Turbo",
      plate: "BMW3I20",
      km: 12000,
      price: 329900,
      status: "disponivel",
    });
    expect(result.id).toBeDefined();

    // O modal deve ser fechado após a submissão
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

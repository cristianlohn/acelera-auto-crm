/**
 * @file add-lead-and-client-modal.test.tsx
 * @description Testes unitários para máscaras, validações de CPF/Telefone e opções de Roleta
 * nos modais de cadastro de Lead (Funil) e de Cliente (Carteira).
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddKanbanLeadModal } from "@/components/kanban/add-kanban-lead-modal";
import ClientsPage from "@/app/(dashboard)/clients/page";

// Mocks
vi.mock("@/app/actions/team-actions", () => ({
  getTeamMembersAction: vi.fn().mockResolvedValue([
    {
      id: "usr-01",
      name: "Rafael Alves",
      email: "rafael@loja.com",
      role: "seller",
      status: "active",
      in_roulette: true,
    },
    {
      id: "usr-02",
      name: "Juliana Costa",
      email: "juliana@loja.com",
      role: "seller",
      status: "active",
      in_roulette: true,
    },
  ]),
}));

vi.mock("@/app/actions/kanban-actions", () => ({
  createKanbanLeadAction: vi.fn().mockImplementation(async (input) => ({
    success: true,
    lead: {
      id: "lead-test-123",
      organization_id: "org-1",
      name: input.name,
      phone: input.phone,
      email: input.email,
      vehicle_of_interest: input.vehicle_of_interest,
      source: input.source || "patio",
      stage: input.stage || "new",
      assigned_to_name: input.assigned_to_name === "roleta" ? "Rafael Alves" : input.assigned_to_name,
      assigned_to: { id: "usr-01", name: "Rafael Alves" },
      sla_minutes: 0,
      sla_minutes_elapsed: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      value: 120000,
      segment: "all",
      notes: input.notes,
    },
  })),
}));

describe("[UNIT-MODALS] Modais de Cadastro de Lead no Funil e Cliente na Carteira", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AddKanbanLeadModal (Funil Kanban)", () => {
    it("deve abrir o modal de cadastro de lead, aplicar máscara no telefone e listar Roleta e vendedores reais", async () => {
      const user = userEvent.setup();
      const onLeadAdded = vi.fn();

      render(
        <AddKanbanLeadModal
          onLeadAdded={onLeadAdded}
          availableSellers={[
            { id: "usr-01", name: "Rafael Alves" },
            { id: "usr-02", name: "Juliana Costa" },
          ]}
        />
      );

      // 1. Abre o modal
      const openBtn = screen.getByRole("button", { name: /cadastrar novo lead diretamente no funil/i });
      await user.click(openBtn);

      expect(screen.getByText("Cadastrar Novo Lead no Funil")).toBeInTheDocument();

      // 2. Verifica a opção padrão de Roleta Automática
      const sellerSelect = screen.getByLabelText(/vendedor responsável/i);
      expect(sellerSelect).toHaveValue("roleta");
      expect(screen.getByText(/🎯 Roleta Automática/i)).toBeInTheDocument();

      // 3. Digita telefone e valida máscara progressiva
      const phoneInput = screen.getByPlaceholderText("(11) 98888-7777");
      await user.type(phoneInput, "11999887766");
      expect(phoneInput).toHaveValue("(11) 99988-7766");

      // 4. Preenche os demais campos obrigatórios
      const nameInput = screen.getByPlaceholderText("Ex: Carlos Silva");
      await user.type(nameInput, "Marcos Teste");

      const vehicleInput = screen.getByPlaceholderText("Ex: Jeep Compass Longitude 2024");
      await user.type(vehicleInput, "Honda Civic EXL 2023");

      // 5. Submete o formulário
      const submitBtn = screen.getByTestId("btn-submit-kanban-lead");
      await user.click(submitBtn);

      await waitFor(() => {
        expect(onLeadAdded).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Marcos Teste",
            phone: "(11) 99988-7766",
            vehicle_of_interest: "Honda Civic EXL 2023",
          })
        );
      });
    });
  });

  describe("AddClientModal (Carteira de Clientes)", () => {
    it("deve aplicar máscara de CPF e telefone e exibir aviso se o CPF for matematicamente inválido", async () => {
      const user = userEvent.setup();
      render(<ClientsPage />);

      // Abre o modal de cadastro de cliente
      const addBtn = screen.getByRole("button", { name: /adicionar novo cliente à base/i });
      await user.click(addBtn);

      expect(screen.getByText("Cadastrar Novo Cliente")).toBeInTheDocument();

      // Verifica opção de Roleta Automática no select de vendedores
      expect(screen.getByText(/🎯 Roleta Automática/i)).toBeInTheDocument();

      // Digita telefone com máscara
      const phoneInput = screen.getByPlaceholderText("(47) 99887-7665");
      await user.type(phoneInput, "47988887777");
      expect(phoneInput).toHaveValue("(47) 98888-7777");

      // Digita CPF inválido (sequência 11111111111)
      const docInput = screen.getByPlaceholderText("000.000.000-00");
      await user.type(docInput, "11111111111");
      expect(docInput).toHaveValue("111.111.111-11");

      // Deve exibir mensagem de erro e desabilitar botão de submissão
      expect(screen.getByText(/CPF inválido. Verifique os dígitos./i)).toBeInTheDocument();
      const submitBtn = screen.getByRole("button", { name: /cadastrar cliente/i });
      expect(submitBtn).toBeDisabled();

      // Corrige para um CPF matematicamente válido
      await user.clear(docInput);
      await user.type(docInput, "52998224725");
      expect(docInput).toHaveValue("529.982.247-25");
      expect(screen.queryByText(/CPF inválido/i)).not.toBeInTheDocument();

      // Preenche nome
      const nameInput = screen.getByPlaceholderText("Ex: Mariana Souza");
      await user.type(nameInput, "Cliente Teste Válido");

      expect(submitBtn).not.toBeDisabled();
    });
  });
});

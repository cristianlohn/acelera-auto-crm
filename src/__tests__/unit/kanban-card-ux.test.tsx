/**
 * @file kanban-card-ux.test.tsx
 * @description Testes unitários de UX para o KanbanCard: exibição de resumo de mensagem quando sem veículo e ocultação de valor zero.
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KanbanCard } from "@/components/kanban/kanban-card";
import type { KanbanLead } from "@/types/kanban";

describe("[UNIT-KANBAN-CARD-UX] Melhorias de UX no Card do Kanban", () => {
  const baseLead: KanbanLead = {
    id: "lead-ux-001",
    organization_id: "org-1",
    name: "Clara Fonseca",
    phone: "11988887777",
    source: "whatsapp",
    vehicle_of_interest: "",
    assigned_to: {
      id: "seller-1",
      name: "Rafael Martins",
    },
    assigned_to_name: "Rafael Martins",
    stage: "new",
    sla_minutes: 15,
    sla_minutes_elapsed: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("deve substituir texto genérico pelo resumo da primeira mensagem do cliente (notes ou last_message)", () => {
    const leadWithoutVehicle: KanbanLead = {
      ...baseLead,
      vehicle_of_interest: "Interesse Geral via WhatsApp",
      notes: "Lead criado via WhatsApp: Olá, tenho um usado na troca e gostaria de avaliar",
    };

    render(<KanbanCard lead={leadWithoutVehicle} />);

    const vehicleElement = screen.getByTestId("lead-vehicle");
    expect(vehicleElement.textContent).toBe("Olá, tenho um usado na troca e gostaria de avaliar");
    expect(vehicleElement.textContent).not.toContain("Interesse Geral via WhatsApp");
  });

  it("deve priorizar last_message sobre notes quando ambos estiverem disponíveis", () => {
    const leadWithMessage: KanbanLead = {
      ...baseLead,
      vehicle_of_interest: "Veículo de Interesse",
      notes: "Notas internas do consultor",
      last_message: "Quero saber o valor da parcela para 48x",
    };

    render(<KanbanCard lead={leadWithMessage} />);

    const vehicleElement = screen.getByTestId("lead-vehicle");
    expect(vehicleElement.textContent).toBe("Quero saber o valor da parcela para 48x");
    expect(vehicleElement.textContent).not.toContain("Veículo de Interesse");
  });

  it("deve ocultar o valor '0' ou nulo quando o lead não possui preço ou veículo vinculado", () => {
    const leadWithZeroPrice: KanbanLead = {
      ...baseLead,
      vehicle_of_interest: "Interesse Geral",
      notes: "Quero ver opções de SUV",
      value: 0,
      estimated_value: 0,
    };

    const { container } = render(<KanbanCard lead={leadWithZeroPrice} />);

    // Não deve renderizar nenhum elemento com "0" ou "R$ 0" isolado
    const priceText = container.querySelector(".text-emerald-600");
    expect(priceText).toBeNull();
    expect(container.textContent).not.toContain("R$ 0,00");
    expect(container.textContent).not.toContain("Sob consulta");
  });

  it("deve exibir normalmente o nome do veículo e o preço formatado quando houver veículo específico e valor positivo", () => {
    const leadWithSpecificVehicle: KanbanLead = {
      ...baseLead,
      vehicle_of_interest: "Toyota Corolla Cross XRE 2024",
      value: 168000,
    };

    const { container } = render(<KanbanCard lead={leadWithSpecificVehicle} />);

    const vehicleElement = screen.getByTestId("lead-vehicle");
    expect(vehicleElement.textContent).toBe("Toyota Corolla Cross XRE 2024");

    const priceText = container.querySelector(".text-emerald-600");
    expect(priceText).not.toBeNull();
    expect(priceText?.textContent).toContain("168.000");
  });
});

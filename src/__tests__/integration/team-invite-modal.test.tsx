/**
 * @file team-invite-modal.test.tsx
 * @description Suíte de Testes de Integração para a Interface de Cadastro de Vendedor e Contingência de Convite.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SalespersonModal } from "@/components/team/salesperson-modal";
import { TeamTable } from "@/components/team/team-table";
import * as teamActions from "@/app/actions/team-actions";
import type { TeamMember } from "@/types/team";

describe("[IT-TEAM-MODAL] Modal de Cadastro de Vendedor e Opções de Contingência", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("[IT-MODAL.1] Deve cadastrar vendedor e exibir painel de sucesso com opções de contingência (Copiar Link e WhatsApp)", async () => {
    const mockMember: TeamMember = {
      id: "sp-new-999",
      organization_id: "org-1",
      name: "Rodrigo Mendonça",
      email: "rodrigo.mendonca@acelera.com",
      phone: "+5511988887777",
      role: "seller",
      segment: "all",
      in_roulette: true,
      status: "active",
      monthly_goal_units: 10,
      current_sales_units: 0,
      avg_sla_minutes: 0,
      created_at: new Date().toISOString(),
    };

    const spyCreate = vi.spyOn(teamActions, "createSalespersonAction").mockResolvedValueOnce({
      success: true,
      emailSent: true,
      fallbackInviteLink: "https://aceleraauto.com.br/auth/update-password?token=contingency_123",
      member: mockMember,
    });

    const mockOnSuccess = vi.fn();
    const mockOnClose = vi.fn();

    render(
      <SalespersonModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Preenche os campos obrigatórios
    const nameInput = screen.getByTestId("input-seller-name");
    const emailInput = screen.getByTestId("input-seller-email");
    const phoneInput = screen.getByTestId("input-seller-phone");

    fireEvent.change(nameInput, { target: { value: "Rodrigo Mendonça" } });
    fireEvent.change(emailInput, { target: { value: "rodrigo.mendonca@acelera.com" } });
    fireEvent.change(phoneInput, { target: { value: "11988887777" } });

    // Submete o formulário
    const submitBtn = screen.getByTestId("btn-submit-salesperson");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(spyCreate).toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalledWith(mockMember);
    });

    // Verifica que o painel de contingência apareceu
    expect(await screen.findByTestId("invite-success-container")).toBeInTheDocument();
    expect(screen.getByText("Vendedor Cadastrado com Sucesso!")).toBeInTheDocument();
    expect(screen.getByText(/O convite foi enviado para o e-mail do vendedor/i)).toBeInTheDocument();
    expect(screen.getByTestId("btn-copy-invite-link")).toBeInTheDocument();
    expect(screen.getByTestId("btn-send-invite-whatsapp")).toBeInTheDocument();

    const whatsappLink = screen.getByTestId("btn-send-invite-whatsapp");
    expect(whatsappLink).toHaveAttribute("href", expect.stringContaining("https://wa.me/5511988887777"));
    expect(whatsappLink).toHaveAttribute("href", expect.stringContaining("contingency_123"));

    // Clica em concluir
    const finishBtn = screen.getByTestId("btn-finish-invite");
    fireEvent.click(finishBtn);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("[IT-MODAL.2] Deve permitir reenviar e-mail de convite na TeamTable", async () => {
    const mockMembers: TeamMember[] = [
      {
        id: "sp-001",
        organization_id: "org-1",
        name: "Juliana Silva",
        email: "juliana@loja.com.br",
        phone: "+5511988889999",
        role: "seller",
        segment: "all",
        in_roulette: true,
        status: "active",
        monthly_goal_units: 10,
        current_sales_units: 3,
        avg_sla_minutes: 4.5,
        created_at: new Date().toISOString(),
      },
    ];

    const spyResend = vi.spyOn(teamActions, "resendInviteEmailAction").mockResolvedValueOnce({
      success: true,
      emailSent: true,
      fallbackInviteLink: "https://aceleraauto.com.br/auth/update-password?token=resend_token",
    });

    render(<TeamTable members={mockMembers} />);

    // Localiza o botão de opções do vendedor
    const optionsButtons = screen.getAllByRole("button");
    const moreBtn = optionsButtons.find((btn) => btn.querySelector("svg.lucide-more-vertical"));
    if (moreBtn) {
      fireEvent.click(moreBtn);
      const resendItem = await screen.findByTestId("btn-resend-invite-sp-001");
      fireEvent.click(resendItem);
      expect(spyResend).toHaveBeenCalledWith("juliana@loja.com.br", "Juliana Silva", "seller");
    }
  });
});

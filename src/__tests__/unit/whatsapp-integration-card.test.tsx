/**
 * @file whatsapp-integration-card.test.tsx
 * @description Testes unitários para o componente WhatsAppIntegrationCard.
 * Valida a exatidão de copywriting, badges da Evolution API v2, estados de conexão e notas operacionais.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WhatsAppIntegrationCard } from "@/components/settings/whatsapp-integration-card";
import * as whatsappActions from "@/app/actions/whatsapp-actions";

vi.mock("@/app/actions/whatsapp-actions", () => ({
  getWhatsAppStatusAction: vi.fn(),
  connectWhatsAppAction: vi.fn(),
  disconnectWhatsAppAction: vi.fn(),
}));

describe("[UNIT-WA-CARD] Componente WhatsAppIntegrationCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[TEST-WA-CARD-1] deve renderizar o cabeçalho, subtítulo e badges informativos da Evolution v2", async () => {
    vi.mocked(whatsappActions.getWhatsAppStatusAction).mockResolvedValue({
      success: true,
      connected: false,
      status: "disconnected",
      instanceName: "acelera_demo_inst",
    });

    render(<WhatsAppIntegrationCard />);

    // 1. Título do Card
    expect(
      screen.getByRole("heading", { name: "Alertas & Notificações via WhatsApp" })
    ).toBeInTheDocument();

    // 2. Badges de Identificação Precisos
    expect(screen.getByText("Instância Evolution v2")).toBeInTheDocument();
    expect(screen.getByText("Bot Transacional")).toBeInTheDocument();

    // 3. Proibição de termos contraditórios ou enganosos
    expect(screen.queryByText(/api oficial/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/oficial meta/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/meta cloud api/i)).not.toBeInTheDocument();

    // 4. Subtítulo / Descrição
    expect(
      screen.getByText(
        "Conecte uma instância para disparo automatizado de novos leads da roleta e avisos de SLA diretamente no celular da sua equipe."
      )
    ).toBeInTheDocument();
  });

  it("[TEST-WA-CARD-2] deve exibir status 'Instância Desconectada' quando desconectado", async () => {
    vi.mocked(whatsappActions.getWhatsAppStatusAction).mockResolvedValue({
      success: true,
      connected: false,
      status: "disconnected",
      instanceName: "acelera_demo_inst",
    });

    render(<WhatsAppIntegrationCard />);

    await waitFor(() => {
      expect(screen.getByText("Instância Desconectada")).toBeInTheDocument();
    });

    expect(screen.getByText("Nenhum aparelho conectado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /conectar whatsapp \/ gerar qr code/i })).toBeInTheDocument();
  });

  it("[TEST-WA-CARD-3] deve exibir status 'Instância Conectada' e detalhes da instância ativa", async () => {
    vi.mocked(whatsappActions.getWhatsAppStatusAction).mockResolvedValue({
      success: true,
      connected: true,
      status: "connected",
      instanceName: "acelera-auto-loja-01",
    });

    render(<WhatsAppIntegrationCard />);

    await waitFor(() => {
      expect(screen.getByText("Instância Conectada")).toBeInTheDocument();
    });

    expect(screen.getByText("Instância Ativa e Pronta para Disparo")).toBeInTheDocument();
    expect(screen.getByText(/acelera-auto-loja-01/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /desconectar aparelho/i })).toBeInTheDocument();
  });

  it("[TEST-WA-CARD-4] deve exibir 'Aguardando Leitura' e instruções quando em processo de conexão", async () => {
    const user = userEvent.setup();
    vi.mocked(whatsappActions.getWhatsAppStatusAction).mockResolvedValue({
      success: true,
      connected: false,
      status: "connecting",
      instanceName: "acelera_demo_inst",
      qrCode: "data:image/png;base64,mockQRCode",
    });
    vi.mocked(whatsappActions.connectWhatsAppAction).mockResolvedValue({
      success: true,
      status: "connecting",
      instanceName: "acelera_demo_inst",
      pairingCode: "ABC-1234",
      qrCode: "data:image/png;base64,mockQRCode",
    });

    render(<WhatsAppIntegrationCard />);

    await waitFor(() => {
      expect(screen.getByText("Aguardando Leitura")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("heading", { name: /como conectar em 3 passos/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/aguardando leitura do aparelho\.\.\./i)).toBeInTheDocument();

    // Recarrega QR / Pareamento
    const reloadBtn = screen.getByRole("button", { name: /recarregar qr code/i });
    await user.click(reloadBtn);

    await waitFor(() => {
      expect(screen.getByText("ABC-1234")).toBeInTheDocument();
    });
  });

  it("[TEST-WA-CARD-5] deve renderizar a Seção de Escopo Operacional em grid", async () => {
    vi.mocked(whatsappActions.getWhatsAppStatusAction).mockResolvedValue({
      success: true,
      connected: false,
      status: "disconnected",
      instanceName: "acelera_demo_inst",
    });

    render(<WhatsAppIntegrationCard />);

    // Bloco: Avisos da Roleta
    expect(screen.getByText("Avisos da Roleta")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Envio imediato da ficha de novos leads no WhatsApp privado do vendedor escalado."
      )
    ).toBeInTheDocument();

    // Bloco: Atendimento Descentralizado
    expect(screen.getByText("Atendimento Descentralizado")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Contato direto com o cliente via 1-Clique abrindo o WhatsApp do próprio corretor."
      )
    ).toBeInTheDocument();
  });

  it("[TEST-WA-CARD-6] deve renderizar a Nota Operacional de Rodapé esclarecendo arquitetura e custos", async () => {
    vi.mocked(whatsappActions.getWhatsAppStatusAction).mockResolvedValue({
      success: true,
      connected: false,
      status: "disconnected",
      instanceName: "acelera_demo_inst",
    });

    render(<WhatsAppIntegrationCard />);

    expect(screen.getByText("Nota de Operação:")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Esta conexão é dedicada exclusivamente ao bot disparador de alertas da concessionária\. O atendimento aos clientes permanece direto e descentralizado no aparelho do vendedor, sem cobrança de taxas por conversa da Meta\./i
      )
    ).toBeInTheDocument();
  });

  it("[TEST-WA-CARD-7] deve renderizar o título unificado e os 2 superpoderes ativos (Captura Automática & Alertas)", async () => {
    vi.mocked(whatsappActions.getWhatsAppStatusAction).mockResolvedValue({
      success: true,
      connected: false,
      status: "disconnected",
      instanceName: "acelera_demo_inst",
    });

    render(<WhatsAppIntegrationCard />);

    // Título unificado
    expect(
      screen.getByRole("heading", {
        name: "WhatsApp Comercial da Loja (2 em 1: Entrada de Leads & Alertas)",
      })
    ).toBeInTheDocument();

    // Badge 2 em 1
    expect(screen.getByText("2 em 1: Entrada + Alertas")).toBeInTheDocument();

    // Superpoder 1: Captura Automática
    expect(screen.getByText("Captura Automática")).toBeInTheDocument();
    expect(
      screen.getByText("Mensagens de clientes novos viram leads na roleta com SLA de 15 min.")
    ).toBeInTheDocument();

    // Superpoder 2: Alertas da Equipe
    expect(screen.getByText("Alertas da Equipe")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Seus vendedores recebem aviso imediato no WhatsApp quando um lead for distribuído."
      )
    ).toBeInTheDocument();
  });

  it("[TEST-WA-CARD-8] deve exibir a URL do webhook e permitir copiar quando perfil for admin/gerente", async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    vi.mocked(whatsappActions.getWhatsAppStatusAction).mockResolvedValue({
      success: true,
      connected: true,
      status: "connected",
      instanceName: "acelera_loja_matriz",
    });

    render(
      <WhatsAppIntegrationCard
        webhookToken="token-xyz-987"
        userRole="admin"
      />
    );

    const webhookInput = screen.getByLabelText(/URL do Webhook de Entrada/i);
    expect(webhookInput).toBeInTheDocument();
    expect(webhookInput).toHaveValue(
      "https://aceleraautocrm.com.br/api/webhooks/whatsapp?token=token-xyz-987"
    );

    const copyBtn = screen.getByRole("button", { name: /copiar webhook/i });
    await user.click(copyBtn);

    expect(writeTextSpy).toHaveBeenCalledWith(
      "https://aceleraautocrm.com.br/api/webhooks/whatsapp?token=token-xyz-987"
    );
    expect(screen.getByText("Copiado!")).toBeInTheDocument();
  });

  it("[TEST-WA-CARD-9] deve restringir a exibição da URL do webhook para perfis de vendedor (RBAC)", async () => {
    vi.mocked(whatsappActions.getWhatsAppStatusAction).mockResolvedValue({
      success: true,
      connected: true,
      status: "connected",
      instanceName: "acelera_loja_matriz",
    });

    render(
      <WhatsAppIntegrationCard
        webhookToken="token-secret-123"
        userRole="vendedor"
      />
    );

    expect(
      screen.queryByLabelText(/URL do Webhook de Entrada/i)
    ).not.toBeInTheDocument();

    expect(
      screen.getByText("Tokens e URLs de integração visíveis apenas para Gestores e Administradores.")
    ).toBeInTheDocument();
  });
});


/**
 * @file vehicle-card.test.tsx
 * @description Suíte de Testes de Integração do Componente VehicleCard.
 *
 * ============================================================================
 * ESCOPO DE INTEGRAÇÃO & RASTREABILIDADE (SUT: VehicleCard)
 * ============================================================================
 * Integrações Validadas:
 *   1. React DOM & Component Lifecycle: Renderização de propriedades, formatação e bindings.
 *   2. Browser Web APIs: Mock e espionagem da Clipboard API (`navigator.clipboard.writeText`).
 *   3. UI Component Interoperability: Radix UI Dropdown Menu, Lucide Icons, Tailwind Badges.
 *   4. Event Propagation & Callbacks: Disparo de handlers com argumentos estritos de domínio.
 *
 * Padrão Estrutural: AAA (Arrange, Act, Assert)
 * Ambiente de Execução: Happy-DOM / Vitest / Testing Library
 * ============================================================================
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import type { Vehicle, VehicleStatus } from "@/types/crm";

// ---------------------------------------------------------------------------
// Mocks de Infraestrutura e Componentes Externos
// ---------------------------------------------------------------------------

/**
 * Mock do componente `next/image` para compatibilidade leve no ambiente de teste DOM.
 * Converte para tag `<img>` nativa garantindo que atributos internos não gerem warnings no console.
 */
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
// Fixtures e Fábrica de Objetos de Teste
// ---------------------------------------------------------------------------

const mockVehicleFixture: Vehicle = {
  id: "v-qa-test-001",
  make: "Honda",
  model: "Civic",
  version: "EXL 2.0 Flex Aut.",
  yearFab: 2022,
  yearModel: 2023,
  plate: "BRA2E22",
  km: 18500,
  price: 149900,
  status: "disponivel",
  imageUrl: "https://images.unsplash.com/photo-vehicle-test?w=800",
};

/**
 * Helper para renderização parametrizada do card de veículo.
 *
 * @param overrides - Propriedades para sobrescrever no fixture padrão.
 * @param onStatusChange - Mock spy para o callback de alteração de status.
 * @returns Objeto com métodos do testing-library e referências das props.
 */
function renderVehicleCard(
  overrides: Partial<Vehicle> = {},
  onStatusChange = vi.fn()
) {
  const vehicle: Vehicle = { ...mockVehicleFixture, ...overrides };
  const utils = render(
    <VehicleCard vehicle={vehicle} onStatusChange={onStatusChange} />
  );

  return {
    ...utils,
    vehicle,
    onStatusChange,
  };
}

// ---------------------------------------------------------------------------
// [IT-01] Renderização das Propriedades Essenciais do Veículo
// ---------------------------------------------------------------------------

describe("[IT-01] Renderização das Propriedades Essenciais do Veículo", () => {
  it("[IT-01.1] Deve renderizar título com Marca e Modelo em destaque", () => {
    // Arrange (Dado um veículo cadastrado no estoque)
    const { vehicle } = renderVehicleCard();

    // Act (Quando o card é montado no DOM)
    const titleElement = screen.getByRole("heading", { level: 3 });

    // Assert (Então deve conter 'Honda Civic')
    expect(titleElement).toHaveTextContent(`${vehicle.make} ${vehicle.model}`);
  });

  it("[IT-01.2] Deve exibir a versão/motorização do veículo", () => {
    // Arrange (Dado o veículo com versão específica)
    renderVehicleCard();

    // Act & Assert (Então a versão deve estar visível no card)
    expect(screen.getByText("EXL 2.0 Flex Aut.")).toBeInTheDocument();
  });

  it("[IT-01.3] Deve renderizar o preço de venda formatado em padrão monetário BRL", () => {
    // Arrange (Dado o preço de 149.900)
    renderVehicleCard({ price: 149900 });

    // Act & Assert (Então deve exibir 'R$ 149.900')
    expect(screen.getByText(/R\$\s?149\.900/)).toBeInTheDocument();
  });

  it("[IT-01.4] Deve renderizar a quilometragem com sufixo e formatação pt-BR", () => {
    // Arrange (Dado 18.500 km)
    renderVehicleCard({ km: 18500 });

    // Act & Assert (Então deve exibir '18.500 km')
    expect(screen.getByText("18.500 km")).toBeInTheDocument();
  });

  it("[IT-01.5] Deve exibir o final da placa para identificação rápida no pátio", () => {
    // Arrange (Dado a placa Mercosul 'BRA2E22')
    renderVehicleCard({ plate: "BRA2E22" });

    // Act & Assert (Então deve exibir os 3 dígitos finais '...E22')
    expect(screen.getByText("...E22")).toBeInTheDocument();
  });

  it("[IT-01.6] Deve exibir a relação de Anos de Fabricação e Modelo (Ano Fab/Mod)", () => {
    // Arrange (Dado ano de fabricação 2022 e modelo 2023)
    renderVehicleCard({ yearFab: 2022, yearModel: 2023 });

    // Act & Assert (Então deve exibir '2022/2023')
    expect(screen.getByText("2022/2023")).toBeInTheDocument();
  });

  it("[IT-01.7] Deve conter acessibilidade semântica com tag <article> e aria-label contextual", () => {
    // Arrange (Dado o card montado)
    renderVehicleCard();

    // Act & Assert (Então deve existir um article com o nome completo do carro)
    expect(
      screen.getByRole("article", { name: /Honda Civic 2022/i })
    ).toBeInTheDocument();
  });

  it("[IT-01.8] Deve renderizar o fallback visual quando o carregamento da imagem falhar (onError)", () => {
    // Arrange (Dado o card montado com imagem)
    renderVehicleCard();
    const imgElement = screen.getByAltText("Honda Civic");

    // Act (Quando a imagem dispara evento de erro de carregamento)
    act(() => {
      fireEvent.error(imgElement);
    });

    // Assert (Então o fallback com o emoji de carro deve ser renderizado no lugar)
    expect(screen.getByText("🚗")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// [IT-02] Renderização e Classes Visuais dos Badges de Status
// ---------------------------------------------------------------------------

describe("[IT-02] Renderização e Estilos dos Badges de Status do Veículo", () => {
  it("[IT-02.1] Deve renderizar o badge 'Disponível' com indicador verde", () => {
    // Arrange (Dado um veículo com status 'disponivel')
    renderVehicleCard({ status: "disponivel" });

    // Act (Quando inspecionamos o badge)
    const badgeElement = screen.getByText("Disponível");

    // Assert (Então deve exibir o texto e estar presente no DOM)
    expect(badgeElement).toBeInTheDocument();
    expect(badgeElement.closest("span")).toHaveClass("bg-green-500/90");
  });

  it("[IT-02.2] Deve renderizar o badge 'Reservado' com indicador âmbar", () => {
    // Arrange (Dado um veículo com status 'reservado')
    renderVehicleCard({ status: "reservado" });

    // Act (Quando inspecionamos o badge)
    const badgeElement = screen.getByText("Reservado");

    // Assert (Então deve exibir o badge âmbar)
    expect(badgeElement).toBeInTheDocument();
    expect(badgeElement.closest("span")).toHaveClass("bg-amber-500/90");
  });

  it("[IT-02.3] Deve renderizar o badge 'Vendido' com indicador slate/cinza", () => {
    // Arrange (Dado um veículo com status 'vendido')
    renderVehicleCard({ status: "vendido" });

    // Act (Quando inspecionamos o badge)
    const badgeElement = screen.getByText("Vendido");

    // Assert (Então deve exibir o badge cinza)
    expect(badgeElement).toBeInTheDocument();
    expect(badgeElement.closest("span")).toHaveClass("bg-slate-500/90");
  });
});

// ---------------------------------------------------------------------------
// [IT-03] Fluxo de Cópia da Ficha Técnica para o Clipboard (Payload Formatado)
// ---------------------------------------------------------------------------

describe("[IT-03] Fluxo de Cópia da Ficha Técnica para Clipboard", () => {
  let writeTextSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Garante spy limpo e zerado na Clipboard API para isolamento total entre testes
    writeTextSpy = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
    writeTextSpy.mockClear();
  });

  it("[IT-03.1] Deve acionar a API navigator.clipboard.writeText exatamente 1 vez ao clicar no botão", async () => {
    // Arrange (Dado o card renderizado na tela)
    renderVehicleCard();
    const copyButton = screen.getByRole("button", { name: /copiar ficha/i });

    // Act (Quando o usuário clica em 'Copiar Ficha')
    await act(async () => {
      fireEvent.click(copyButton);
    });

    // Assert (Então o método de escrita na área de transferência deve ser chamado uma vez)
    expect(writeTextSpy).toHaveBeenCalledTimes(1);
  });

  it("[IT-03.2] Deve enviar payload formatado contendo todos os dados técnicos estruturados para WhatsApp", async () => {
    // Arrange (Dado um veículo com especificações completas)
    const customVehicle: Vehicle = {
      ...mockVehicleFixture,
      make: "Toyota",
      model: "Corolla",
      version: "XEI 2.0 Flex Aut.",
      yearFab: 2021,
      yearModel: 2022,
      plate: "CDA3F19",
      km: 34200,
      price: 134900,
      status: "reservado",
    };
    renderVehicleCard(customVehicle);
    const copyButton = screen.getByRole("button", { name: /copiar ficha/i });

    // Act (Quando acionado o clique de cópia)
    await act(async () => {
      fireEvent.click(copyButton);
    });

    // Assert (Então o texto enviado ao clipboard deve conter emojis e campos formatados)
    expect(writeTextSpy).toHaveBeenCalledTimes(1);
    const copiedPayload = writeTextSpy.mock.calls[0][0] as string;

    expect(copiedPayload).toContain("🚗 *Toyota Corolla — XEI 2.0 Flex Aut.*");
    expect(copiedPayload).toContain("📅 Ano: 2021/2022");
    expect(copiedPayload).toContain("🔢 Placa: *CDA3F19*");
    expect(copiedPayload).toContain("📏 KM: 34.200 km");
    expect(copiedPayload).toMatch(/💰 Preço: \*R\$\s?134\.900\*/);
    expect(copiedPayload).toContain("📌 Status: Reservado");
    expect(copiedPayload).toContain("_Aceito troca e financiamento.");
  });
});

// ---------------------------------------------------------------------------
// [IT-04] Feedback Visual Temporário de Confirmação de Cópia
// ---------------------------------------------------------------------------

describe("[IT-04] Feedback Visual de Confirmação no Botão de Cópia", () => {
  beforeEach(() => {
    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
  });

  it("[IT-04.1] Deve alterar o texto do botão para 'Copiado! ✓' imediatamente após o clique bem-sucedido", async () => {
    // Arrange (Dado o botão no estado inicial)
    renderVehicleCard();
    const copyButton = screen.getByRole("button", { name: /copiar ficha/i });
    expect(screen.queryByText(/Copiado!/i)).not.toBeInTheDocument();

    // Act (Quando o usuário clica para copiar)
    await act(async () => {
      fireEvent.click(copyButton);
    });

    // Assert (Então o texto 'Copiado!' deve ser exibido com ícone de confirmação)
    expect(screen.getByText(/Copiado!/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// [IT-05] Disparo do Callback onStatusChange ao Selecionar Novo Status no Dropdown
// ---------------------------------------------------------------------------

describe("[IT-05] Alteração Rápida de Status via Dropdown Menu", () => {
  it("[IT-05.1] Deve abrir o menu e disparar onStatusChange com 'reservado' ao selecionar opção correspondente", async () => {
    // Arrange (Dado o card de veículo disponível e o spy onStatusChange)
    const user = userEvent.setup();
    const onStatusChangeSpy = vi.fn();
    renderVehicleCard({ id: "v-qa-100", status: "disponivel" }, onStatusChangeSpy);

    // Act 1 (Quando o usuário abre o dropdown de status)
    const statusTriggerBtn = screen.getByRole("button", {
      name: /alterar status/i,
    });
    await user.click(statusTriggerBtn);

    // Act 2 (E seleciona a opção 'Reservado')
    const reservadoMenuItem = screen.getByRole("menuitem", {
      name: /reservado/i,
    });
    await user.click(reservadoMenuItem);

    // Assert (Então o callback deve ter sido invocado com o ID e o novo status 'reservado')
    expect(onStatusChangeSpy).toHaveBeenCalledTimes(1);
    expect(onStatusChangeSpy).toHaveBeenCalledWith(
      "v-qa-100",
      "reservado" satisfies VehicleStatus
    );
  });

  it("[IT-05.2] Deve disparar onStatusChange com 'vendido' ao concluir venda pelo menu", async () => {
    // Arrange (Dado o card ativo)
    const user = userEvent.setup();
    const onStatusChangeSpy = vi.fn();
    renderVehicleCard({ id: "v-qa-200", status: "reservado" }, onStatusChangeSpy);

    // Act (Quando abre o menu e clica em 'Vendido')
    const statusTriggerBtn = screen.getByRole("button", {
      name: /alterar status/i,
    });
    await user.click(statusTriggerBtn);

    const vendidoMenuItem = screen.getByRole("menuitem", { name: /vendido/i });
    await user.click(vendidoMenuItem);

    // Assert (Então o status 'vendido' deve ser transmitido)
    expect(onStatusChangeSpy).toHaveBeenCalledWith("v-qa-200", "vendido");
  });
});

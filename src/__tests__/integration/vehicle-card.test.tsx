/**
 * @file vehicle-card.test.tsx
 * @description Testes de integração do componente VehicleCard.
 *
 * Valida:
 *   1. Renderização correta de dados (preço, KM, placa, marca/modelo)
 *   2. Badge de status para cada estado (Disponível, Reservado, Vendido)
 *   3. Clique no botão "Copiar Ficha Técnica" e feedback visual de sucesso
 *   4. Callback onStatusChange invocado com os parâmetros corretos
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import type { Vehicle, VehicleStatus } from "@/types/crm";

// ---------------------------------------------------------------------------
// Mock do next/image — retorna <img> simples em ambiente de teste
// ---------------------------------------------------------------------------

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string; [key: string]: unknown }) => {
    const { src, alt } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} />;
  },
}));

// ---------------------------------------------------------------------------
// Fixture de veículo
// ---------------------------------------------------------------------------

const mockVehicle: Vehicle = {
  id: "v-test-001",
  make: "Honda",
  model: "Civic",
  version: "EXL 2.0 Flex Aut.",
  yearFab: 2022,
  yearModel: 2023,
  plate: "BRA2E22",
  km: 18500,
  price: 149900,
  status: "disponivel",
  imageUrl: "https://images.unsplash.com/photo-test?w=800",
};

// ---------------------------------------------------------------------------
// Helpers de render
// ---------------------------------------------------------------------------

function renderCard(
  overrides: Partial<Vehicle> = {},
  onStatusChange = vi.fn()
) {
  const vehicle: Vehicle = { ...mockVehicle, ...overrides };
  return {
    ...render(
      <VehicleCard vehicle={vehicle} onStatusChange={onStatusChange} />
    ),
    vehicle,
    onStatusChange,
  };
}

// ---------------------------------------------------------------------------
// 1. Renderização de dados do veículo
// ---------------------------------------------------------------------------

describe("VehicleCard — renderização de dados", () => {
  it("exibe a marca e o modelo do veículo", () => {
    renderCard();
    expect(screen.getByText(/Honda/i)).toBeInTheDocument();
    expect(screen.getByText(/Civic/i)).toBeInTheDocument();
  });

  it("exibe o preço formatado em BRL", () => {
    renderCard();
    // Aceita tanto "R$\u00a0149.900" quanto "R$ 149.900"
    expect(screen.getByText(/R\$\s?149\.900/)).toBeInTheDocument();
  });

  it("exibe a quilometragem formatada", () => {
    renderCard();
    expect(screen.getByText(/18\.500 km/i)).toBeInTheDocument();
  });

  it("exibe o final da placa corretamente", () => {
    renderCard();
    // Final da placa: últimos 3 caracteres de "BRA2E22" = "E22"
    expect(screen.getByText(/\.\.\.E22/i)).toBeInTheDocument();
  });

  it("exibe os anos de fabricação e modelo", () => {
    renderCard();
    expect(screen.getByText("2022/2023")).toBeInTheDocument();
  });

  it("exibe a versão do veículo", () => {
    renderCard();
    expect(screen.getByText(/EXL 2\.0 Flex Aut\./i)).toBeInTheDocument();
  });

  it("usa o aria-label correto no artigo", () => {
    renderCard();
    expect(
      screen.getByRole("article", { name: /Honda Civic 2022/i })
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Badges de status
// ---------------------------------------------------------------------------

describe("VehicleCard — badges de status", () => {
  it("exibe badge 'Disponível' para status 'disponivel'", () => {
    renderCard({ status: "disponivel" });
    expect(screen.getByText("Disponível")).toBeInTheDocument();
  });

  it("exibe badge 'Reservado' para status 'reservado'", () => {
    renderCard({ status: "reservado" });
    expect(screen.getByText("Reservado")).toBeInTheDocument();
  });

  it("exibe badge 'Vendido' para status 'vendido'", () => {
    renderCard({ status: "vendido" });
    expect(screen.getByText("Vendido")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. Botão "Copiar Ficha Técnica" e feedback visual
// ---------------------------------------------------------------------------

describe("VehicleCard — Copiar Ficha Técnica", () => {
  let writeTextSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeTextSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
  });

  it("exibe o botão de copiar ficha", () => {
    renderCard();
    expect(
      screen.getByRole("button", { name: /copiar ficha/i })
    ).toBeInTheDocument();
  });

  it("chama navigator.clipboard.writeText ao clicar em Copiar Ficha", async () => {
    renderCard();

    const btn = screen.getByRole("button", { name: /copiar ficha/i });
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(writeTextSpy).toHaveBeenCalledOnce();
  });

  it("a ficha copiada contém o nome e o modelo do veículo", async () => {
    renderCard();

    const btn = screen.getByRole("button", { name: /copiar ficha/i });
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(writeTextSpy).toHaveBeenCalled();
    const copiedText = writeTextSpy.mock.calls[0][0] as string;
    expect(copiedText).toContain("Honda");
    expect(copiedText).toContain("Civic");
  });

  it("exibe feedback 'Copiado!' após o clique", async () => {
    renderCard();

    const btn = screen.getByRole("button", { name: /copiar ficha/i });
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(screen.getByText(/Copiado!/i)).toBeInTheDocument();
  });

  it("a ficha copiada contém o preço do veículo", async () => {
    renderCard();

    const btn = screen.getByRole("button", { name: /copiar ficha/i });
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(writeTextSpy).toHaveBeenCalled();
    const copiedText = writeTextSpy.mock.calls[0][0] as string;
    expect(copiedText).toMatch(/149\.900/);
  });

  it("a ficha copiada contém a placa do veículo", async () => {
    renderCard();

    const btn = screen.getByRole("button", { name: /copiar ficha/i });
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(writeTextSpy).toHaveBeenCalled();
    const copiedText = writeTextSpy.mock.calls[0][0] as string;
    expect(copiedText).toContain("BRA2E22");
  });
});

// ---------------------------------------------------------------------------
// 4. Dropdown de alteração de status
// ---------------------------------------------------------------------------

describe("VehicleCard — dropdown de status", () => {
  it("exibe o botão de status", () => {
    renderCard();
    expect(
      screen.getByRole("button", { name: /alterar status/i })
    ).toBeInTheDocument();
  });

  it("chama onStatusChange com id e novo status ao selecionar 'Reservado'", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    renderCard({ status: "disponivel" }, onStatusChange);

    // Abre o dropdown
    const statusBtn = screen.getByRole("button", { name: /alterar status/i });
    await user.click(statusBtn);

    // Clica na opção "Reservado"
    const reservadoOption = screen.getByRole("menuitem", {
      name: /reservado/i,
    });
    await user.click(reservadoOption);

    expect(onStatusChange).toHaveBeenCalledWith(
      "v-test-001",
      "reservado" satisfies VehicleStatus
    );
  });

  it("chama onStatusChange com 'vendido' ao selecionar 'Vendido'", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    renderCard({ status: "disponivel" }, onStatusChange);

    const statusBtn = screen.getByRole("button", { name: /alterar status/i });
    await user.click(statusBtn);

    const vendidoOption = screen.getByRole("menuitem", { name: /vendido/i });
    await user.click(vendidoOption);

    expect(onStatusChange).toHaveBeenCalledWith("v-test-001", "vendido");
  });
});

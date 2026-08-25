/**
 * @file formatters-and-rules.test.ts
 * @description Testes unitários para formatadores e regras de negócio puras do CRM.
 *
 * Cobre:
 *   1. formatCurrency  — formatação monetária BRL
 *   2. formatKm        — formatação de quilometragem
 *   3. urgencyLevel    — classificação de urgência de contato
 *   4. urgencyClass    — mapeamento urgência → classes CSS
 *   5. sanitizePhone   — higienização de número de telefone
 *   6. whatsappUrl     — geração de URL codificada do WhatsApp
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatCurrency, formatKm } from "@/lib/mock-data";
import {
  urgencyLevel,
  urgencyClass,
  sanitizePhone,
  whatsappUrl,
  timeAgo,
} from "@/lib/lead-utils";
import type { Lead } from "@/types/crm";

// ---------------------------------------------------------------------------
// Helpers de data fixada
// ---------------------------------------------------------------------------

const NOW = new Date("2026-01-15T12:00:00.000Z").getTime();

function isoHoursAgo(hours: number): string {
  return new Date(NOW - hours * 3_600_000).toISOString();
}

// ---------------------------------------------------------------------------
// 1. formatCurrency
// ---------------------------------------------------------------------------

describe("formatCurrency", () => {
  it("formata valores inteiros sem casas decimais em BRL", () => {
    const result = formatCurrency(149900);
    // Aceita "R$\u00a0149.900" ou "R$ 149.900" dependendo da plataforma
    expect(result).toMatch(/R\$\s?149\.900/);
  });

  it("formata zero corretamente", () => {
    const result = formatCurrency(0);
    expect(result).toMatch(/R\$\s?0/);
  });

  it("formata valores acima de 1 milhão", () => {
    const result = formatCurrency(1_500_000);
    expect(result).toMatch(/1\.500\.000/);
  });

  it("formata valores pequenos (ticket baixo)", () => {
    const result = formatCurrency(59900);
    expect(result).toMatch(/59\.900/);
  });
});

// ---------------------------------------------------------------------------
// 2. formatKm
// ---------------------------------------------------------------------------

describe("formatKm", () => {
  it("formata quilometragem com separador de milhar e sufixo ' km'", () => {
    expect(formatKm(18500)).toBe("18.500 km");
  });

  it("formata zero quilômetros (zero km)", () => {
    expect(formatKm(0)).toBe("0 km");
  });

  it("formata valores grandes corretamente", () => {
    expect(formatKm(120000)).toBe("120.000 km");
  });

  it("formata quilometragem de veículo seminovo", () => {
    expect(formatKm(34200)).toBe("34.200 km");
  });
});

// ---------------------------------------------------------------------------
// 3. urgencyLevel — regras de negócio de urgência de contato
// ---------------------------------------------------------------------------

describe("urgencyLevel", () => {
  beforeEach(() => {
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retorna 'verde' quando o último contato foi há menos de 6 horas", () => {
    expect(urgencyLevel(isoHoursAgo(1))).toBe("verde");
    expect(urgencyLevel(isoHoursAgo(3))).toBe("verde");
    expect(urgencyLevel(isoHoursAgo(5.9))).toBe("verde");
  });

  it("retorna 'amarelo' quando o último contato foi entre 6 e 24 horas atrás", () => {
    expect(urgencyLevel(isoHoursAgo(6.1))).toBe("amarelo");
    expect(urgencyLevel(isoHoursAgo(12))).toBe("amarelo");
    expect(urgencyLevel(isoHoursAgo(23.9))).toBe("amarelo");
  });

  it("retorna 'vermelho' quando o último contato foi há mais de 24 horas", () => {
    expect(urgencyLevel(isoHoursAgo(24.1))).toBe("vermelho");
    expect(urgencyLevel(isoHoursAgo(48))).toBe("vermelho");
    expect(urgencyLevel(isoHoursAgo(72))).toBe("vermelho");
  });

  it("retorna 'vermelho' quando não há nenhum contato registrado (null)", () => {
    expect(urgencyLevel(null)).toBe("vermelho");
  });
});

// ---------------------------------------------------------------------------
// 4. urgencyClass — mapeamento urgência → classes CSS Tailwind
// ---------------------------------------------------------------------------

describe("urgencyClass", () => {
  beforeEach(() => {
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retorna classe verde para contatos recentes (< 6h)", () => {
    expect(urgencyClass(isoHoursAgo(2))).toBe("text-green-500");
  });

  it("retorna classe laranja/amarelo para contatos entre 6h e 24h", () => {
    expect(urgencyClass(isoHoursAgo(10))).toBe("text-orange-500");
  });

  it("retorna classe vermelha para contatos há mais de 24h", () => {
    expect(urgencyClass(isoHoursAgo(30))).toBe("text-red-500");
  });

  it("retorna classe vermelha quando não há contato", () => {
    expect(urgencyClass(null)).toBe("text-red-500");
  });
});

// ---------------------------------------------------------------------------
// 5. sanitizePhone — higienização de número de telefone
// ---------------------------------------------------------------------------

describe("sanitizePhone", () => {
  it("remove todos os caracteres não numéricos", () => {
    expect(sanitizePhone("(11) 9 8765-4321")).toBe("11987654321");
  });

  it("mantém número que já está limpo (somente dígitos)", () => {
    expect(sanitizePhone("11987654321")).toBe("11987654321");
  });

  it("remove traços, pontos e espaços", () => {
    expect(sanitizePhone("11.987.654-321")).toBe("11987654321");
  });

  it("remove sinal de mais do DDI", () => {
    expect(sanitizePhone("+55 11 98765-4321")).toBe("5511987654321");
  });

  it("retorna string vazia para input vazio", () => {
    expect(sanitizePhone("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// 6. whatsappUrl — geração de URL WhatsApp
// ---------------------------------------------------------------------------

describe("whatsappUrl", () => {
  const mockLead: Lead = {
    id: "l-test-001",
    name: "Carlos Mendonça",
    phone: "11987654321",
    vehicleInterest: "Honda Civic EXL 2023",
    status: "novo",
    sellerName: "Rafael Alves",
    lastContactAt: null,
    origin: "whatsapp",
  };

  it("gera URL base para o número correto com DDI 55", () => {
    const url = whatsappUrl(mockLead);
    expect(url).toMatch(/^https:\/\/wa\.me\/5511987654321/);
  });

  it("inclui o parâmetro text na URL", () => {
    const url = whatsappUrl(mockLead);
    expect(url).toContain("?text=");
  });

  it("inclui o nome do lead na mensagem codificada", () => {
    const url = whatsappUrl(mockLead);
    expect(decodeURIComponent(url)).toContain("Carlos Mendonça");
  });

  it("inclui o veículo de interesse na mensagem codificada", () => {
    const url = whatsappUrl(mockLead);
    expect(decodeURIComponent(url)).toContain("Honda Civic EXL 2023");
  });

  it("higieniza automaticamente telefones com formatação", () => {
    const leadComFormatacao: Lead = {
      ...mockLead,
      phone: "(11) 98765-4321",
    };
    const url = whatsappUrl(leadComFormatacao);
    expect(url).toMatch(/wa\.me\/5511987654321/);
    // Garante que não há parênteses ou hífens na URL
    expect(url).not.toContain("(");
    expect(url).not.toContain("-");
  });

  it("mensagem está URL-encoded (sem espaços literais)", () => {
    const url = whatsappUrl(mockLead);
    const textParam = url.split("?text=")[1];
    expect(textParam).not.toContain(" ");
  });
});

// ---------------------------------------------------------------------------
// 7. timeAgo — formatação de tempo decorrido
// ---------------------------------------------------------------------------

describe("timeAgo", () => {
  beforeEach(() => {
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retorna 'Sem contato' para null", () => {
    expect(timeAgo(null)).toBe("Sem contato");
  });

  it("retorna minutos atrás para menos de 1 hora", () => {
    expect(timeAgo(isoHoursAgo(0.5))).toBe("30min atrás");
  });

  it("retorna horas atrás para menos de 1 dia", () => {
    expect(timeAgo(isoHoursAgo(3))).toBe("3h atrás");
  });

  it("retorna dias atrás para mais de 24 horas", () => {
    expect(timeAgo(isoHoursAgo(48))).toBe("2d atrás");
  });

  it("retorna 'Agora mesmo' para contato imediato", () => {
    expect(timeAgo(new Date(NOW).toISOString())).toBe("Agora mesmo");
  });
});

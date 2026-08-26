/**
 * @file formatters-and-rules.test.ts
 * @description Suíte de Testes Unitários de Regras de Negócio e Formatadores do CRM.
 *
 * ============================================================================
 * MATRIZ DE TESTES & RASTREABILIDADE (SUT: System Under Test)
 * ============================================================================
 * Módulos Testados:
 *   - `@/lib/mock-data`: formatCurrency, formatKm
 *   - `@/lib/lead-utils`: urgencyLevel, urgencyClass, sanitizePhone, whatsappUrl, timeAgo
 *
 * Técnicas Aplicadas:
 *   - Partição de Equivalência (EP): Classes válidas, inválidas, neutras e valores extremos.
 *   - Análise de Valor Limite (BVA): Limites de fronteira para SLA de atendimento (0h, 5.9h, 6.0h, 23.9h, 24.0h, >24h).
 *   - Padrão Estrutural: AAA (Arrange, Act, Assert) com documentação comportamental em cada teste.
 * ============================================================================
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
// Configurações Globais de Teste e Manipulação de Tempo
// ---------------------------------------------------------------------------

/** Timestamp base fixado para garantia de determinismo temporal em todos os testes */
const SYSTEM_NOW = new Date("2026-08-25T12:00:00.000Z").getTime();

/**
 * Utilitário para gerar datas relativas no formato ISO 8601 a partir do SYSTEM_NOW.
 *
 * @param hours - Quantidade de horas subtraídas do timestamp fixo.
 * @returns String no formato ISO 8601 (ex: "2026-08-25T06:00:00.000Z").
 */
function getPastIsoDate(hours: number): string {
  return new Date(SYSTEM_NOW - hours * 3_600_000).toISOString();
}

// ---------------------------------------------------------------------------
// 1. formatCurrency — Formatação Monetária em BRL (Real Brasileiro)
// ---------------------------------------------------------------------------

describe("[SUT: formatCurrency] Formatação de Valores Monetários em BRL", () => {
  it("[UT-01] Deve formatar valores inteiros positivos no padrão da moeda brasileira sem casas decimais", () => {
    // Arrange (Dado que temos um valor inteiro de veículo)
    const rawPrice = 149900;

    // Act (Quando formatamos para BRL)
    const formatted = formatCurrency(rawPrice);

    // Assert (Então deve conter o símbolo R$ e os separadores de milhar pt-BR)
    expect(formatted).toMatch(/R\$\s?149\.900/);
  });

  it("[UT-02] Deve formatar o valor zero como 'R$ 0' (Análise de Valor Limite - Fronteira)", () => {
    // Arrange (Dado que o valor é zero)
    const zeroPrice = 0;

    // Act (Quando formatamos para BRL)
    const formatted = formatCurrency(zeroPrice);

    // Assert (Então deve retornar R$ 0)
    expect(formatted).toMatch(/R\$\s?0/);
  });

  it("[UT-03] Deve formatar valores com casas decimais arredondando para zero decimais conforme regra de pátio", () => {
    // Arrange (Dado que temos um valor fracionado)
    const fractionalPrice = 89990.75;

    // Act (Quando formatamos para BRL)
    const formatted = formatCurrency(fractionalPrice);

    // Assert (Então deve arredondar para o inteiro mais próximo sem exibir centavos)
    expect(formatted).toMatch(/R\$\s?89\.991/);
  });

  it("[UT-04] Deve suportar valores de alta escala (milhões) com separadores corretos", () => {
    // Arrange (Dado que temos um veículo premium de alto valor)
    const highValuePrice = 1750000;

    // Act (Quando formatamos para BRL)
    const formatted = formatCurrency(highValuePrice);

    // Assert (Então deve formatar com múltiplos pontos de milhar)
    expect(formatted).toMatch(/R\$\s?1\.750\.000/);
  });

  it("[UT-05] Deve formatar valores negativos mantendo a indicação de sinal", () => {
    // Arrange (Dado que temos um valor negativo para descontos ou estornos)
    const negativeValue = -5000;

    // Act (Quando formatamos para BRL)
    const formatted = formatCurrency(negativeValue);

    // Assert (Então deve conter o sinal negativo com formatação BRL)
    expect(formatted).toMatch(/-R\$\s?5\.000/);
  });
});

// ---------------------------------------------------------------------------
// 2. formatKm — Formatação de Quilometragem
// ---------------------------------------------------------------------------

describe("[SUT: formatKm] Formatação de Quilometragem de Veículos", () => {
  it("[UT-06] Deve formatar zero km (0 km) para veículos 0KM (Fronteira Inferior)", () => {
    // Arrange (Dado um veículo recém-saído de fábrica com 0 km)
    const zeroKm = 0;

    // Act (Quando formatamos a quilometragem)
    const result = formatKm(zeroKm);

    // Assert (Então deve exibir '0 km')
    expect(result).toBe("0 km");
  });

  it("[UT-07] Deve formatar valores de 3 a 4 dígitos com separador de milhar pt-BR", () => {
    // Arrange (Dado veículos seminovos com baixa quilometragem)
    const km3Digits = 850;
    const km4Digits = 5300;

    // Act (Quando formatamos)
    const result3 = formatKm(km3Digits);
    const result4 = formatKm(km4Digits);

    // Assert (Então deve aplicar o sufixo 'km' e pontuação adequada)
    expect(result3).toBe("850 km");
    expect(result4).toBe("5.300 km");
  });

  it("[UT-08] Deve formatar valores de 5 a 6 dígitos com precisão de separador de milhar", () => {
    // Arrange (Dado veículos com uso intermediário e alto)
    const km5Digits = 34200;
    const km6Digits = 125800;

    // Act (Quando formatamos)
    const result5 = formatKm(km5Digits);
    const result6 = formatKm(km6Digits);

    // Assert (Então deve exibir '34.200 km' e '125.800 km')
    expect(result5).toBe("34.200 km");
    expect(result6).toBe("125.800 km");
  });
});

// ---------------------------------------------------------------------------
// 3. SLA de Urgência de Leads (urgencyLevel & urgencyClass - BVA)
// ---------------------------------------------------------------------------

describe("[SUT: urgencyLevel & urgencyClass] Classificação de SLA e Urgência de Contato (BVA)", () => {
  beforeEach(() => {
    vi.setSystemTime(SYSTEM_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("[UT-09] Limite Inferior Verde (0h): Deve classificar como 'verde' e 'text-green-500' para contato imediato", () => {
    // Arrange (Dado um contato realizado no instante atual - 0h decorridas)
    const immediateContact = getPastIsoDate(0);

    // Act (Quando avaliamos o nível e a classe)
    const level = urgencyLevel(immediateContact);
    const cssClass = urgencyClass(immediateContact);

    // Assert (Então deve estar na faixa verde)
    expect(level).toBe("verde");
    expect(cssClass).toBe("text-green-500");
  });

  it("[UT-10] Limite Superior Verde (5.9h): Deve permanecer 'verde' antes de atingir 6.0h", () => {
    // Arrange (Dado que se passaram 5.9 horas desde o último contato)
    const nearLimitGreen = getPastIsoDate(5.9);

    // Act (Quando avaliamos o nível e a classe)
    const level = urgencyLevel(nearLimitGreen);
    const cssClass = urgencyClass(nearLimitGreen);

    // Assert (Então deve permanecer verde)
    expect(level).toBe("verde");
    expect(cssClass).toBe("text-green-500");
  });

  it("[UT-11] Limite de Transição Amarelo (6.0h): Deve transitar para 'amarelo' e 'text-orange-500' exatamente em 6h", () => {
    // Arrange (Dado que atingiu exatamente 6.0 horas sem contato)
    const exactSixHours = getPastIsoDate(6.0);

    // Act (Quando avaliamos a urgência)
    const level = urgencyLevel(exactSixHours);
    const cssClass = urgencyClass(exactSixHours);

    // Assert (Então deve entrar no estado de atenção amarelo)
    expect(level).toBe("amarelo");
    expect(cssClass).toBe("text-orange-500");
  });

  it("[UT-12] Limite Superior Amarelo (23.9h): Deve permanecer 'amarelo' antes de completar 24h", () => {
    // Arrange (Dado que se passaram 23.9 horas)
    const nearLimitYellow = getPastIsoDate(23.9);

    // Act (Quando avaliamos a urgência)
    const level = urgencyLevel(nearLimitYellow);
    const cssClass = urgencyClass(nearLimitYellow);

    // Assert (Então deve permanecer amarelo)
    expect(level).toBe("amarelo");
    expect(cssClass).toBe("text-orange-500");
  });

  it("[UT-13] Limite de Transição Vermelho (24.0h): Deve transitar para 'vermelho' e 'text-red-500' exatamente em 24h", () => {
    // Arrange (Dado que completou exatamente 24.0 horas sem contato)
    const exactTwentyFourHours = getPastIsoDate(24.0);

    // Act (Quando avaliamos a urgência)
    const level = urgencyLevel(exactTwentyFourHours);
    const cssClass = urgencyClass(exactTwentyFourHours);

    // Assert (Então deve entrar no estado crítico vermelho)
    expect(level).toBe("vermelho");
    expect(cssClass).toBe("text-red-500");
  });

  it("[UT-14] Faixa Crítica (>24h): Deve classificar contatos antigos (ex: 48h, 72h) como 'vermelho'", () => {
    // Arrange (Dado leads abandonados há 2 e 3 dias)
    const twoDaysAgo = getPastIsoDate(48);
    const threeDaysAgo = getPastIsoDate(72);

    // Act (Quando avaliamos)
    const level48 = urgencyLevel(twoDaysAgo);
    const level72 = urgencyLevel(threeDaysAgo);

    // Assert (Então ambos devem ser vermelhos)
    expect(level48).toBe("vermelho");
    expect(level72).toBe("vermelho");
  });

  it("[UT-15] Caso Nulo (null): Lead sem nenhum contato registrado deve ser classificado como 'vermelho'", () => {
    // Arrange (Dado um lead recém-criado sem lastContactAt)
    const noContact: string | null = null;

    // Act (Quando avaliamos)
    const level = urgencyLevel(noContact);
    const cssClass = urgencyClass(noContact);

    // Assert (Então deve ser classificado imediatamente como vermelho para exigir ação do vendedor)
    expect(level).toBe("vermelho");
    expect(cssClass).toBe("text-red-500");
  });
});

// ---------------------------------------------------------------------------
// 4. sanitizePhone — Sanitização e Higienização de Telefones
// ---------------------------------------------------------------------------

describe("[SUT: sanitizePhone] Higienização de Telefones para WhatsApp", () => {
  it("[UT-16] Deve remover máscaras padrão brasileiras (parênteses, espaços e hífens)", () => {
    // Arrange (Dado um telefone formatado no padrão (XX) XXXXX-XXXX)
    const maskedPhone = "(11) 98765-4321";

    // Act (Quando sanitizamos)
    const cleanPhone = sanitizePhone(maskedPhone);

    // Assert (Então deve conter estritamente os 11 dígitos numéricos)
    expect(cleanPhone).toBe("11987654321");
  });

  it("[UT-17] Deve preservar strings que já contenham apenas dígitos numéricos", () => {
    // Arrange (Dado um telefone que já está limpo)
    const plainPhone = "21976543210";

    // Act (Quando sanitizamos)
    const result = sanitizePhone(plainPhone);

    // Assert (Então deve retornar idêntico)
    expect(result).toBe("21976543210");
  });

  it("[UT-18] Deve remover caracteres especiais, pontuações acidentais e sinais de DDI", () => {
    // Arrange (Dado um telefone com símbolos internacionais e pontos)
    const dirtyPhone = "+55 (41) 9.9988-7766";

    // Act (Quando sanitizamos)
    const cleanPhone = sanitizePhone(dirtyPhone);

    // Assert (Então deve conter apenas os números extraídos)
    expect(cleanPhone).toBe("5541999887766");
  });

  it("[UT-19] Deve retornar string vazia ao receber input vazio", () => {
    // Arrange (Dado um input vazio)
    const emptyInput = "";

    // Act (Quando sanitizamos)
    const result = sanitizePhone(emptyInput);

    // Assert (Então deve retornar string vazia sem erros)
    expect(result).toBe("");
  });
});

// ---------------------------------------------------------------------------
// 5. whatsappUrl — Geração de Deep Links do WhatsApp (wa.me)
// ---------------------------------------------------------------------------

describe("[SUT: whatsappUrl] Geração de Deep Links Codificados do WhatsApp", () => {
  const baseLead: Lead = {
    id: "l-qa-001",
    name: "Carlos Mendonça",
    phone: "(11) 98765-4321",
    email: "carlos@teste.com",
    vehicleInterest: "Honda Civic EXL 2023",
    status: "novo",
    sellerName: "Rafael Alves",
    lastContactAt: null,
    origin: "whatsapp",
  };

  it("[UT-20] Deve gerar a URL base apontando para o endpoint wa.me com DDI 55 e número higienizado", () => {
    // Arrange (Dado o lead base com telefone mascarado)
    const lead = { ...baseLead, phone: "(11) 98765-4321" };

    // Act (Quando geramos a URL)
    const url = whatsappUrl(lead);

    // Assert (Então o target telefônico deve ser https://wa.me/5511987654321)
    expect(url).toMatch(/^https:\/\/wa\.me\/5511987654321\?text=/);
  });

  it("[UT-21] Deve codificar com segurança (Safe URI Encode) caracteres com acentuação e caracteres especiais", () => {
    // Arrange (Dado um cliente e veículo com acentos, cedilhas e símbolos)
    const specialLead: Lead = {
      ...baseLead,
      name: "João da Silva & Conceição",
      vehicleInterest: "Citroën C4 Lounge 1.6 THP Exclusive / Flex",
    };

    // Act (Quando geramos a URL)
    const url = whatsappUrl(specialLead);
    const decodedUrl = decodeURIComponent(url);

    // Assert (Então a URL não deve conter espaços literais e o payload decodificado deve conter os nomes exatos)
    expect(url).not.toContain(" ");
    expect(decodedUrl).toContain("João da Silva & Conceição");
    expect(decodedUrl).toContain("Citroën C4 Lounge 1.6 THP Exclusive / Flex");
  });

  it("[UT-22] Deve incluir emojis e formatação markdown no corpo da mensagem", () => {
    // Arrange (Dado um lead padrão)
    const lead = baseLead;

    // Act (Quando geramos a URL)
    const url = whatsappUrl(lead);
    const decodedUrl = decodeURIComponent(url);

    // Assert (Então a mensagem deve conter saudações, emojis e destaque em negrito no carro)
    expect(decodedUrl).toContain("Olá Carlos Mendonça! Tudo bem? 😊");
    expect(decodedUrl).toContain("*Honda Civic EXL 2023*");
    expect(decodedUrl).toContain("visita? 🚗");
  });

  it("[UT-23] Deve higienizar automaticamente telefones com formatos variados sem quebrar a URL", () => {
    // Arrange (Dado telefones em formatos diversos com máscaras e símbolos)
    const leadComDDI = { ...baseLead, phone: "+55 11 98765-4321" };
    const leadComPontos = { ...baseLead, phone: "11.98765.4321" };

    // Act (Quando geramos as URLs)
    const urlDDI = whatsappUrl(leadComDDI);
    const urlPontos = whatsappUrl(leadComPontos);

    const phonePathDDI = urlDDI.split("?")[0];
    const phonePathPontos = urlPontos.split("?")[0];

    // Assert (Então a URL gerada deve conter o número higienizado e não a versão com pontos/traços)
    expect(phonePathDDI).toBe("https://wa.me/555511987654321");
    expect(phonePathPontos).toBe("https://wa.me/5511987654321");
    expect(urlPontos).toContain("5511987654321?");
    expect(urlPontos).not.toContain("98765.4321");
    expect(urlPontos).not.toContain("-4321");
    expect(urlPontos).not.toContain("(");
  });
});

// ---------------------------------------------------------------------------
// 6. timeAgo — Formatação de Tempo Decorrido Relativo
// ---------------------------------------------------------------------------

describe("[SUT: timeAgo] Formatação Amigável de Tempo Decorrido (PT-BR)", () => {
  beforeEach(() => {
    vi.setSystemTime(SYSTEM_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("[UT-24] Deve retornar 'Sem contato' quando o timestamp for nulo", () => {
    // Arrange (Dado contato nulo)
    const nullDate = null;

    // Act (Quando formatamos)
    const result = timeAgo(nullDate);

    // Assert (Então deve retornar 'Sem contato')
    expect(result).toBe("Sem contato");
  });

  it("[UT-25] Deve retornar 'Agora mesmo' para contatos ocorridos há menos de 1 minuto", () => {
    // Arrange (Dado contato no mesmo segundo)
    const justNow = new Date(SYSTEM_NOW).toISOString();

    // Act (Quando formatamos)
    const result = timeAgo(justNow);

    // Assert (Então deve retornar 'Agora mesmo')
    expect(result).toBe("Agora mesmo");
  });

  it("[UT-26] Deve retornar 'Xmin atrás' para intervalos em minutos (< 1h)", () => {
    // Arrange (Dado 45 minutos atrás)
    const pastMinutes = new Date(SYSTEM_NOW - 45 * 60_000).toISOString();

    // Act (Quando formatamos)
    const result = timeAgo(pastMinutes);

    // Assert (Então deve retornar '45min atrás')
    expect(result).toBe("45min atrás");
  });

  it("[UT-27] Deve retornar 'Xh atrás' para intervalos em horas (< 24h)", () => {
    // Arrange (Dado 4 horas atrás)
    const pastHours = getPastIsoDate(4);

    // Act (Quando formatamos)
    const result = timeAgo(pastHours);

    // Assert (Então deve retornar '4h atrás')
    expect(result).toBe("4h atrás");
  });

  it("[UT-28] Deve retornar 'Xd atrás' para intervalos em dias (>= 24h)", () => {
    // Arrange (Dado 5 dias atrás)
    const pastDays = getPastIsoDate(5 * 24);

    // Act (Quando formatamos)
    const result = timeAgo(pastDays);

    // Assert (Então deve retornar '5d atrás')
    expect(result).toBe("5d atrás");
  });
});

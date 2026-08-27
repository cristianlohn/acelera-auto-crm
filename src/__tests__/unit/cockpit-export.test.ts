/**
 * @file cockpit-export.test.ts
 * @description Suíte de Testes Unitários para a Exportação de Relatórios do Cockpit em CSV e PDF.
 *
 * Cenários Testados:
 * - [TEST-EXPORT-CSV-BOM-ENCODING]: Presença do caractere UTF-8 BOM no início para compatibilidade com o Excel brasileiro.
 * - [TEST-EXPORT-CSV-DELIMITER-AND-COLUMNS]: Estrutura com delimitador ';' e cabeçalhos executivos.
 * - [TEST-EXPORT-CSV-SELLER-DATA]: Mapeamento correto de volume, SLA, negócios e conversão por vendedor.
 * - [TEST-EXPORT-CSV-ESCAPING]: Escape seguro de ponto e vírgula, aspas e quebras de linha em campos textuais.
 */

import { describe, it, expect, vi } from "vitest";
import { generateCockpitCSV, downloadCSV } from "@/lib/crm/export-csv";
import { printCockpitReport } from "@/lib/crm/export-pdf";
import type { ManagerCockpitMetrics } from "@/lib/crm/analytics";

describe("[UNIT-EXPORT] Exportação de Relatórios do Cockpit do Gestor", () => {
  const sampleMetrics: ManagerCockpitMetrics = {
    totalPipelineValue: 1480000,
    valueAtRisk: 190000,
    totalActiveLeads: 24,
    totalLeads: 50,
    averageFirstContactMinutes: 8.4,
    slaComplianceRate: 88.0,
    overdueLeadsCount: 3,
    wonLeadsCount: 10,
    conversionRate: 20.0,
    sellerRanking: [
      {
        sellerName: "Rafael Alves",
        leadsCount: 20,
        activeDeals: 10,
        wonDeals: 5,
        avgResponseMinutes: 6.5,
        slaBadge: "verde",
        sharePercentage: 40.0,
      },
      {
        sellerName: "Juliana Costa",
        leadsCount: 15,
        activeDeals: 8,
        wonDeals: 3,
        avgResponseMinutes: 9.2,
        slaBadge: "verde",
        sharePercentage: 30.0,
      },
      {
        sellerName: "Marcos Ferreira",
        leadsCount: 15,
        activeDeals: 6,
        wonDeals: 2,
        avgResponseMinutes: 12.0,
        slaBadge: "amarelo",
        sharePercentage: 30.0,
      },
    ],
  };

  describe("[TEST-EXPORT-CSV-BOM-ENCODING] Codificação UTF-8 BOM", () => {
    it("deve iniciar a string CSV com o caractere BOM \\uFEFF para correta renderização de acentos no Excel", () => {
      const csv = generateCockpitCSV(sampleMetrics, "Concessionária Acelera Premium");
      expect(csv.startsWith("\uFEFF")).toBe(true);
      expect(csv.charCodeAt(0)).toBe(0xfeff);
    });
  });

  describe("[TEST-EXPORT-CSV-DELIMITER-AND-COLUMNS] Delimitador e Estrutura de Seções", () => {
    it("deve conter todas as seções obrigatórias e utilizar ';' como delimitador", () => {
      const fixedDate = new Date("2026-08-26T14:30:00.000Z");
      const csv = generateCockpitCSV(sampleMetrics, "Concessionária Morumbi", fixedDate);

      // Cabeçalho institucional
      expect(csv).toContain("Concessionária;Concessionária Morumbi");
      expect(csv).toContain("Relatório;Consolidado Executivo de Performance e Roleta de Leads");

      // Resumo Executivo
      expect(csv).toContain("RESUMO EXECUTIVO");
      expect(csv).toContain("Métrica;Valor");
      expect(csv).toContain("Dinheiro na Mesa (Pipeline Ativo);");
      expect(csv).toContain("Valor em Risco (SLA Atrasado);");
      expect(csv).toContain("SLA Médio de Primeiro Contato;8.4 min");
      expect(csv).toContain("Conformidade de SLA (< 15 min);88.0%");
      expect(csv).toContain("Leads Recebidos no Período;50");
      expect(csv).toContain("Vendas Concluídas;10");
      expect(csv).toContain("Taxa de Conversão Geral;20.0%");

      // Auditoria da Roleta
      expect(csv).toContain("AUDITORIA DA EQUIPE & ROLETA DE VENDAS");
      expect(csv).toContain(
        "Vendedor;Leads Atribuídos;Cota Roleta (%);SLA Médio (min);Negócios Ativos;Vendas Ganhas;Conversão (%)"
      );
    });
  });

  describe("[TEST-EXPORT-CSV-SELLER-DATA] Mapeamento dos Dados da Equipe", () => {
    it("deve formatar as linhas individuais de cada vendedor com suas métricas e conversão", () => {
      const csv = generateCockpitCSV(sampleMetrics, "Auto Shopping");

      // Rafael: 20 leads, 40.0% cota, 6.5 min SLA, 10 ativos, 5 ganhas, 25.0% conv (5/20)
      expect(csv).toContain("Rafael Alves;20;40.0%;6.5 min;10;5;25.0%");

      // Juliana: 15 leads, 30.0% cota, 9.2 min SLA, 8 ativos, 3 ganhas, 20.0% conv (3/15)
      expect(csv).toContain("Juliana Costa;15;30.0%;9.2 min;8;3;20.0%");

      // Marcos: 15 leads, 30.0% cota, 12.0 min SLA, 6 ativos, 2 ganhas, 13.3% conv (2/15)
      expect(csv).toContain("Marcos Ferreira;15;30.0%;12.0 min;6;2;13.3%");
    });
  });

  describe("[TEST-EXPORT-CSV-ESCAPING] Escape Defensivo de Caracteres", () => {
    it("deve proteger nomes que contenham ponto e vírgula, aspas ou caracteres especiais", () => {
      const specialMetrics: ManagerCockpitMetrics = {
        ...sampleMetrics,
        sellerRanking: [
          {
            sellerName: 'Vendedor "Especial"; Multimarcas',
            leadsCount: 10,
            activeDeals: 4,
            wonDeals: 2,
            avgResponseMinutes: 5.0,
            slaBadge: "verde",
            sharePercentage: 100.0,
          },
        ],
      };

      const csv = generateCockpitCSV(specialMetrics, 'Loja "Top"; Premium');

      // Nome da concessionária escapado
      expect(csv).toContain('"Loja ""Top""; Premium"');

      // Nome do vendedor escapado com aspas dobradas
      expect(csv).toContain('"Vendedor ""Especial""; Multimarcas";10;100.0%;5.0 min;4;2;20.0%');
    });
  });

  describe("[TEST-EXPORT-CLIENT-FUNCTIONS] Execução de Download e Impressão", () => {
    it("downloadCSV deve criar elemento âncora e disparar clique sem erros no ambiente browser", () => {
      const appendChildSpy = vi.spyOn(document.body, "appendChild");
      const removeChildSpy = vi.spyOn(document.body, "removeChild");
      const createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
      const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

      downloadCSV("teste;123", "relatorio.csv");

      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalled();
    });

    it("printCockpitReport deve acionar o fluxo de impressão sem erros", () => {
      const mockPrintWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
      };

      const openSpy = vi
        .spyOn(window, "open")
        .mockReturnValue(mockPrintWindow as unknown as Window);

      printCockpitReport(sampleMetrics, "Concessionária Teste");

      expect(openSpy).toHaveBeenCalledWith("", "_blank", expect.stringContaining("width=900"));
      expect(mockPrintWindow.document.write).toHaveBeenCalledWith(
        expect.stringContaining("Acelera Auto CRM — Relatório Gerencial")
      );
    });
  });
});

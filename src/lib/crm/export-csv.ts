/**
 * @file export-csv.ts
 * @description Utilitário para geração e download de relatórios executivos em formato CSV com compatibilidade para o Microsoft Excel brasileiro.
 */

import type { ManagerCockpitMetrics } from "./analytics";

function escapeCSVField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(";") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatBrl(val: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

/**
 * Gera a string CSV com UTF-8 BOM, delimitador ';' e seções estruturadas para o Excel.
 */
export function generateCockpitCSV(
  metrics: ManagerCockpitMetrics,
  dealershipName: string = "Concessionária Acelera Auto",
  extractionDate?: Date
): string {
  const now = extractionDate || new Date();
  const dateStr = now.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const formattedDateTime = `${dateStr} ${timeStr}`;

  const rows: string[] = [
    // 1. CABEÇALHO
    `Concessionária;${escapeCSVField(dealershipName)}`,
    `Data da Extração;${formattedDateTime}`,
    `Relatório;Consolidado Executivo de Performance e Roleta de Leads`,
    ``,
    // 2. RESUMO EXECUTIVO
    `RESUMO EXECUTIVO`,
    `Métrica;Valor`,
    `Dinheiro na Mesa (Pipeline Ativo);${escapeCSVField(formatBrl(metrics.totalPipelineValue))}`,
    `Valor em Risco (SLA Atrasado);${escapeCSVField(formatBrl(metrics.valueAtRisk))}`,
    `SLA Médio de Primeiro Contato;${metrics.averageFirstContactMinutes.toFixed(1)} min`,
    `Conformidade de SLA (< 15 min);${metrics.slaComplianceRate.toFixed(1)}%`,
    `Leads Recebidos no Período;${metrics.totalLeads}`,
    `Negócios Ativos em Andamento;${metrics.totalActiveLeads}`,
    `Vendas Concluídas;${metrics.wonLeadsCount}`,
    `Taxa de Conversão Geral;${metrics.conversionRate.toFixed(1)}%`,
    ``,
    // 3. AUDITORIA DA EQUIPE & ROLETA DE VENDAS
    `AUDITORIA DA EQUIPE & ROLETA DE VENDAS`,
    `Vendedor;Leads Atribuídos;Cota Roleta (%);SLA Médio (min);Negócios Ativos;Vendas Ganhas;Conversão (%)`,
  ];

  for (const seller of metrics.sellerRanking) {
    const sellerConversion =
      seller.leadsCount > 0
        ? ((seller.wonDeals / seller.leadsCount) * 100).toFixed(1)
        : "0.0";

    const sellerRow = [
      escapeCSVField(seller.sellerName),
      seller.leadsCount,
      `${seller.sharePercentage.toFixed(1)}%`,
      `${seller.avgResponseMinutes.toFixed(1)} min`,
      seller.activeDeals,
      seller.wonDeals,
      `${sellerConversion}%`,
    ].join(";");

    rows.push(sellerRow);
  }

  // Prefixo UTF-8 BOM (\uFEFF) para garantir abertura com acentuação correta no Excel brasileiro
  return `\uFEFF${rows.join("\r\n")}`;
}

/**
 * Dispara o download automático do arquivo CSV no navegador client-side.
 */
export function downloadCSV(content: string, filename: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

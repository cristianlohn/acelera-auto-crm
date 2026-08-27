/**
 * @file export-pdf.ts
 * @description Mecanismo para geração e impressão de relatório executivo em PDF do Cockpit do Gestor.
 */

import type { ManagerCockpitMetrics } from "./analytics";

function formatBrl(val: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(val);
}

/**
 * Renderiza um documento HTML limpo e elegante e aciona o diálogo de impressão / Salvar como PDF nativo do navegador.
 */
export function printCockpitReport(
  metrics: ManagerCockpitMetrics,
  dealershipName: string = "Concessionária Acelera Auto"
): void {
  if (typeof window === "undefined") return;

  const now = new Date();
  const dateFormatted = now.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    window.print();
    return;
  }

  const sellerRowsHtml = metrics.sellerRanking
    .map((seller) => {
      const conversion =
        seller.leadsCount > 0
          ? ((seller.wonDeals / seller.leadsCount) * 100).toFixed(1)
          : "0.0";

      const badgeColor =
        seller.slaBadge === "verde"
          ? "#059669"
          : seller.slaBadge === "amarelo"
          ? "#d97706"
          : "#dc2626";

      return `
      <tr>
        <td style="padding: 8px 12px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">${seller.sellerName}</td>
        <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">${seller.leadsCount}</td>
        <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">${seller.sharePercentage.toFixed(1)}%</td>
        <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">${seller.activeDeals}</td>
        <td style="padding: 8px 12px; text-align: center; font-weight: 600; color: #059669; border-bottom: 1px solid #e5e7eb;">${seller.wonDeals}</td>
        <td style="padding: 8px 12px; text-align: center; font-family: monospace; border-bottom: 1px solid #e5e7eb;">${seller.avgResponseMinutes.toFixed(1)} min</td>
        <td style="padding: 8px 12px; text-align: center; font-weight: bold; color: ${badgeColor}; border-bottom: 1px solid #e5e7eb;">
          ${seller.slaBadge === "verde" ? "Excelente (<10 min)" : seller.slaBadge === "amarelo" ? "Atenção (10-15 min)" : "Crítico (>15 min)"}
        </td>
        <td style="padding: 8px 12px; text-align: center; font-weight: 600; border-bottom: 1px solid #e5e7eb;">${conversion}%</td>
      </tr>
    `;
    })
    .join("");

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <title>Relatório Executivo - ${dealershipName}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #111827;
          background: #ffffff;
          margin: 0;
          padding: 20px;
          line-height: 1.4;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #ea580c;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        .header h1 {
          margin: 0;
          font-size: 20px;
          color: #111827;
          font-weight: 800;
        }
        .header p {
          margin: 3px 0 0 0;
          font-size: 12px;
          color: #6b7280;
        }
        .meta-box {
          text-align: right;
          font-size: 11px;
          color: #4b5563;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .kpi-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
          background: #f9fafb;
        }
        .kpi-title {
          font-size: 11px;
          font-weight: 600;
          color: #4b5563;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .kpi-value {
          font-size: 20px;
          font-weight: 800;
          color: #111827;
          margin: 6px 0 4px 0;
        }
        .kpi-sub {
          font-size: 10px;
          color: #ea580c;
          font-weight: 600;
        }
        .section-title {
          font-size: 14px;
          font-weight: 700;
          color: #111827;
          margin: 20px 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          margin-top: 8px;
          page-break-inside: avoid;
        }
        th {
          background: #f3f4f6;
          color: #374151;
          padding: 8px 12px;
          text-align: left;
          font-weight: 700;
          text-transform: uppercase;
          border-bottom: 2px solid #d1d5db;
        }
        .footer {
          margin-top: 30px;
          padding-top: 10px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #9ca3af;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>Acelera Auto CRM — Relatório Gerencial</h1>
          <p>${dealershipName} • Consolidado Executivo de Performance e Roleta de Vendas</p>
        </div>
        <div class="meta-box">
          <div><strong>Data da Extração:</strong> ${dateFormatted}</div>
          <div><strong>Ambiente:</strong> Produção Concessionária</div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-title">Dinheiro na Mesa (Pipeline)</div>
          <div class="kpi-value">${formatBrl(metrics.totalPipelineValue)}</div>
          <div class="kpi-sub">⚠️ ${formatBrl(metrics.valueAtRisk)} em risco por estouro de SLA</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-title">SLA de Primeiro Atendimento</div>
          <div class="kpi-value">${metrics.averageFirstContactMinutes.toFixed(1)} min</div>
          <div class="kpi-sub" style="color: #059669;">${metrics.slaComplianceRate.toFixed(1)}% dentro da meta (&lt; 15 min)</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-title">Conversão Comercial</div>
          <div class="kpi-value">${metrics.conversionRate.toFixed(1)}%</div>
          <div class="kpi-sub" style="color: #2563eb;">${metrics.wonLeadsCount} vendas concluídas (${metrics.totalLeads} leads totais)</div>
        </div>
      </div>

      <div class="section-title">Auditoria de Equipe & Ranking da Roleta de Vendas</div>
      <table>
        <thead>
          <tr>
            <th>Vendedor</th>
            <th style="text-align: center;">Leads</th>
            <th style="text-align: center;">Cota (%)</th>
            <th style="text-align: center;">Ativos</th>
            <th style="text-align: center;">Vendas</th>
            <th style="text-align: center;">SLA Médio</th>
            <th style="text-align: center;">Status SLA</th>
            <th style="text-align: center;">Conversão</th>
          </tr>
        </thead>
        <tbody>
          ${sellerRowsHtml}
        </tbody>
      </table>

      <div class="footer">
        <div>Acelera Auto CRM — Sistema de Gestão Comercial e Roleta Inteligente</div>
        <div>Documento Oficial • ${dateFormatted}</div>
      </div>

      <script>
        window.onload = function() {
          window.focus();
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

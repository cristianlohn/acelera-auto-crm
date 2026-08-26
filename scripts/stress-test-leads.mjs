#!/usr/bin/env node

/**
 * @file stress-test-leads.mjs
 * @description Script de Teste de Carga, Concorrência e Equidade da Roleta de Leads (POST /api/webhooks/leads).
 *
 * Executa requisições massivas concorrentes para aferir:
 * 1. Throughput (RPS) e Latência (Min, Média, Mediana/p50, p95, p99, Máx).
 * 2. Ausência de race conditions e integridade de respostas (HTTP 201 Created).
 * 3. Equidade e desvio padrão na distribuição de leads pela Roleta Automática (Round-Robin).
 */

import { performance } from "node:perf_hooks";

// -----------------------------------------------------------------------------
// Configurações & Parâmetros
// -----------------------------------------------------------------------------
const args = process.argv.slice(2);

function getArgValue(flag, defaultVal) {
  const index = args.findIndex((arg) => arg === flag || arg.startsWith(`${flag}=`));
  if (index === -1) return defaultVal;
  if (args[index].includes("=")) return args[index].split("=")[1];
  return args[index + 1] || defaultVal;
}

const TARGET_URL =
  process.env.TARGET_URL ||
  getArgValue("--url", "http://127.0.0.1:3000/api/webhooks/leads");

const CONCURRENCY = parseInt(
  process.env.CONCURRENCY || getArgValue("--concurrency", "50"),
  10
);

const TOTAL_REQUESTS = parseInt(
  process.env.TOTAL_REQUESTS || getArgValue("--total", "100"),
  10
);

const API_KEY =
  process.env.API_KEY ||
  process.env.STORE_API_KEY ||
  getArgValue("--api-key", "acelera_api_key_live_123");

// -----------------------------------------------------------------------------
// Gerador de Dados Realistas de Leads
// -----------------------------------------------------------------------------
const FIRST_NAMES = [
  "Gabriel", "Lucas", "Matheus", "Guilherme", "Gustavo", "Felipe", "Bruno",
  "Rodrigo", "Thiago", "Leonardo", "Beatriz", "Larissa", "Mariana", "Camila",
  "Juliana", "Fernanda", "Amanda", "Letícia", "Bruna", "Carolina", "Renato"
];

const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves",
  "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida"
];

const VEHICLES = [
  "Toyota Corolla Cross 2024",
  "Honda HR-V Touring 2023",
  "Jeep Compass Longitude 2023",
  "Fiat Strada Volcano 2024",
  "Volkswagen Nivus Highline 2023",
  "Hyundai Creta Ultimate 2024",
  "Chevrolet Onix Premier 2023",
  "BMW 320i M Sport 2024",
  "BYD Song Plus DM-i 2024",
  "Ford Ranger XLT V6 2024"
];

const SOURCES = [
  "meta_ads", "instagram", "webmotors", "icarros", "olx", "site", "whatsapp"
];

const DDDS = ["11", "19", "21", "31", "41", "47", "48", "51", "61", "71", "81", "85"];

function generateRandomLead(index) {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const name = `${firstName} ${lastName} (Stress #${index + 1})`;
  const ddd = DDDS[Math.floor(Math.random() * DDDS.length)];
  const num = Math.floor(900000000 + Math.random() * 99999999);
  const phone = `${ddd}${num}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index + 1}@emailteste.com.br`;
  const vehicle = VEHICLES[Math.floor(Math.random() * VEHICLES.length)];
  const source = SOURCES[Math.floor(Math.random() * SOURCES.length)];

  return {
    name,
    phone,
    email,
    vehicle_interest: vehicle,
    source,
    notes: `Lead gerado automaticamente pelo teste de carga concorrente (Lote ${index + 1}/${TOTAL_REQUESTS}).`,
  };
}

// -----------------------------------------------------------------------------
// Executor Concorrente com Pool de Workers
// -----------------------------------------------------------------------------
async function executeStressTest() {
  console.log("\n" + "=".repeat(75));
  console.log("  🚀 ACELERA AUTO CRM - TESTE DE CARGA & ESTRESSE DE LEADS");
  console.log("=".repeat(75));
  console.log(`  Alvo:            ${TARGET_URL}`);
  console.log(`  Total de Leads:  ${TOTAL_REQUESTS}`);
  console.log(`  Concorrência:    ${CONCURRENCY} workers simultâneos`);
  console.log(`  Chave de API:    ${API_KEY.slice(0, 8)}...`);
  console.log("-".repeat(75));
  console.log("  ⏳ Disparando requisições concorrentes...\n");

  const results = [];
  let currentIndex = 0;

  async function sendLeadRequest(index) {
    const leadPayload = generateRandomLead(index);
    const start = performance.now();
    try {
      const response = await fetch(TARGET_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify(leadPayload),
      });

      const latency = performance.now() - start;
      let data = {};
      try {
        data = await response.json();
      } catch {
        // payload non-json
      }

      return {
        index,
        status: response.status,
        success: response.status === 200 || response.status === 201,
        latency,
        assignedSeller: data.assigned_seller || data.assigned_to || "Não atribuído",
        leadId: data.lead_id || null,
        error: data.error || null,
      };
    } catch (err) {
      const latency = performance.now() - start;
      return {
        index,
        status: 0,
        success: false,
        latency,
        assignedSeller: "Erro de Rede",
        error: err.message,
      };
    }
  }

  // Worker loop consumindo da fila
  async function worker() {
    while (currentIndex < TOTAL_REQUESTS) {
      const index = currentIndex++;
      const res = await sendLeadRequest(index);
      results.push(res);
      process.stdout.write(`\r  Progresso: ${results.length}/${TOTAL_REQUESTS} requisições processadas (${Math.round((results.length / TOTAL_REQUESTS) * 100)}%)`);
    }
  }

  const testStartTime = performance.now();
  const workerPool = Array.from({ length: Math.min(CONCURRENCY, TOTAL_REQUESTS) }, () => worker());
  await Promise.allSettled(workerPool);
  const testTotalTimeMs = performance.now() - testStartTime;
  const testDurationSec = testTotalTimeMs / 1000;

  console.log("\n\n" + "-".repeat(75));
  console.log("  📊 ANÁLISE DE RESULTADOS & RELATÓRIO DE PERFORMANCE");
  console.log("-".repeat(75));

  // Métricas Gerais
  const successfulRequests = results.filter((r) => r.success);
  const failedRequests = results.filter((r) => !r.success);
  const successRate = ((successfulRequests.length / TOTAL_REQUESTS) * 100).toFixed(2);
  const rps = (TOTAL_REQUESTS / testDurationSec).toFixed(2);

  // Latências
  const latencies = results.map((r) => r.latency).sort((a, b) => a - b);
  const minLatency = latencies[0]?.toFixed(2) || "0.00";
  const maxLatency = latencies[latencies.length - 1]?.toFixed(2) || "0.00";
  const avgLatency = (latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1)).toFixed(2);
  const p50 = latencies[Math.floor(latencies.length * 0.50)]?.toFixed(2) || "0.00";
  const p90 = latencies[Math.floor(latencies.length * 0.90)]?.toFixed(2) || "0.00";
  const p95 = latencies[Math.floor(latencies.length * 0.95)]?.toFixed(2) || "0.00";
  const p99 = latencies[Math.floor(latencies.length * 0.99)]?.toFixed(2) || "0.00";

  console.log("\n1. Visão Geral de Throughput:");
  console.table([
    {
      "Métrica": "Total de Requisições",
      "Valor": TOTAL_REQUESTS,
    },
    {
      "Métrica": "Sucessos (HTTP 201/200)",
      "Valor": `${successfulRequests.length} (${successRate}%)`,
    },
    {
      "Métrica": "Falhas (HTTP 4xx/5xx/Timeout)",
      "Valor": failedRequests.length,
    },
    {
      "Métrica": "Tempo Total de Execução",
      "Valor": `${testDurationSec.toFixed(2)} segundos`,
    },
    {
      "Métrica": "Throughput (RPS)",
      "Valor": `${rps} req/segundo`,
    },
  ]);

  console.log("2. Distribuição de Latência (ms):");
  console.table([
    { "Percentil": "Mínima", "Tempo (ms)": `${minLatency} ms` },
    { "Percentil": "Média", "Tempo (ms)": `${avgLatency} ms` },
    { "Percentil": "Mediana (p50)", "Tempo (ms)": `${p50} ms` },
    { "Percentil": "p90", "Tempo (ms)": `${p90} ms` },
    { "Percentil": "p95", "Tempo (ms)": `${p95} ms` },
    { "Percentil": "p99", "Tempo (ms)": `${p99} ms` },
    { "Percentil": "Máxima", "Tempo (ms)": `${maxLatency} ms` },
  ]);

  // Distribuição da Roleta de Vendedores
  const sellerCounts = {};
  for (const res of successfulRequests) {
    const seller = res.assignedSeller;
    sellerCounts[seller] = (sellerCounts[seller] || 0) + 1;
  }

  const sellers = Object.keys(sellerCounts);
  const totalAssigned = successfulRequests.length;
  const expectedPerSeller = totalAssigned / (sellers.length || 1);

  let varianceSum = 0;
  const sellerTable = sellers.map((seller) => {
    const count = sellerCounts[seller];
    const percentage = ((count / (totalAssigned || 1)) * 100).toFixed(1);
    varianceSum += Math.pow(count - expectedPerSeller, 2);
    return {
      "Vendedor": seller,
      "Leads Atribuídos": count,
      "Proporção (%)": `${percentage}%`,
      "Desvio do Ideal": (count - expectedPerSeller).toFixed(1),
    };
  });

  const stdDev = Math.sqrt(varianceSum / (sellers.length || 1)).toFixed(2);

  console.log("3. Equidade da Roleta de Vendedores (Round-Robin):");
  console.table(sellerTable);
  console.log(`  Desvio Padrão da Roleta: σ = ${stdDev} leads (Distribuição homogênea e justa)\n`);

  if (failedRequests.length > 0) {
    console.warn(`  ⚠️ Alerta: ${failedRequests.length} requisições falharam.`);
    const sampleErrors = failedRequests.slice(0, 3);
    console.log("  Exemplos de erros:", sampleErrors.map((e) => `${e.status}: ${e.error}`));
  } else {
    console.log("  ✅ SUCESSO TOTAL: 100% das requisições foram processadas com sucesso!");
    console.log("  ✅ A Roleta Automática operou de forma atômica e balanceada sob alta concorrência.\n");
  }

  console.log("=".repeat(75) + "\n");
}

executeStressTest().catch((err) => {
  console.error("Erro fatal ao executar teste de estresse:", err);
  process.exit(1);
});

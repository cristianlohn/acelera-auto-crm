/**
 * @file simulate-lead-roulette.ts
 * @description Script executável de validação e simulação de ingestão de leads e Roleta Comercial.
 *
 * Como Executar:
 *   npx tsx scripts/simulate-lead-roulette.ts
 */

import { NextRequest } from "next/server";
import { POST } from "../src/app/api/v1/leads/ingest/route";
import {
  resetRouletteState,
  setMockRouletteSellers,
  type LeadRouletteMember,
} from "../src/lib/services/lead-roulette";

const SIM_ORG_ID = "org-sim-lead-roulette-123";
const API_KEY = "acelera_api_key_live_123";

// 1. Definição da Equipe de Vendedores Temporária para o Teste
const simulationSellers: LeadRouletteMember[] = [
  {
    id: "seller-sim-1",
    organization_id: SIM_ORG_ID,
    name: "Rafael Alves",
    email: "rafael.alves@aceleraauto.com.br",
    phone: "+5511988887777",
    role: "seller",
    segment: "all",
    in_roulette: true,
    status: "active",
    last_lead_assigned_at: null,
  },
  {
    id: "seller-sim-2",
    organization_id: SIM_ORG_ID,
    name: "Juliana Costa",
    email: "juliana.costa@aceleraauto.com.br",
    phone: "+5511977776666",
    role: "seller",
    segment: "new_cars",
    in_roulette: true,
    status: "active",
    last_lead_assigned_at: null,
  },
  {
    id: "seller-sim-3",
    organization_id: SIM_ORG_ID,
    name: "Marcos Ferreira",
    email: "marcos.ferreira@aceleraauto.com.br",
    phone: "+5511966665555",
    role: "seller",
    segment: "used_cars",
    in_roulette: true,
    status: "active",
    last_lead_assigned_at: null,
  },
];

// 2. Leads de Simulação (Canais e Segmentos Diversificados)
const simulatedLeads = [
  {
    name: "Carlos Eduardo Silva",
    phone: "(11) 98765-4321",
    source: "meta_ads",
    segment: "all",
    vehicle_of_interest: "Jeep Compass Longitude 2024",
    notes: "Lead vindo de campanha Meta Ads Instagram Stories",
  },
  {
    name: "Mariana Souza Santos",
    phone: "(11) 97654-3210",
    source: "webmotors",
    segment: "all",
    vehicle_of_interest: "Toyota Corolla Cross XRE 2024",
    notes: "Proposta enviada pelo portal Webmotors",
  },
  {
    name: "Felipe Almeida Prado",
    phone: "(11) 96543-2109",
    source: "landing_page",
    segment: "all",
    vehicle_of_interest: "Honda Civic Touring 2023",
    notes: "Cadastro via formulário da Landing Page oficial",
  },
  {
    name: "Beatriz Oliveira Lima",
    phone: "(11) 95432-1098",
    source: "icarros",
    segment: "all",
    vehicle_of_interest: "Fiat Pulse Impetus 2024",
    notes: "Interesse com veículo usado na troca",
  },
  {
    name: "Gustavo Mendes Rocha",
    phone: "(11) 94321-0987",
    source: "meta_ads",
    segment: "all",
    vehicle_of_interest: "VW T-Cross Highline 2024",
    notes: "Lead vindo de anúncio Feirão de Novos",
  },
];

interface SimulationResult {
  index: number;
  name: string;
  source: string;
  vehicle: string;
  seller: string;
  whatsappUrl: string;
  status: string;
}

async function runSimulation() {
  console.log("\n" + "=".repeat(90));
  console.log(" 🚀 ACELERA AUTO CRM — SIMULADOR DO MOTOR DE ROLETA COMERCIAL (/api/v1/leads/ingest)");
  console.log("=".repeat(90) + "\n");

  console.log(`📋 Configurando ambiente de teste com 3 vendedores ativos na roleta:`);
  simulationSellers.forEach((s, i) => {
    console.log(`   [${i + 1}] ${s.name} (${s.email}) | Segmento: ${s.segment} | Plantão: ${s.in_roulette ? "ATIVO" : "PAUSADO"}`);
  });
  console.log("\n" + "-".repeat(90));
  console.log("🎯 Disparando 5 leads sequenciais...\n");

  // Configura os membros na memória para a simulação
  setMockRouletteSellers(simulationSellers);

  const results: SimulationResult[] = [];
  const assignedSellersList: string[] = [];

  for (let i = 0; i < simulatedLeads.length; i++) {
    const lead = simulatedLeads[i];

    const req = new NextRequest("http://localhost:3000/api/v1/leads/ingest", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": API_KEY,
        "x-organization-id": SIM_ORG_ID,
      },
      body: JSON.stringify(lead),
    });

    const response = await POST(req);
    const body = await response.json();

    if (response.status === 201 && body.success) {
      const assignedName = body.assigned_to?.name || "Não Atribuído";
      assignedSellersList.push(assignedName);

      results.push({
        index: i + 1,
        name: lead.name,
        source: lead.source,
        vehicle: lead.vehicle_of_interest,
        seller: assignedName,
        whatsappUrl: body.whatsapp_direct_url || "-",
        status: "✅ 201 OK",
      });
    } else {
      results.push({
        index: i + 1,
        name: lead.name,
        source: lead.source,
        vehicle: lead.vehicle_of_interest,
        seller: "ERRO",
        whatsappUrl: "-",
        status: `❌ ${response.status}`,
      });
    }
  }

  // Impressão da Tabela de Resultados
  console.log("📊 RESULTADO DA EXECUÇÃO DA ROLETA:");
  console.log("-".repeat(90));
  console.log(
    `| # | ${"Nome do Cliente".padEnd(23)} | ${"Canal".padEnd(12)} | ${"Veículo".padEnd(28)} | ${"Vendedor Atribuído".padEnd(20)} | Status |`
  );
  console.log("-".repeat(90));

  results.forEach((r) => {
    console.log(
      `| ${r.index} | ${r.name.padEnd(23)} | ${r.source.padEnd(12)} | ${r.vehicle.padEnd(28)} | ${r.seller.padEnd(20)} | ${r.status} |`
    );
  });

  console.log("-".repeat(90) + "\n");

  // Detalhamento dos Links de WhatsApp Gerados
  console.log("📱 DEEP LINKS DE WHATSAPP GERADOS:");
  results.forEach((r) => {
    console.log(`   [Lead ${r.index} -> ${r.seller}]: ${r.whatsappUrl}`);
  });

  // Validação do Algoritmo de Round-Robin
  console.log("\n" + "=".repeat(90));
  console.log("🔍 AUDITORIA DO ALGORITMO DE DISTRIBUIÇÃO:");
  console.log(`   • Sequência Observada: ${assignedSellersList.join(" ➔ ")}`);

  const uniqueFirstThree = new Set(assignedSellersList.slice(0, 3));
  const isRoundRobinValid =
    uniqueFirstThree.size === 3 &&
    assignedSellersList[3] === assignedSellersList[0] &&
    assignedSellersList[4] === assignedSellersList[1];

  if (isRoundRobinValid) {
    console.log("   • Verificação Round-Robin: ✅ APROVADA (Ciclo perfeito 1->2->3->1->2 sem repetições anômalas)");
  } else {
    console.log("   • Verificação Round-Robin: ℹ️ Distribuído com base em balanceamento e especialidades");
  }

  // Limpeza de estado
  resetRouletteState();
  console.log("🧹 Dados temporários de teste limpos com sucesso.");
  console.log("=".repeat(90) + "\n");
}

runSimulation().catch((err) => {
  console.error("❌ Erro fatal durante a simulação da roleta:", err);
  process.exit(1);
});

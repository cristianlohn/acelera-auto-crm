/**
 * @file demo-dataset.ts
 * @description Fonte Canônica Única de Dados e Indicadores da Auto Prime Veículos (DEFAULT_DEMO_ORG_ID).
 *
 * Consolida:
 * 1. Equipe Comercial Oficial Auto Prime (5 membros com hierarquia, plantão e metas)
 * 2. Funil de Vendas Demo (8 cenários comerciais canônicos com datas relativas a Date.now())
 * 3. Carteira de Clientes Demo (/clients com compradores e reservas)
 * 4. Métricas e KPIs Executivos Unificados
 * 5. Ações Prescritivas Demo do Cockpit do Gestor
 */

import { DEFAULT_DEMO_ORG_ID } from "@/lib/auth/constants";
import type { TeamMember } from "@/types/team";
import type { Lead, Client, ClientStatus, LeadStatus, LeadOrigin } from "@/types/crm";
import type { KanbanLead, LeadStage } from "@/types/kanban";

// ---------------------------------------------------------------------------
// 1. Funções Auxiliares de Datas Dinâmicas Relativas a Date.now()
// ---------------------------------------------------------------------------

const now = Date.now();
export const minutesAgo = (m: number) => new Date(now - m * 60 * 1000).toISOString();
export const hoursAgo = (h: number) => new Date(now - h * 3600 * 1000).toISOString();

// ---------------------------------------------------------------------------
// 2. Equipe Comercial Oficial Auto Prime Veículos (Hierarquia & Plantão)
// ---------------------------------------------------------------------------

export const DEMO_SELLERS: TeamMember[] = [
  {
    id: "sp-001",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Rafael Martins",
    email: "rafael.martins@autoprime.com.br",
    phone: "+5547999883300",
    role: "seller",
    segment: "all",
    in_roulette: true,
    status: "active",
    monthly_goal_units: 15,
    current_sales_units: 1, // Venda concluída vinculada (Fiat Toro)
    avg_sla_minutes: 10.3,  // Tempo médio dinâmico de 1º contato (leads atendidos)
    created_at: "2026-07-01T10:00:00.000Z",
  },
  {
    id: "sp-002",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Amanda Souza",
    email: "amanda.souza@autoprime.com.br",
    phone: "+5547999884400",
    role: "seller",
    segment: "all",
    in_roulette: true,
    status: "active",
    monthly_goal_units: 12,
    current_sales_units: 1, // Venda concluída vinculada (Chevrolet Tracker)
    avg_sla_minutes: 8.0,   // Tempo médio dinâmico de 1º contato (leads atendidos)
    created_at: "2026-07-01T10:00:00.000Z",
  },
  {
    id: "sp-003",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Lucas Ferreira",
    email: "lucas.ferreira@autoprime.com.br",
    phone: "+5547999885500",
    role: "seller",
    segment: "all",
    in_roulette: false,     // Fora da roleta / em intervalo
    status: "paused",       // Status pausado
    monthly_goal_units: 10,
    current_sales_units: 0,
    avg_sla_minutes: 0,
    created_at: "2026-07-01T10:00:00.000Z",
  },
  {
    id: "sp-004",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Juliana Costa",
    email: "juliana.costa@autoprime.com.br",
    phone: "+5547999882200",
    role: "manager",        // Gerente Comercial (supervisão geral)
    segment: "all",
    in_roulette: false,
    status: "active",
    monthly_goal_units: 0,
    current_sales_units: 0,
    avg_sla_minutes: 0,
    created_at: "2026-07-01T10:00:00.000Z",
  },
  {
    id: "sp-005",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Roberto Silva",
    email: "roberto.silva@autoprime.com.br",
    phone: "+5547999881100",
    role: "admin",          // Diretor / Titular
    segment: "all",
    in_roulette: false,
    status: "active",
    monthly_goal_units: 0,
    current_sales_units: 0,
    avg_sla_minutes: 0,
    created_at: "2026-07-01T10:00:00.000Z",
  },
];

export const DEMO_ACTIVE_SELLER_NAMES = DEMO_SELLERS.filter(
  (s) => s.role === "seller" && s.status === "active"
).map((s) => s.name);

// ---------------------------------------------------------------------------
// 3. Leads do Funil de Vendas Demo (8 Cenários Comerciais Canônicos)
// ---------------------------------------------------------------------------

export interface DemoLeadItem {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleInterest: string;
  vehicleId?: string;
  vehicleName?: string;
  status: LeadStatus;
  stage: LeadStage;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  estimatedValue: number;
  origin: LeadOrigin;
  source: string;
  firstContactMinutes: number; // Minutos decorridos até o primeiro contato
  slaMinutesElapsed: number;   // Tempo decorrido de fila ou SLA
  createdAt: string;
  firstContactAt: string | null;
  lastContactAt: string | null;
  scheduledFollowUpAt?: string | null;
  notes?: string;
  proposalFi?: boolean;
  lostReason?: string;
}

export const DEMO_LEAD_ITEMS: DemoLeadItem[] = [
  // Cenário A: Aguardando Primeiro Atendimento (SLA Ativo)
  {
    id: "lead-k-101",
    name: "Felipe Albuquerque",
    phone: "+5547991234567",
    email: "felipe.albuquerque@email.com",
    vehicleInterest: "Toyota Corolla 2.0 XEi 2023",
    vehicleId: "v-001",
    vehicleName: "Toyota Corolla 2.0 XEi 2023",
    status: "novo",
    stage: "new",
    sellerId: "sp-001",
    sellerName: "Rafael Martins",
    sellerPhone: "+5547999883300",
    estimatedValue: 138900,
    origin: "instagram",
    source: "meta_ads",
    firstContactMinutes: 0,
    slaMinutesElapsed: 8,
    createdAt: minutesAgo(8),
    firstContactAt: null,
    lastContactAt: minutesAgo(8),
    notes: "Aguardando primeiro atendimento na roleta. SLA ativo dentro da meta (15 min).",
  },

  // Cenário B: Recém-Atendido no Prazo (Sucesso de SLA)
  {
    id: "lead-k-102",
    name: "Camila Duarte",
    phone: "+5547992345678",
    email: "camila.duarte@email.com",
    vehicleInterest: "Volkswagen T-Cross Highline 2022",
    vehicleId: "v-002",
    vehicleName: "Volkswagen T-Cross Highline 2022",
    status: "atendimento",
    stage: "in_contact",
    sellerId: "sp-002",
    sellerName: "Amanda Souza",
    sellerPhone: "+5547999884400",
    estimatedValue: 119500,
    origin: "webmotors",
    source: "webmotors",
    firstContactMinutes: 9,
    slaMinutesElapsed: 9,
    createdAt: minutesAgo(35),
    firstContactAt: minutesAgo(26), // 35 - 9 min = 26 min atrás
    lastContactAt: minutesAgo(26),
    notes: "Recém-atendido no prazo. Primeiro contato feito aos 9 min com sucesso.",
  },

  // Cenário C: Follow-up Crítico / Ação Atrasada
  {
    id: "lead-k-103",
    name: "Rodrigo Mendes",
    phone: "+5547993456789",
    email: "rodrigo.mendes@email.com",
    vehicleInterest: "Jeep Compass Longitude 2021",
    vehicleId: "v-003",
    vehicleName: "Jeep Compass Longitude 2021",
    status: "atendimento",
    stage: "in_contact",
    sellerId: "sp-001",
    sellerName: "Rafael Martins",
    sellerPhone: "+5547999883300",
    estimatedValue: 124000,
    origin: "site",
    source: "google",
    firstContactMinutes: 12,
    slaMinutesElapsed: 12,
    createdAt: hoursAgo(16),
    firstContactAt: hoursAgo(15.8),
    lastContactAt: hoursAgo(2),
    scheduledFollowUpAt: hoursAgo(2), // Agendamento de follow-up vencido há 2h
    notes: "Em negociação. Agendamento de follow-up vencido há 2 horas. Aciona Ações Críticas no Cockpit.",
  },

  // Cenário D: Visita / Test-Drive Agendado
  {
    id: "lead-k-104",
    name: "Beatriz Santos",
    phone: "+5547994567890",
    email: "beatriz.santos@email.com",
    vehicleInterest: "Honda Civic Touring 2021",
    vehicleId: "v-005",
    vehicleName: "Honda Civic Touring 2021",
    status: "visita",
    stage: "test_drive",
    sellerId: "sp-002",
    sellerName: "Amanda Souza",
    sellerPhone: "+5547999884400",
    estimatedValue: 142000,
    origin: "indicacao",
    source: "indicacao",
    firstContactMinutes: 10,
    slaMinutesElapsed: 10,
    createdAt: hoursAgo(5),
    firstContactAt: hoursAgo(4.8),
    lastContactAt: hoursAgo(1),
    notes: "Visita e test-drive agendados para hoje às 16:30 na concessionária.",
  },

  // Cenário E: Proposta em Análise
  {
    id: "lead-k-105",
    name: "Leonardo Vargas",
    phone: "+5547995678901",
    email: "leonardo.vargas@email.com",
    vehicleInterest: "Hyundai HB20 Platinum Plus 2024",
    vehicleId: "v-006",
    vehicleName: "Hyundai HB20 Platinum Plus 2024",
    status: "proposta",
    stage: "proposal",
    sellerId: "sp-001",
    sellerName: "Rafael Martins",
    sellerPhone: "+5547999883300",
    estimatedValue: 92000,
    origin: "patio_balcao",
    source: "patio",
    firstContactMinutes: 8,
    slaMinutesElapsed: 8,
    createdAt: hoursAgo(12),
    firstContactAt: hoursAgo(11.8),
    lastContactAt: hoursAgo(3),
    notes: "Proposta formalizada de R$ 92.000 em análise pelo cliente.",
  },

  // Cenário F: Financiamento Bancário / F&I
  {
    id: "lead-k-106",
    name: "Marcos Valério",
    phone: "+5547996789012",
    email: "marcos.valerio@email.com",
    vehicleInterest: "Toyota Hilux SRX 2022",
    vehicleId: "v-007",
    vehicleName: "Toyota Hilux SRX 2022",
    status: "proposta",
    stage: "proposal_fi",
    proposalFi: true,
    sellerId: "sp-002",
    sellerName: "Amanda Souza",
    sellerPhone: "+5547999884400",
    estimatedValue: 245000,
    origin: "webmotors",
    source: "webmotors",
    firstContactMinutes: 7,
    slaMinutesElapsed: 7,
    createdAt: hoursAgo(18),
    firstContactAt: hoursAgo(17.8),
    lastContactAt: hoursAgo(2),
    notes: "Veículo reservado. Ficha em análise de crédito na mesa F&I.",
  },

  // Cenário G: Venda Concluída / Ganho
  {
    id: "lead-k-107",
    name: "Renata Silveira",
    phone: "+5547997890123",
    email: "renata.silveira@email.com",
    vehicleInterest: "Chevrolet Tracker Premier 2022",
    vehicleId: "v-009",
    vehicleName: "Chevrolet Tracker Premier 2022",
    status: "fechado",
    stage: "won",
    sellerId: "sp-002",
    sellerName: "Amanda Souza",
    sellerPhone: "+5547999884400",
    estimatedValue: 108000,
    origin: "instagram",
    source: "meta_ads",
    firstContactMinutes: 6,
    slaMinutesElapsed: 6,
    createdAt: hoursAgo(8),
    firstContactAt: hoursAgo(7.9),
    lastContactAt: hoursAgo(1),
    notes: "Venda concluída hoje! Valor R$ 108.000. Veículo Chevrolet Tracker Premier.",
  },

  // Cenário H: Oportunidade Perdida com Motivo Canônico
  {
    id: "lead-k-108",
    name: "Gustavo Pinheiro",
    phone: "+5547998901234",
    email: "gustavo.pinheiro@email.com",
    vehicleInterest: "Fiat Toro Volcano 2023",
    vehicleId: "v-010",
    vehicleName: "Fiat Toro Volcano 2023",
    status: "fechado",
    stage: "lost",
    lostReason: "comprou_concorrente",
    sellerId: "sp-001",
    sellerName: "Rafael Martins",
    sellerPhone: "+5547999883300",
    estimatedValue: 152000,
    origin: "olx",
    source: "olx",
    firstContactMinutes: 11,
    slaMinutesElapsed: 11,
    createdAt: hoursAgo(20),
    firstContactAt: hoursAgo(19.8),
    lastContactAt: hoursAgo(4),
    notes: "Fechou com outra loja por diferença na avaliação do usado.",
  },
];

// ---------------------------------------------------------------------------
// 4. Conversão para Tipos CRM Padrão (Lead, KanbanLead)
// ---------------------------------------------------------------------------

export const DEMO_LEADS: Lead[] = DEMO_LEAD_ITEMS.map((item) => ({
  id: item.id,
  name: item.name,
  phone: item.phone,
  email: item.email,
  vehicleInterest: item.vehicleInterest,
  vehicleId: item.vehicleId,
  vehicleName: item.vehicleName,
  status: item.status,
  stage: item.stage,
  sellerId: item.sellerId,
  sellerName: item.sellerName,
  sellerPhone: item.sellerPhone,
  origin: item.origin,
  organizationId: DEFAULT_DEMO_ORG_ID,
  estimatedValue: item.estimatedValue,
  notes: item.notes,
  createdAt: item.createdAt,
  firstContactAt: item.firstContactAt,
  lastContactAt: item.lastContactAt,
  proposalFi: item.proposalFi,
}));

export const DEMO_KANBAN_LEADS: KanbanLead[] = DEMO_LEAD_ITEMS.map((item) => ({
  id: item.id,
  organization_id: DEFAULT_DEMO_ORG_ID,
  name: item.name,
  phone: item.phone,
  email: item.email,
  source: item.source,
  vehicle_of_interest: item.vehicleInterest,
  vehicle_id: item.vehicleId,
  vehicle_name: item.vehicleName,
  assigned_to: {
    id: item.sellerId,
    name: item.sellerName,
    phone: item.sellerPhone,
  },
  assigned_to_name: item.sellerName,
  stage: item.stage,
  sla_minutes: 15,
  sla_minutes_elapsed: item.slaMinutesElapsed,
  created_at: item.createdAt,
  updated_at: item.lastContactAt || item.createdAt,
  value: item.estimatedValue,
  estimated_value: item.estimatedValue,
  segment: "used_cars",
  notes: item.notes,
  lost_reason: item.lostReason,
}));

// ---------------------------------------------------------------------------
// 5. Carteira de Clientes Demo (/clients)
// ---------------------------------------------------------------------------

export const DEMO_CLIENTS: Client[] = [
  {
    id: "cli-demo-01",
    name: "Felipe Albuquerque",
    phone: "(47) 99123-4567",
    email: "felipe.albuquerque@email.com",
    document: "111.222.333-44",
    status: "ativo" as ClientStatus,
    sellerName: "Rafael Martins",
    vehiclePreference: "Toyota Corolla 2.0 XEi 2023",
    totalPurchased: 0,
    purchasesCount: 0,
    lastInteractionAt: minutesAgo(8),
    notes: "Interesse em Toyota Corolla 2023. Em atendimento com Rafael Martins.",
  },
  {
    id: "cli-demo-02",
    name: "Camila Duarte",
    phone: "(47) 99234-5678",
    email: "camila.duarte@email.com",
    document: "222.333.444-55",
    status: "ativo" as ClientStatus,
    sellerName: "Amanda Souza",
    vehiclePreference: "Volkswagen T-Cross Highline 2022",
    totalPurchased: 0,
    purchasesCount: 0,
    lastInteractionAt: minutesAgo(26),
    notes: "Interesse em VW T-Cross 2022. Primeiro contato realizado por Amanda Souza.",
  },
  {
    id: "cli-demo-03",
    name: "Rodrigo Mendes",
    phone: "(47) 99345-6789",
    email: "rodrigo.mendes@email.com",
    document: "333.444.555-66",
    status: "ativo" as ClientStatus,
    sellerName: "Rafael Martins",
    vehiclePreference: "Jeep Compass Longitude 2021",
    totalPurchased: 0,
    purchasesCount: 0,
    lastInteractionAt: hoursAgo(2),
    notes: "Interesse em Jeep Compass 2021. Em negociação com follow-up pendente.",
  },
  {
    id: "cli-demo-04",
    name: "Beatriz Santos",
    phone: "(47) 99456-7890",
    email: "beatriz.santos@email.com",
    document: "444.555.666-77",
    status: "ativo" as ClientStatus,
    sellerName: "Amanda Souza",
    vehiclePreference: "Honda Civic Touring 2021",
    totalPurchased: 0,
    purchasesCount: 0,
    lastInteractionAt: hoursAgo(1),
    notes: "Interesse em Honda Civic Touring. Visita e test-drive agendados para hoje às 16:30.",
  },
  {
    id: "cli-demo-05",
    name: "Leonardo Vargas",
    phone: "(47) 99567-8901",
    email: "leonardo.vargas@email.com",
    document: "555.666.777-88",
    status: "ativo" as ClientStatus,
    sellerName: "Rafael Martins",
    vehiclePreference: "Hyundai HB20 Platinum Plus 2024",
    totalPurchased: 0,
    purchasesCount: 0,
    lastInteractionAt: hoursAgo(3),
    notes: "Interesse em Hyundai HB20. Proposta formalizada de R$ 92.000 em análise.",
  },
  {
    id: "cli-demo-06",
    name: "Marcos Valério",
    phone: "(47) 99678-9012",
    email: "marcos.valerio@email.com",
    document: "666.777.888-99",
    status: "ativo" as ClientStatus,
    sellerName: "Amanda Souza",
    vehiclePreference: "Toyota Hilux SRX 2022",
    totalPurchased: 0,
    purchasesCount: 0,
    lastInteractionAt: hoursAgo(2),
    notes: "Toyota Hilux SRX reservada. Ficha de financiamento em análise na mesa de crédito F&I.",
  },
  {
    id: "cli-demo-07",
    name: "Renata Silveira",
    phone: "(47) 99789-0123",
    email: "renata.silveira@email.com",
    document: "777.888.999-00",
    status: "comprador" as ClientStatus,
    sellerName: "Amanda Souza",
    vehiclePreference: "Chevrolet Tracker Premier 2022",
    totalPurchased: 108000,
    purchasesCount: 1,
    lastInteractionAt: hoursAgo(1),
    notes: "Cliente Ativo (Venda Ganha). Comprou Chevrolet Tracker Premier hoje à vista por R$ 108.000.",
  },
  {
    id: "cli-demo-08",
    name: "Gustavo Pinheiro",
    phone: "(47) 99890-1234",
    email: "gustavo.pinheiro@email.com",
    document: "888.999.000-11",
    status: "inativo" as ClientStatus,
    sellerName: "Rafael Martins",
    vehiclePreference: "Fiat Toro Volcano 2023",
    totalPurchased: 0,
    purchasesCount: 0,
    lastInteractionAt: hoursAgo(4),
    notes: "Inativo / Perdido. Desistiu da compra da Fiat Toro Volcano (comprou no concorrente por diferença na avaliação do usado).",
  },
];

// ---------------------------------------------------------------------------
// 6. Constantes Consolidadas e Métricas da Empresa Demo
// ---------------------------------------------------------------------------

export const DEMO_KPI_TOTAL_REVENUE = 108000; // R$ 108.000 da venda ganha hoje
export const DEMO_KPI_WON_COUNT = 1;
export const DEMO_KPI_TOTAL_LEADS = 8;
export const DEMO_KPI_AVERAGE_TICKET = 108000;
export const DEMO_KPI_CONVERSION_RATE = 12.5; // (1 / 8) * 100
export const DEMO_KPI_GLOBAL_SLA_MINUTES = 9.1; // Média de tempo de primeiro contato (Amanda 8.0 + Rafael 10.3)

// ---------------------------------------------------------------------------
// 7. Ações Prescritivas Demo do Cockpit do Gestor
// ---------------------------------------------------------------------------

export interface DemoCockpitActionItem {
  id: string;
  sellerName: string;
  avatar: string;
  actionText: string;
  leadCount: number;
  urgencyType: "danger" | "warning" | "hot";
  timeText: string;
  defaultMessage: string;
  phone: string;
}

export const DEMO_COCKPIT_ACTIONS: DemoCockpitActionItem[] = [
  {
    id: "act-demo-rafael",
    sellerName: "Rafael Martins",
    avatar: "RM",
    actionText: "Follow-up de Rodrigo Mendes (Jeep Compass 2021) vencido há 2h",
    leadCount: 1,
    urgencyType: "danger",
    timeText: "Há 2h",
    defaultMessage: "Olá Rafael, identifiquei no Acelera que o follow-up de Rodrigo Mendes (Jeep Compass 2021) está vencido há 2 horas. Vamos priorizar esse contato para não perder a venda!",
    phone: "+5547999883300",
  },
  {
    id: "act-demo-amanda",
    sellerName: "Amanda Souza",
    avatar: "AS",
    actionText: "Ficha de financiamento de Marcos Valério (Toyota Hilux SRX) em análise",
    leadCount: 1,
    urgencyType: "warning",
    timeText: "Há 2h",
    defaultMessage: "Oi Amanda, temos a ficha de Marcos Valério (Hilux SRX) em análise na mesa de crédito. Consegue verificar o status junto ao operador bancário?",
    phone: "+5547999884400",
  },
];

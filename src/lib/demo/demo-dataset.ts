/**
 * @file demo-dataset.ts
 * @description Fonte Canônica Única de Dados e Indicadores da Empresa de Demonstração (DEFAULT_DEMO_ORG_ID).
 *
 * Consolida:
 * 1. Equipe Comercial Oficial (4 vendedores com metas e SLAs canônicos)
 * 2. Funil de Vendas Demo (24 leads distribuídos com 3 vendas ganhas totalizando R$ 215.800)
 * 3. Carteira de Clientes Demo (/clients com 3 compradores gerados dos leads fechados)
 * 4. Métricas e KPIs Executivos Unificados (SLA médio 8,2 min, ticket R$ 71.933, conversão 12.5%)
 */

import { DEFAULT_DEMO_ORG_ID } from "@/lib/auth/constants";
import type { TeamMember } from "@/types/team";
import type { Lead, Client, ClientStatus, LeadStatus, LeadOrigin } from "@/types/crm";
import type { KanbanLead, LeadStage } from "@/types/kanban";

// ---------------------------------------------------------------------------
// 1. Equipe Comercial Oficial da Empresa Demo (4 Vendedores)
// ---------------------------------------------------------------------------

export const DEMO_SELLERS: TeamMember[] = [
  {
    id: "sp-001",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Rafael Alves",
    email: "rafael.alves@aceleraauto.com.br",
    phone: "+5511988887777",
    role: "seller",
    segment: "all",
    in_roulette: true,
    status: "active",
    monthly_goal_units: 15,
    current_sales_units: 2,
    avg_sla_minutes: 6.0,
    created_at: "2026-07-01T10:00:00.000Z",
  },
  {
    id: "sp-002",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Camila Dias",
    email: "camila.dias@aceleraauto.com.br",
    phone: "+5511977776666",
    role: "seller",
    segment: "all",
    in_roulette: true,
    status: "active",
    monthly_goal_units: 12,
    current_sales_units: 1,
    avg_sla_minutes: 7.0,
    created_at: "2026-07-01T10:00:00.000Z",
  },
  {
    id: "sp-003",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Lucas Santana",
    email: "lucas.santana@aceleraauto.com.br",
    phone: "+5511966665555",
    role: "seller",
    segment: "all",
    in_roulette: true,
    status: "active",
    monthly_goal_units: 10,
    current_sales_units: 0,
    avg_sla_minutes: 11.0,
    created_at: "2026-07-01T10:00:00.000Z",
  },
  {
    id: "sp-004",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Beatriz Rocha",
    email: "beatriz.rocha@aceleraauto.com.br",
    phone: "+5511955554444",
    role: "seller",
    segment: "all",
    in_roulette: true,
    status: "active",
    monthly_goal_units: 10,
    current_sales_units: 0,
    avg_sla_minutes: 9.0,
    created_at: "2026-07-01T10:00:00.000Z",
  },
];

export const DEMO_ACTIVE_SELLER_NAMES = DEMO_SELLERS.map((s) => s.name);

// ---------------------------------------------------------------------------
// 2. Leads do Funil de Vendas Demo (24 Leads Canônicos)
// ---------------------------------------------------------------------------

export interface DemoLeadItem {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleInterest: string;
  status: LeadStatus;
  stage: LeadStage;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  estimatedValue: number;
  origin: LeadOrigin;
  source: string;
  firstContactMinutes: number; // Para cálculo consistente do SLA
  notes?: string;
  proposalFi?: boolean;
}

export const DEMO_LEAD_ITEMS: DemoLeadItem[] = [
  // --- 1. Novos Leads (6 leads na Roleta) ---
  {
    id: "lead-k-101",
    name: "Leandro Cunha",
    phone: "+5511988882222",
    email: "leandro.cunha@email.com",
    vehicleInterest: "Jeep Renegade Longitude 2023",
    status: "novo",
    stage: "new",
    sellerId: "sp-001",
    sellerName: "Rafael Alves",
    sellerPhone: "+5511988887777",
    estimatedValue: 125000,
    origin: "whatsapp",
    source: "whatsapp",
    firstContactMinutes: 6,
    notes: "Chegou pelo anúncio de Renegade seminovo.",
  },
  {
    id: "lead-k-102",
    name: "Monica Pires",
    phone: "+5511988889999",
    email: "monica.pires@email.com",
    vehicleInterest: "Honda HR-V EXL 2023",
    status: "novo",
    stage: "new",
    sellerId: "sp-001",
    sellerName: "Rafael Alves",
    sellerPhone: "+5511988887777",
    estimatedValue: 149000,
    origin: "webmotors",
    source: "webmotors",
    firstContactMinutes: 6,
    notes: "Solicitou simulação de entrada de R$ 50k.",
  },
  {
    id: "lead-k-103",
    name: "Otavio Vasques",
    phone: "+5511977770000",
    email: "otavio.vasques@email.com",
    vehicleInterest: "Toyota Corolla Cross XRE 2023",
    status: "novo",
    stage: "new",
    sellerId: "sp-002",
    sellerName: "Camila Dias",
    sellerPhone: "+5511977776666",
    estimatedValue: 155000,
    origin: "instagram",
    source: "meta_ads",
    firstContactMinutes: 7,
    notes: "Lead novo na roleta aguardando mensagem inicial.",
  },
  {
    id: "lead-k-104",
    name: "Paula Silveira",
    phone: "+5511977771111",
    email: "paula.silveira@email.com",
    vehicleInterest: "Hyundai HB20 Platinum 2023",
    status: "novo",
    stage: "new",
    sellerId: "sp-002",
    sellerName: "Camila Dias",
    sellerPhone: "+5511977776666",
    estimatedValue: 85000,
    origin: "site",
    source: "site",
    firstContactMinutes: 7,
    notes: "Cadastro via formulário do site oficial.",
  },
  {
    id: "lead-k-105",
    name: "Renato Barros",
    phone: "+5511966661111",
    email: "renato.barros@email.com",
    vehicleInterest: "Chevrolet Montana Premier 2023",
    status: "novo",
    stage: "new",
    sellerId: "sp-003",
    sellerName: "Lucas Santana",
    sellerPhone: "+5511966665555",
    estimatedValue: 128000,
    origin: "olx",
    source: "olx",
    firstContactMinutes: 11,
    notes: "Procura picape para uso urbano e trabalho.",
  },
  {
    id: "lead-k-106",
    name: "Sabrina Rezende",
    phone: "+5511955556666",
    email: "sabrina.rezende@email.com",
    vehicleInterest: "Fiat Strada Volcano 2023",
    status: "novo",
    stage: "new",
    sellerId: "sp-004",
    sellerName: "Beatriz Rocha",
    sellerPhone: "+5511955554444",
    estimatedValue: 115000,
    origin: "whatsapp",
    source: "whatsapp",
    firstContactMinutes: 9,
    notes: "Lead novo distribuído pela roleta automática.",
  },

  // --- 2. Em Atendimento (8 leads - Beatriz Rocha: 4) ---
  {
    id: "lead-k-107",
    name: "Vanessa Martins",
    phone: "+5511955551111",
    email: "vanessa.martins@email.com",
    vehicleInterest: "Fiat Pulse Audace 2023",
    status: "atendimento",
    stage: "in_contact",
    sellerId: "sp-004",
    sellerName: "Beatriz Rocha",
    sellerPhone: "+5511955554444",
    estimatedValue: 98000,
    origin: "whatsapp",
    source: "whatsapp",
    firstContactMinutes: 9,
    notes: "Em negociação de valor e simulação de entrada de R$ 30k.",
  },
  {
    id: "lead-k-108",
    name: "Bruno Carvalho",
    phone: "+5511955552222",
    email: "bruno.carvalho@email.com",
    vehicleInterest: "Renault Duster Iconic 2022",
    status: "atendimento",
    stage: "in_contact",
    sellerId: "sp-004",
    sellerName: "Beatriz Rocha",
    sellerPhone: "+5511955554444",
    estimatedValue: 92000,
    origin: "instagram",
    source: "meta_ads",
    firstContactMinutes: 9,
    notes: "Tirando dúvidas sobre consumo e revisões de garantia.",
  },
  {
    id: "lead-k-109",
    name: "Clarice Fontes",
    phone: "+5511955553333",
    email: "clarice.fontes@email.com",
    vehicleInterest: "Nissan Kicks Advance 2023",
    status: "atendimento",
    stage: "in_contact",
    sellerId: "sp-004",
    sellerName: "Beatriz Rocha",
    sellerPhone: "+5511955554444",
    estimatedValue: 112000,
    origin: "site",
    source: "site",
    firstContactMinutes: 9,
    notes: "Enviou fotos do carro usado para pré-avaliação.",
  },
  {
    id: "lead-k-110",
    name: "Danilo Siqueira",
    phone: "+5511955554444",
    email: "danilo.siqueira@email.com",
    vehicleInterest: "Peugeot 208 Griffe 2023",
    status: "atendimento",
    stage: "in_contact",
    sellerId: "sp-004",
    sellerName: "Beatriz Rocha",
    sellerPhone: "+5511955554444",
    estimatedValue: 89000,
    origin: "olx",
    source: "olx",
    firstContactMinutes: 9,
    notes: "Solicitou vídeo detalhado do painel digital e teto panorâmico.",
  },
  {
    id: "lead-k-111",
    name: "Gabriel Nogueira",
    phone: "+5511988883333",
    email: "gabriel.nogueira@email.com",
    vehicleInterest: "Chevrolet Onix Plus Premier 2023",
    status: "atendimento",
    stage: "in_contact",
    sellerId: "sp-001",
    sellerName: "Rafael Alves",
    sellerPhone: "+5511988887777",
    estimatedValue: 89900,
    origin: "whatsapp",
    source: "whatsapp",
    firstContactMinutes: 6,
    notes: "Avaliando opções de financiamento com taxa zero.",
  },
  {
    id: "lead-k-112",
    name: "Helena Castro",
    phone: "+5511988885555",
    email: "helena.castro@email.com",
    vehicleInterest: "Toyota Yaris Sedan XLS 2023",
    status: "atendimento",
    stage: "in_contact",
    sellerId: "sp-001",
    sellerName: "Rafael Alves",
    sellerPhone: "+5511988887777",
    estimatedValue: 95000,
    origin: "webmotors",
    source: "webmotors",
    firstContactMinutes: 6,
    notes: "Interessada em câmbio automático confiável para viagens.",
  },
  {
    id: "lead-k-113",
    name: "Igor Valente",
    phone: "+5511977778888",
    email: "igor.valente@email.com",
    vehicleInterest: "Volkswagen Polo Comfortline 2023",
    status: "atendimento",
    stage: "in_contact",
    sellerId: "sp-002",
    sellerName: "Camila Dias",
    sellerPhone: "+5511977776666",
    estimatedValue: 87000,
    origin: "instagram",
    source: "meta_ads",
    firstContactMinutes: 7,
    notes: "Primeiro carro para o filho, focado em segurança e consumo.",
  },
  {
    id: "lead-k-114",
    name: "Jessica Barreto",
    phone: "+5511977779999",
    email: "jessica.barreto@email.com",
    vehicleInterest: "Fiat Fastback Audace 2023",
    status: "atendimento",
    stage: "in_contact",
    sellerId: "sp-002",
    sellerName: "Camila Dias",
    sellerPhone: "+5511977776666",
    estimatedValue: 119000,
    origin: "site",
    source: "site",
    firstContactMinutes: 7,
    notes: "Interessada em agendar test-drive para o próximo sábado.",
  },

  // --- 3. Visita / Test-Drive (4 leads - Lucas Santana: 2) ---
  {
    id: "lead-k-115",
    name: "Thiago Ribeiro",
    phone: "+5511977773333",
    email: "thiago.ribeiro@email.com",
    vehicleInterest: "Jeep Compass Longitude 2023",
    status: "visita",
    stage: "test_drive",
    sellerId: "sp-003",
    sellerName: "Lucas Santana",
    sellerPhone: "+5511966665555",
    estimatedValue: 168000,
    origin: "webmotors",
    source: "webmotors",
    firstContactMinutes: 11,
    notes: "Visita agendada para test-drive amanhã às 14h.",
  },
  {
    id: "lead-k-116",
    name: "Patrícia Vieira",
    phone: "+5591889765432",
    email: "patricia.vieira@uol.com.br",
    vehicleInterest: "Toyota Corolla XEi 2022",
    status: "visita",
    stage: "test_drive",
    sellerId: "sp-003",
    sellerName: "Lucas Santana",
    sellerPhone: "+5511966665555",
    estimatedValue: 135000,
    origin: "olx",
    source: "olx",
    firstContactMinutes: 11,
    notes: "Cliente visitou o pátio e gostou do estado dos pneus.",
  },
  {
    id: "lead-k-117",
    name: "Marcelo Dantas",
    phone: "+5511988884444",
    email: "marcelo.dantas@email.com",
    vehicleInterest: "Volkswagen Nivus Highline 2022",
    status: "visita",
    stage: "test_drive",
    sellerId: "sp-001",
    sellerName: "Rafael Alves",
    sellerPhone: "+5511988887777",
    estimatedValue: 118000,
    origin: "instagram",
    source: "meta_ads",
    firstContactMinutes: 6,
    notes: "Test-drive realizado com sucesso. Aguarda proposta formal.",
  },
  {
    id: "lead-k-118",
    name: "Juliana Peixoto",
    phone: "+5511977775555",
    email: "juliana.peixoto@email.com",
    vehicleInterest: "Hyundai Creta Ultimate 2023",
    status: "visita",
    stage: "test_drive",
    sellerId: "sp-002",
    sellerName: "Camila Dias",
    sellerPhone: "+5511977776666",
    estimatedValue: 145000,
    origin: "site",
    source: "site",
    firstContactMinutes: 7,
    notes: "Visita na concessionária com a família para ver o espaço interno.",
  },

  // --- 4. Propostas (3 leads - Lucas Santana: 3, somando 5 em proposta/visita) ---
  {
    id: "lead-k-119",
    name: "Luciana Prado",
    phone: "+5511999995555",
    email: "luciana.prado@email.com",
    vehicleInterest: "Volkswagen T-Cross Highline 2022",
    status: "proposta",
    stage: "proposal",
    sellerId: "sp-003",
    sellerName: "Lucas Santana",
    sellerPhone: "+5511966665555",
    estimatedValue: 126000,
    origin: "webmotors",
    source: "webmotors",
    firstContactMinutes: 11,
    proposalFi: true,
    notes: "Dando Onix 2021 na troca de um T-Cross Highline. Análise F&I Itaú.",
  },
  {
    id: "lead-k-120",
    name: "Rodrigo Meirelles",
    phone: "+5511988886666",
    email: "rodrigo.meirelles@email.com",
    vehicleInterest: "Honda HR-V Advance 2023",
    status: "proposta",
    stage: "proposal",
    sellerId: "sp-003",
    sellerName: "Lucas Santana",
    sellerPhone: "+5511966665555",
    estimatedValue: 159000,
    origin: "site",
    source: "site",
    firstContactMinutes: 11,
    notes: "Proposta enviada com avaliação do usado na troca.",
  },
  {
    id: "lead-k-121",
    name: "Mariana Albuquerque",
    phone: "+5547998877665",
    email: "mariana.albuquerque@gmail.com",
    vehicleInterest: "Toyota Corolla Altis Hybrid 2023",
    status: "proposta",
    stage: "proposal",
    sellerId: "sp-003",
    sellerName: "Lucas Santana",
    sellerPhone: "+5511966665555",
    estimatedValue: 162000,
    origin: "whatsapp",
    source: "whatsapp",
    firstContactMinutes: 11,
    proposalFi: true,
    notes: "Ficha bancária aprovada Banco BV aguardando assinatura.",
  },

  // --- 5. Vendas Fechadas (3 leads - Total: R$ 215.800) ---
  {
    id: "lead-k-122",
    name: "Roberto Mendes",
    phone: "+5511988881111",
    email: "roberto.mendes@email.com",
    vehicleInterest: "Honda Civic EXL 2.0 CVT 2022",
    status: "fechado",
    stage: "won",
    sellerId: "sp-001",
    sellerName: "Rafael Alves",
    sellerPhone: "+5511988887777",
    estimatedValue: 90000,
    origin: "site",
    source: "site",
    firstContactMinutes: 6,
    notes: "Venda concluída de Honda Civic com entrada e financiamento Santander.",
  },
  {
    id: "lead-k-123",
    name: "Carlos Eduardo",
    phone: "+5511977772222",
    email: "carlos.eduardo@email.com",
    vehicleInterest: "Ford Ka SE Plus 1.0 2021",
    status: "fechado",
    stage: "won",
    sellerId: "sp-001",
    sellerName: "Rafael Alves",
    sellerPhone: "+5511988887777",
    estimatedValue: 52900,
    origin: "olx",
    source: "olx",
    firstContactMinutes: 6,
    notes: "Venda fechada de Ford Ka à vista com transferência imediata.",
  },
  {
    id: "lead-k-124",
    name: "Fernanda Lima",
    phone: "+5511966663333",
    email: "fernanda.lima@email.com",
    vehicleInterest: "Chevrolet Tracker Premier 1.2 Turbo 2022",
    status: "fechado",
    stage: "won",
    sellerId: "sp-002",
    sellerName: "Camila Dias",
    sellerPhone: "+5511977776666",
    estimatedValue: 72900,
    origin: "whatsapp",
    source: "whatsapp",
    firstContactMinutes: 7,
    notes: "Venda concluída de Chevrolet Tracker. Cliente satisfeita com o test-drive.",
  },
];

// ---------------------------------------------------------------------------
// 3. Conversão para Tipos CRM Padrão (Lead, KanbanLead)
// ---------------------------------------------------------------------------

const baseTime = Date.now();

export const DEMO_LEADS: Lead[] = DEMO_LEAD_ITEMS.map((item, idx) => {
  const createdAt = new Date(baseTime - (24 - idx) * 3600000).toISOString();
  const firstContactAt =
    item.status !== "novo"
      ? new Date(new Date(createdAt).getTime() + item.firstContactMinutes * 60000).toISOString()
      : null;
  const lastContactAt = firstContactAt || createdAt;

  return {
    id: item.id,
    name: item.name,
    phone: item.phone,
    email: item.email,
    vehicleInterest: item.vehicleInterest,
    status: item.status,
    sellerName: item.sellerName,
    origin: item.origin,
    organizationId: DEFAULT_DEMO_ORG_ID,
    estimatedValue: item.estimatedValue,
    notes: item.notes,
    createdAt,
    lastContactAt,
    proposalFi: item.proposalFi,
  };
});

export const DEMO_KANBAN_LEADS: KanbanLead[] = DEMO_LEAD_ITEMS.map((item, idx) => {
  const createdAt = new Date(baseTime - (24 - idx) * 3600000).toISOString();
  return {
    id: item.id,
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: item.name,
    phone: item.phone,
    email: item.email,
    source: item.source,
    vehicle_of_interest: item.vehicleInterest,
    assigned_to: {
      id: item.sellerId,
      name: item.sellerName,
      phone: item.sellerPhone,
    },
    assigned_to_name: item.sellerName,
    stage: item.stage,
    sla_minutes: 15,
    sla_minutes_elapsed: item.firstContactMinutes,
    created_at: createdAt,
    updated_at: createdAt,
    value: item.estimatedValue,
    estimated_value: item.estimatedValue,
    segment: "used_cars",
    notes: item.notes,
  };
});

// ---------------------------------------------------------------------------
// 4. Carteira de Clientes Demo (/clients com 3 Compradores dos Leads Fechados)
// ---------------------------------------------------------------------------

export const DEMO_CLIENTS: Client[] = [
  {
    id: "cli-demo-01",
    name: "Roberto Mendes",
    phone: "+5511988881111",
    email: "roberto.mendes@email.com",
    document: "111.222.333-44",
    status: "comprador" as ClientStatus,
    sellerName: "Rafael Alves",
    vehiclePreference: "Honda Civic EXL 2.0 CVT 2022",
    totalPurchased: 90000,
    purchasesCount: 1,
    lastInteractionAt: "2026-09-07T14:30:00.000Z",
    notes: "Compra concluída de Honda Civic à vista com financiamento Santander.",
  },
  {
    id: "cli-demo-02",
    name: "Carlos Eduardo",
    phone: "+5511977772222",
    email: "carlos.eduardo@email.com",
    document: "222.333.444-55",
    status: "comprador" as ClientStatus,
    sellerName: "Rafael Alves",
    vehiclePreference: "Ford Ka SE Plus 1.0 2021",
    totalPurchased: 52900,
    purchasesCount: 1,
    lastInteractionAt: "2026-09-06T11:20:00.000Z",
    notes: "Compra fechada de Ford Ka à vista com transferência imediata.",
  },
  {
    id: "cli-demo-03",
    name: "Fernanda Lima",
    phone: "+5511966663333",
    email: "fernanda.lima@email.com",
    document: "333.444.555-66",
    status: "comprador" as ClientStatus,
    sellerName: "Camila Dias",
    vehiclePreference: "Chevrolet Tracker Premier 1.2 Turbo 2022",
    totalPurchased: 72900,
    purchasesCount: 1,
    lastInteractionAt: "2026-09-05T16:45:00.000Z",
    notes: "Compra concluída de Chevrolet Tracker. Cliente satisfeita com o pós-venda.",
  },
];

// ---------------------------------------------------------------------------
// 5. Constantes Consolidadas e Métricas da Empresa Demo
// ---------------------------------------------------------------------------

export const DEMO_KPI_TOTAL_REVENUE = 215800; // R$ 90.000 + R$ 52.900 + R$ 72.900
export const DEMO_KPI_WON_COUNT = 3;
export const DEMO_KPI_TOTAL_LEADS = 24;
export const DEMO_KPI_AVERAGE_TICKET = 71933; // 215.800 / 3
export const DEMO_KPI_CONVERSION_RATE = 12.5; // (3 / 24) * 100
export const DEMO_KPI_GLOBAL_SLA_MINUTES = 8.2; // Média global ~8 min

// ---------------------------------------------------------------------------
// 6. Ações Prescritivas Demo do Cockpit do Gestor
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
    sellerName: "Rafael Alves",
    avatar: "RA",
    actionText: "2 novos leads aguardando 1º contato no funil",
    leadCount: 2,
    urgencyType: "danger",
    timeText: "Há 6 min",
    defaultMessage: "Olá Rafael, identifiquei no Acelera que você possui 2 novos leads aguardando resposta há 6 minutos. Vamos priorizar o contato agora para não esfriar!",
    phone: "+5511988887777",
  },
  {
    id: "act-demo-camila",
    sellerName: "Camila Dias",
    avatar: "CD",
    actionText: "2 novos leads aguardando 1º contato no funil",
    leadCount: 2,
    urgencyType: "danger",
    timeText: "Há 7 min",
    defaultMessage: "Olá Camila, identifiquei no Acelera que você possui 2 novos leads aguardando resposta há 7 minutos. Vamos priorizar o contato agora para não esfriar!",
    phone: "+5511977776666",
  },
  {
    id: "act-demo-lucas",
    sellerName: "Lucas Santana",
    avatar: "LS",
    actionText: "3 propostas de clientes com mais de 24h sem retorno no funil",
    leadCount: 3,
    urgencyType: "warning",
    timeText: "Há 28h",
    defaultMessage: "Oi Lucas, temos 3 propostas de clientes com mais de 24h sem retorno no funil. Consegue fazer um follow-up com eles hoje?",
    phone: "+5511966665555",
  },
  {
    id: "act-demo-beatriz",
    sellerName: "Beatriz Rocha",
    avatar: "BR",
    actionText: "4 leads em atendimento aguardando avanço para visita",
    leadCount: 4,
    urgencyType: "warning",
    timeText: "Há 9 min",
    defaultMessage: "Oi Beatriz, você tem 4 leads em atendimento no funil. Vamos acelerar o convite para o test-drive na loja?",
    phone: "+5511955554444",
  },
];

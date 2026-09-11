/**
 * @file mock-data.ts
 * @description Dados de demonstração para desenvolvimento e testes do Acelera Auto CRM.
 *
 * Contém 8 veículos e 10 leads realistas + funções utilitárias para criar e
 * atualizar veículos no estado local (pré-Supabase).
 */

import type {
  Lead,
  Vehicle,
  VehicleFormData,
  VehicleStatus,
  Client,
  ClientFormData,
} from "@/types/crm";
import { DEMO_LEADS, DEMO_CLIENTS } from "@/lib/demo/demo-dataset";

// ---------------------------------------------------------------------------
// Veículos de demonstração
// ---------------------------------------------------------------------------
// Veículos de demonstração de alta liquidez (10 veículos canônicos)
// ---------------------------------------------------------------------------

export const mockVehicles: Vehicle[] = [
  {
    id: "v-001",
    make: "Toyota",
    model: "Corolla",
    version: "2.0 XEi",
    yearFab: 2023,
    yearModel: 2023,
    plate: "BRA2E23",
    km: 28000,
    price: 138900,
    status: "disponivel",
    imageUrl: "/vehicles/corolla.jpg",
    daysInStock: 14,
    fipePrice: 142000,
    estimatedMargin: 11000,
    fuel: "flex",
    transmission: "automatico",
    color: "Prata",
  },
  {
    id: "v-002",
    make: "Volkswagen",
    model: "T-Cross",
    version: "Highline 250 TSI",
    yearFab: 2022,
    yearModel: 2022,
    plate: "BCT4H22",
    km: 36000,
    price: 119500,
    status: "disponivel",
    imageUrl: "/vehicles/tcross.jpg",
    daysInStock: 21,
    fipePrice: 122000,
    estimatedMargin: 9500,
    fuel: "flex",
    transmission: "automatico",
    color: "Branco",
  },
  {
    id: "v-003",
    make: "Jeep",
    model: "Compass",
    version: "Longitude 1.3 Turbo",
    yearFab: 2021,
    yearModel: 2021,
    plate: "JCP5L21",
    km: 48000,
    price: 124000,
    status: "disponivel",
    imageUrl: "/vehicles/compass.jpg",
    daysInStock: 35,
    fipePrice: 127500,
    estimatedMargin: 10500,
    fuel: "flex",
    transmission: "automatico",
    color: "Preto",
  },
  {
    id: "v-004",
    make: "Chevrolet",
    model: "Onix",
    version: "Premier 1.0 Turbo",
    yearFab: 2023,
    yearModel: 2023,
    plate: "COP7P23",
    km: 19000,
    price: 89900,
    status: "disponivel",
    imageUrl: "/vehicles/onix.jpg",
    daysInStock: 9,
    fipePrice: 92000,
    estimatedMargin: 7900,
    fuel: "flex",
    transmission: "automatico",
    color: "Cinza",
  },
  {
    id: "v-005",
    make: "Honda",
    model: "Civic",
    version: "Touring 1.5 Turbo",
    yearFab: 2021,
    yearModel: 2021,
    plate: "HCT8T21",
    km: 42000,
    price: 142000,
    status: "disponivel",
    imageUrl: "/vehicles/civic.jpg",
    daysInStock: 18,
    fipePrice: 145000,
    estimatedMargin: 12000,
    fuel: "gasolina",
    transmission: "cvt",
    color: "Azul Cósmico",
  },
  {
    id: "v-006",
    make: "Hyundai",
    model: "HB20",
    version: "Platinum Plus 1.0 TGDI",
    yearFab: 2024,
    yearModel: 2024,
    plate: "HBP9P24",
    km: 11000,
    price: 94500,
    status: "disponivel",
    imageUrl: "/vehicles/hb20.jpg",
    daysInStock: 5,
    fipePrice: 96000,
    estimatedMargin: 8000,
    fuel: "flex",
    transmission: "automatico",
    color: "Branco",
  },
  {
    id: "v-007",
    make: "Toyota",
    model: "Hilux",
    version: "SRX 2.8 4x4",
    yearFab: 2022,
    yearModel: 2022,
    plate: "THX2S22",
    km: 52000,
    price: 245000,
    status: "reservado",
    imageUrl: "/vehicles/hilux.jpg",
    daysInStock: 12,
    fipePrice: 250000,
    estimatedMargin: 18000,
    fuel: "diesel",
    transmission: "automatico",
    color: "Prata",
    buyerName: "Marcos Valério",
    notes: "Reservado para Marcos Valério (análise de crédito F&I)",
  },
  {
    id: "v-008",
    make: "Volkswagen",
    model: "Nivus",
    version: "Highline 200 TSI",
    yearFab: 2023,
    yearModel: 2023,
    plate: "VNH3H23",
    km: 22000,
    price: 112000,
    status: "reservado",
    imageUrl: "/vehicles/nivus.jpg",
    daysInStock: 8,
    fipePrice: 114500,
    estimatedMargin: 9000,
    fuel: "flex",
    transmission: "automatico",
    color: "Cinza Platinum",
    buyerName: "Patricia Lima",
    notes: "Reservado para Patricia Lima",
  },
  {
    id: "v-009",
    make: "Chevrolet",
    model: "Tracker",
    version: "Premier 1.2 Turbo",
    yearFab: 2022,
    yearModel: 2022,
    plate: "CTP4P22",
    km: 34000,
    price: 108000,
    status: "vendido",
    imageUrl: "/vehicles/tracker.jpg",
    daysInStock: 15,
    fipePrice: 110000,
    estimatedMargin: 9200,
    fuel: "flex",
    transmission: "automatico",
    color: "Vermelho Chili",
    sellerName: "Amanda Souza",
    buyerName: "Renata Silveira",
    notes: "Venda recente vinculada a Amanda Souza | Compradora: Renata Silveira",
  },
  {
    id: "v-010",
    make: "Fiat",
    model: "Toro",
    version: "Volcano 2.0 4x4",
    yearFab: 2023,
    yearModel: 2023,
    plate: "FTV5V23",
    km: 29000,
    price: 152000,
    status: "vendido",
    imageUrl: "/vehicles/toro.jpg",
    daysInStock: 22,
    fipePrice: 156000,
    estimatedMargin: 12500,
    fuel: "diesel",
    transmission: "automatico",
    color: "Marrom Deep",
    sellerName: "Rafael Martins",
    buyerName: "Roberto Mendes",
    notes: "Venda recente vinculada a Rafael Martins | Comprador: Roberto Mendes",
  },
];

export const INITIAL_DEMO_VEHICLES: Vehicle[] = mockVehicles.map((v) => ({ ...v }));

export function resetMockVehicles(): void {
  mockVehicles.length = 0;
  mockVehicles.push(...INITIAL_DEMO_VEHICLES.map((v) => ({ ...v })));
}

// ---------------------------------------------------------------------------
// Funções utilitárias para estado local (pre-Supabase)
// ---------------------------------------------------------------------------

/**
 * Cria um novo veículo a partir dos dados do formulário, gerando um `id` único.
 *
 * @param data - Dados do formulário sem `id`.
 * @returns Objeto `Vehicle` completo com `id` gerado.
 */
export function createVehicle(data: VehicleFormData): Vehicle {
  return {
    id: `v-${Date.now()}`,
    ...data,
  };
}

/**
 * Atualiza o status de um veículo numa lista imutável.
 *
 * @param vehicles - Lista de veículos atual.
 * @param id - ID do veículo a atualizar.
 * @param status - Novo status.
 * @returns Nova lista com o veículo atualizado.
 */
export function updateVehicleStatus(
  vehicles: Vehicle[],
  id: string,
  status: VehicleStatus
): Vehicle[] {
  return vehicles.map((v) => (v.id === id ? { ...v, status } : v));
}

/**
 * Formata um número como moeda Brasileira (BRL).
 *
 * @param value - Valor em Reais.
 * @returns String formatada, ex: "R$\u00a0149.900".
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formata quilometragem com separador de milhar.
 *
 * @param km - Quilometragem.
 * @returns String formatada, ex: "18.500 km".
 */
export function formatKm(km: number): string {
  return `${new Intl.NumberFormat("pt-BR").format(km)} km`;
}

// ---------------------------------------------------------------------------
// Leads de demonstração (Cenário Concessionária Viva - 33 leads)
// ---------------------------------------------------------------------------

export const mockLeads: Lead[] = [...DEMO_LEADS];

/**
 * Gera a carteira de clientes de demonstração a partir dos 3 compradores fechados.
 * Total: 3 clientes compradores com R$ 215.800 em vendas e ticket médio de R$ 71.933.
 */
export function getDemoClientsFromClosedLeads(): Client[] {
  return [...DEMO_CLIENTS];
}

// ---------------------------------------------------------------------------
// Clientes de demonstração (Carteira CRM)
// ---------------------------------------------------------------------------

export const mockClients: Client[] = [
  {
    id: "c-001",
    name: "Mariana Souza",
    phone: "47998877665",
    email: "mariana.souza@gmail.com",
    document: "123.456.789-00",
    status: "comprador",
    sellerName: "Rafael Alves",
    vehiclePreference: "Corolla Cross XRE",
    totalPurchased: 168900,
    purchasesCount: 1,
    lastInteractionAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Cliente fiel, comprou SUV recentemente. Interesse em troca após 2 anos.",
  },
  {
    id: "c-002",
    name: "Carlos Mendonça",
    phone: "11987654321",
    email: "carlos.mendonca@email.com",
    document: "234.567.890-11",
    status: "ativo",
    sellerName: "Rafael Alves",
    vehiclePreference: "Honda Civic EXL",
    totalPurchased: 0,
    purchasesCount: 0,
    lastInteractionAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    notes: "Aguardando proposta de financiamento do banco Santander.",
  },
  {
    id: "c-003",
    name: "Roberto Silveira",
    phone: "21988887777",
    email: "roberto.silveira@outlook.com",
    document: "345.678.901-22",
    status: "comprador",
    sellerName: "Camila Dias",
    vehiclePreference: "Jeep Compass Limited",
    totalPurchased: 354800,
    purchasesCount: 2,
    lastInteractionAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Colecionador de utilitários, comprou dois veículos na loja.",
  },
  {
    id: "c-004",
    name: "Aline Gomes",
    phone: "71910987654",
    email: "aline.gomes@empresa.com",
    document: "456.789.012-33",
    status: "ativo",
    sellerName: "Camila Dias",
    vehiclePreference: "Volkswagen T-Cross",
    totalPurchased: 0,
    purchasesCount: 0,
    lastInteractionAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    notes: "Test-drive agendado para o próximo sábado às 10h.",
  },
  {
    id: "c-005",
    name: "Eduardo Castro",
    phone: "85900876543",
    email: "edu.castro@outlook.com",
    document: "567.890.123-44",
    status: "inativo",
    sellerName: "Lucas Santana",
    vehiclePreference: "Fiat Strada Volcano",
    totalPurchased: 112900,
    purchasesCount: 1,
    lastInteractionAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Sem contato há mais de 3 meses. Campanha de reativação necessária.",
  },
  {
    id: "c-006",
    name: "Patrícia Vieira",
    phone: "91889765432",
    email: "patricia.vieira@uol.com.br",
    document: "678.901.234-55",
    status: "comprador",
    sellerName: "Rafael Alves",
    vehiclePreference: "Renault Kwid Intense",
    totalPurchased: 59900,
    purchasesCount: 1,
    lastInteractionAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Primeiro carro comprado para o filho recém-habilitado.",
  },
];

/**
 * Cria uma nova entidade Client a partir dos dados do formulário.
 */
export function createClient(data: ClientFormData): Client {
  return {
    id: `c-${Date.now()}`,
    ...data,
    totalPurchased: 0,
    purchasesCount: 0,
    lastInteractionAt: new Date().toISOString(),
  };
}


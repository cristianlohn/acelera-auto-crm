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
  ClientStatus,
  ClientFormData,
} from "@/types/crm";
import { DEMO_LEADS, DEMO_CLIENTS } from "@/lib/demo/demo-dataset";

// ---------------------------------------------------------------------------
// Veículos de demonstração
// ---------------------------------------------------------------------------
// Veículos de demonstração (15 veículos realistas)
// ---------------------------------------------------------------------------

export const mockVehicles: Vehicle[] = [
  {
    id: "v-001",
    make: "Honda",
    model: "Civic",
    version: "EXL 2.0 Flex Aut.",
    yearFab: 2022,
    yearModel: 2023,
    plate: "BRA-2E22",
    km: 18500,
    price: 149900,
    status: "disponivel",
    imageUrl: "/vehicles/civic.jpg",
    daysInStock: 12,
    fipePrice: 148000,
    estimatedMargin: 14500,
    fuel: "Flex",
    transmission: "Automático",
  },
  {
    id: "v-002",
    make: "Toyota",
    model: "Corolla",
    version: "XEI 2.0 Flex Aut.",
    yearFab: 2021,
    yearModel: 2022,
    plate: "CDA-3F19",
    km: 34200,
    price: 134900,
    status: "reservado",
    imageUrl: "/vehicles/corolla.jpg",
    daysInStock: 8,
    fipePrice: 133500,
    estimatedMargin: 12000,
    fuel: "Flex",
    transmission: "Automático",
  },
  {
    id: "v-003",
    make: "Jeep",
    model: "Compass",
    version: "Longitude 1.3 Turbo Flex Aut.",
    yearFab: 2023,
    yearModel: 2023,
    plate: "EFC-4G77",
    km: 21000,
    price: 168000,
    status: "disponivel",
    imageUrl: "/vehicles/compass.jpg",
    daysInStock: 42,
    fipePrice: 166000,
    estimatedMargin: 16000,
    fuel: "Flex",
    transmission: "Automático",
  },
  {
    id: "v-004",
    make: "Volkswagen",
    model: "T-Cross",
    version: "Highline 1.4 TSI Aut.",
    yearFab: 2022,
    yearModel: 2023,
    plate: "GHI-5J44",
    km: 22100,
    price: 129900,
    status: "disponivel",
    imageUrl: "/vehicles/tcross.jpg",
    daysInStock: 15,
    fipePrice: 128000,
    estimatedMargin: 11500,
    fuel: "Flex",
    transmission: "Automático",
  },
  {
    id: "v-005",
    make: "Fiat",
    model: "Pulse",
    version: "Audace 1.0 Turbo Flex Aut.",
    yearFab: 2023,
    yearModel: 2024,
    plate: "JKL-6M55",
    km: 19500,
    price: 98500,
    status: "disponivel",
    imageUrl: "/vehicles/pulse.jpg",
    daysInStock: 68,
    fipePrice: 97000,
    estimatedMargin: 9800,
    fuel: "Flex",
    transmission: "Automático",
  },
  {
    id: "v-006",
    make: "Chevrolet",
    model: "Onix",
    version: "Premier 1.0 Turbo Aut.",
    yearFab: 2022,
    yearModel: 2022,
    plate: "MNO-7P33",
    km: 41000,
    price: 84900,
    status: "disponivel",
    imageUrl: "/vehicles/onix.jpg",
    daysInStock: 24,
    fipePrice: 83000,
    estimatedMargin: 8200,
    fuel: "Flex",
    transmission: "Automático",
  },
  {
    id: "v-007",
    make: "Hyundai",
    model: "Creta",
    version: "Ultimate 2.0 Flex Aut.",
    yearFab: 2023,
    yearModel: 2023,
    plate: "PQR-8S11",
    km: 27400,
    price: 144000,
    status: "reservado",
    imageUrl: "/vehicles/creta.jpg",
    daysInStock: 19,
    fipePrice: 142000,
    estimatedMargin: 13800,
    fuel: "Flex",
    transmission: "Automático",
  },
  {
    id: "v-008",
    make: "Honda",
    model: "HR-V",
    version: "EXL 1.5 Flex Aut.",
    yearFab: 2023,
    yearModel: 2023,
    plate: "BCP-9A12",
    km: 25800,
    price: 139900,
    status: "disponivel",
    imageUrl: "/vehicles/hrv.jpg",
    daysInStock: 10,
    fipePrice: 138500,
    estimatedMargin: 12900,
    fuel: "Flex",
    transmission: "Automático",
  },
  {
    id: "v-009",
    make: "Toyota",
    model: "Corolla Cross",
    version: "Altis Hybrid 1.8 Aut.",
    yearFab: 2022,
    yearModel: 2023,
    plate: "HYB-1D88",
    km: 31000,
    price: 162000,
    status: "disponivel",
    imageUrl: "/vehicles/corolla-cross.jpg",
    daysInStock: 65,
    fipePrice: 160000,
    estimatedMargin: 15000,
    fuel: "Híbrido",
    transmission: "Automático",
  },
  {
    id: "v-010",
    make: "Jeep",
    model: "Commander",
    version: "Série S 1.3 Turbo Aut.",
    yearFab: 2022,
    yearModel: 2022,
    plate: "JPS-4E56",
    km: 38000,
    price: 178000,
    status: "disponivel",
    imageUrl: "/vehicles/commander.jpg",
    daysInStock: 35,
    fipePrice: 175000,
    estimatedMargin: 17500,
    fuel: "Flex",
    transmission: "Automático",
  },
  {
    id: "v-011",
    make: "Volkswagen",
    model: "Nivus",
    version: "Highline 1.0 TSI Aut.",
    yearFab: 2023,
    yearModel: 2023,
    plate: "NVX-2C40",
    km: 26300,
    price: 128000,
    status: "disponivel",
    imageUrl: "/vehicles/nivus.jpg",
    daysInStock: 7,
    fipePrice: 126000,
    estimatedMargin: 11000,
    fuel: "Flex",
    transmission: "Automático",
  },
  {
    id: "v-012",
    make: "Chevrolet",
    model: "Tracker",
    version: "Premier 1.2 Turbo Aut.",
    yearFab: 2023,
    yearModel: 2023,
    plate: "TRK-8B90",
    km: 22000,
    price: 119900,
    status: "disponivel",
    imageUrl: "/vehicles/tracker.jpg",
    daysInStock: 48,
    fipePrice: 118000,
    estimatedMargin: 10500,
    fuel: "Flex",
    transmission: "Automático",
  },
  {
    id: "v-013",
    make: "Fiat",
    model: "Fastback",
    version: "Limited Edition 1.3 Turbo Aut.",
    yearFab: 2023,
    yearModel: 2024,
    plate: "FBK-5H77",
    km: 18200,
    price: 136000,
    status: "disponivel",
    imageUrl: "/vehicles/fastback.jpg",
    daysInStock: 14,
    fipePrice: 134000,
    estimatedMargin: 13000,
    fuel: "Flex",
    transmission: "Automático",
  },
  {
    id: "v-014",
    make: "Nissan",
    model: "Kicks",
    version: "Exclusive 1.6 Flex Aut.",
    yearFab: 2022,
    yearModel: 2023,
    plate: "KCK-3F21",
    km: 36500,
    price: 118000,
    status: "disponivel",
    imageUrl: "/vehicles/kicks.jpg",
    daysInStock: 29,
    fipePrice: 116000,
    estimatedMargin: 10200,
    fuel: "Flex",
    transmission: "Automático",
  },
  {
    id: "v-015",
    make: "BMW",
    model: "320i",
    version: "M Sport 2.0 Turbo Aut.",
    yearFab: 2022,
    yearModel: 2022,
    plate: "BMW-3M20",
    km: 29000,
    price: 269000,
    status: "disponivel",
    imageUrl: "/vehicles/bmw320i.jpg",
    daysInStock: 52,
    fipePrice: 265000,
    estimatedMargin: 24000,
    fuel: "Flex",
    transmission: "Automático",
  },
  {
    id: "v-016",
    make: "Honda",
    model: "Civic",
    version: "EXL 2.0 CVT",
    yearFab: 2022,
    yearModel: 2022,
    plate: "CIV-2E22",
    km: 28500,
    price: 90000,
    status: "vendido",
    imageUrl: "/vehicles/civic.jpg",
    daysInStock: 12,
    fipePrice: 88500,
    estimatedMargin: 9500,
    fuel: "Flex",
    transmission: "Automático",
    sellerName: "Rafael Alves",
    buyerName: "Roberto Mendes",
    notes: "Vendedor: Rafael Alves | Comprador: Roberto Mendes",
  },
  {
    id: "v-017",
    make: "Chevrolet",
    model: "Tracker",
    version: "Premier 1.2 Turbo",
    yearFab: 2022,
    yearModel: 2022,
    plate: "TRK-2P22",
    km: 24000,
    price: 72900,
    status: "vendido",
    imageUrl: "/vehicles/tracker.jpg",
    daysInStock: 14,
    fipePrice: 71500,
    estimatedMargin: 8200,
    fuel: "Flex",
    transmission: "Automático",
    sellerName: "Camila Dias",
    buyerName: "Fernanda Lima",
    notes: "Vendedora: Camila Dias | Compradora: Fernanda Lima",
  },
  {
    id: "v-018",
    make: "Ford",
    model: "Ka",
    version: "SE Plus 1.0",
    yearFab: 2021,
    yearModel: 2021,
    plate: "FKA-1P21",
    km: 38000,
    price: 52900,
    status: "vendido",
    imageUrl: "/vehicles/onix.jpg",
    daysInStock: 8,
    fipePrice: 51800,
    estimatedMargin: 6100,
    fuel: "Flex",
    transmission: "Manual",
    sellerName: "Rafael Alves",
    buyerName: "Carlos Eduardo",
    notes: "Vendedor: Rafael Alves | Comprador: Carlos Eduardo",
  },
];

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

const now = Date.now();

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


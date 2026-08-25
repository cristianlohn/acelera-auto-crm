/**
 * @file mock-data.ts
 * @description Dados de demonstração para desenvolvimento e testes do Acelera Auto CRM.
 *
 * Contém 8 veículos e 10 leads realistas + funções utilitárias para criar e
 * atualizar veículos no estado local (pré-Supabase).
 */

import type { Lead, Vehicle, VehicleFormData, VehicleStatus } from "@/types/crm";

// ---------------------------------------------------------------------------
// Veículos de demonstração
// ---------------------------------------------------------------------------

export const mockVehicles: Vehicle[] = [
  {
    id: "v-001",
    make: "Honda",
    model: "Civic",
    version: "EXL 2.0 Flex Aut.",
    yearFab: 2022,
    yearModel: 2023,
    plate: "BRA2E22",
    km: 18500,
    price: 149900,
    status: "disponivel",
    imageUrl:
      "https://images.unsplash.com/photo-1588258952541-23bcfc53ce82?w=800&q=80",
  },
  {
    id: "v-002",
    make: "Toyota",
    model: "Corolla",
    version: "XEI 2.0 Flex Aut.",
    yearFab: 2021,
    yearModel: 2022,
    plate: "CDA3F19",
    km: 34200,
    price: 134900,
    status: "reservado",
    imageUrl:
      "https://images.unsplash.com/photo-1623869675781-80aa31012a5a?w=800&q=80",
  },
  {
    id: "v-003",
    make: "Jeep",
    model: "Compass",
    version: "Limited 2.0 4x4 Diesel",
    yearFab: 2023,
    yearModel: 2023,
    plate: "EFC4G77",
    km: 9800,
    price: 219900,
    status: "disponivel",
    imageUrl:
      "https://images.unsplash.com/photo-1536700503405-7ba39f5b6b4c?w=800&q=80",
  },
  {
    id: "v-004",
    make: "Volkswagen",
    model: "T-Cross",
    version: "Highline 1.4 TSI Aut.",
    yearFab: 2022,
    yearModel: 2023,
    plate: "GHI5J44",
    km: 22100,
    price: 129900,
    status: "disponivel",
    imageUrl:
      "https://images.unsplash.com/photo-1550355291-bbee04a92027?w=800&q=80",
  },
  {
    id: "v-005",
    make: "Fiat",
    model: "Strada",
    version: "Volcano 1.3 Flex CD Aut.",
    yearFab: 2023,
    yearModel: 2024,
    plate: "JKL6M55",
    km: 5300,
    price: 112900,
    status: "disponivel",
    imageUrl:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  },
  {
    id: "v-006",
    make: "Chevrolet",
    model: "Onix",
    version: "LTZ 1.0 Turbo Aut.",
    yearFab: 2022,
    yearModel: 2022,
    plate: "MNO7P33",
    km: 41000,
    price: 82900,
    status: "disponivel",
    imageUrl:
      "https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=800&q=80",
  },
  {
    id: "v-007",
    make: "Hyundai",
    model: "HB20",
    version: "Platinum Plus 1.0 T-GDI Aut.",
    yearFab: 2023,
    yearModel: 2024,
    plate: "PQR8S11",
    km: 7200,
    price: 99900,
    status: "reservado",
    imageUrl:
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80",
  },
  {
    id: "v-008",
    make: "Renault",
    model: "Kwid",
    version: "Intense 1.0 Flex Aut.",
    yearFab: 2021,
    yearModel: 2022,
    plate: "STU9V99",
    km: 52300,
    price: 59900,
    status: "vendido",
    imageUrl:
      "https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=800&q=80",
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
// Leads de demonstração
// ---------------------------------------------------------------------------

export const mockLeads: Lead[] = [
  {
    id: "l-001",
    name: "Carlos Mendonça",
    phone: "11987654321",
    email: "carlos.mendonca@email.com",
    vehicleInterest: "Honda Civic EXL 2023",
    status: "novo",
    sellerName: "Rafael Alves",
    lastContactAt: null,
    origin: "instagram",
  },
  {
    id: "l-002",
    name: "Fernanda Souza",
    phone: "21976543210",
    vehicleInterest: "Jeep Compass Limited Diesel",
    status: "novo",
    sellerName: "Juliana Costa",
    lastContactAt: null,
    origin: "site",
  },
  {
    id: "l-003",
    name: "Ricardo Lima",
    phone: "11965432109",
    email: "rlima@empresa.com.br",
    vehicleInterest: "Toyota Corolla XEI 2022",
    status: "atendimento",
    sellerName: "Rafael Alves",
    lastContactAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    origin: "whatsapp",
  },
  {
    id: "l-004",
    name: "Mariana Oliveira",
    phone: "31954321098",
    vehicleInterest: "Volkswagen T-Cross Highline",
    status: "atendimento",
    sellerName: "Juliana Costa",
    lastContactAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    origin: "olx",
  },
  {
    id: "l-005",
    name: "Paulo Henrique",
    phone: "41943210987",
    email: "pauloh@gmail.com",
    vehicleInterest: "Chevrolet Onix LTZ 2022",
    status: "atendimento",
    sellerName: "Marcos Ferreira",
    lastContactAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    origin: "icarros",
  },
  {
    id: "l-006",
    name: "Beatriz Rocha",
    phone: "51932109876",
    vehicleInterest: "Fiat Strada Volcano CD Aut.",
    status: "visita",
    sellerName: "Marcos Ferreira",
    lastContactAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    origin: "indicacao",
  },
  {
    id: "l-007",
    name: "Gustavo Ferreira",
    phone: "62921098765",
    email: "gustavo.f@hotmail.com",
    vehicleInterest: "Hyundai HB20 Platinum Plus",
    status: "visita",
    sellerName: "Rafael Alves",
    lastContactAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    origin: "whatsapp",
  },
  {
    id: "l-008",
    name: "Aline Gomes",
    phone: "71910987654",
    vehicleInterest: "Jeep Compass Limited 4x4",
    status: "proposta",
    sellerName: "Juliana Costa",
    lastContactAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    origin: "telefone",
  },
  {
    id: "l-009",
    name: "Eduardo Castro",
    phone: "85900876543",
    email: "edu.castro@outlook.com",
    vehicleInterest: "Honda Civic EXL 2023",
    status: "proposta",
    sellerName: "Marcos Ferreira",
    lastContactAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    origin: "site",
  },
  {
    id: "l-010",
    name: "Patrícia Vieira",
    phone: "91889765432",
    vehicleInterest: "Renault Kwid Intense Aut.",
    status: "fechado",
    sellerName: "Rafael Alves",
    lastContactAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    origin: "olx",
  },
];

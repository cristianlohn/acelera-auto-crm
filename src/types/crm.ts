/**
 * @file crm.ts
 * @description Interfaces TypeScript para as entidades do domínio Acelera Auto CRM.
 *
 * Centraliza a tipagem de Lead e Vehicle, garantindo consistência em toda a aplicação.
 */

// ---------------------------------------------------------------------------
// Lead
// ---------------------------------------------------------------------------

/** Estágios do funil de vendas (kanban). */
export type LeadStatus =
  | "novo"
  | "atendimento"
  | "visita"
  | "proposta"
  | "fechado";

/** Canais de origem do lead. */
export type LeadOrigin =
  | "whatsapp"
  | "instagram"
  | "site"
  | "indicacao"
  | "telefone"
  | "olx"
  | "icarros"
  | "webmotors"
  | "indicacao_dono"
  | "cliente_carteira"
  | "patio_balcao";

/**
 * Representa um lead (potencial cliente) no funil de vendas.
 */
export interface Lead {
  /** Identificador único do lead. */
  id: string;

  /** Nome completo do cliente. */
  name: string;

  /** Telefone com DDD (somente dígitos, ex: "11999998888"). */
  phone: string;

  /** E-mail de contato (opcional). */
  email?: string;

  /**
   * Veículo de interesse descrito pelo cliente
   * (ex: "Honda Civic 2022", "Fiat Strada 2021").
   */
  vehicleInterest: string;

  /** Etapa atual no funil de vendas. */
  status: LeadStatus;

  /** Nome do vendedor responsável pelo atendimento. */
  sellerName: string;

  /**
   * Data e hora do último contato realizado (ISO 8601).
   * Null indica que ainda não houve contato.
   */
  lastContactAt: string | null;

  /** Canal de aquisição do lead. */
  origin: LeadOrigin;
  /** Identificador UUID da organização / tenant proprietário */
  organizationId?: string;
  /** Identificador do veículo em estoque vinculado */
  vehicleId?: string;
  /** Nome/modelo do veículo em estoque vinculado */
  vehicleName?: string;
  /** Valor monetário estimado da oportunidade (R$) */
  estimatedValue?: number;
  /** Anotações ou histórico de negociação */
  notes?: string;
  /** Data/hora de criação do lead (ISO 8601) */
  createdAt?: string;
  /** Indicador de proposta em análise de financiamento / F&I */
  proposalFi?: boolean;
}

export interface CreateLeadInput {
  name: string;
  phone: string;
  email?: string;
  source: 'patio' | 'whatsapp_direto' | ManualLeadSource | string;
  assignedTo?: string;
  assigned_to?: string;
  seller_id?: string;
  sellerName?: string;
  vehicleId?: string;
  vehicle_id?: string;
  vehicleName?: string;
  vehicle_name?: string;
  vehicle_of_interest?: string;
  vehicleInterest?: string;
  estimatedValue?: number;
  estimated_value?: number;
  value?: number;
  stage?: string;
  segment?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Vehicle
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Lead – Origens Manuais vs Externas
// ---------------------------------------------------------------------------

export const ALLOWED_MANUAL_SOURCES = [
  { value: "patio", label: "🚶 Pátio / Balcão" },
  { value: "whatsapp_direto", label: "💬 WhatsApp Direto" },
] as const;

export const MANUAL_LEAD_SOURCES = ALLOWED_MANUAL_SOURCES;
export type ManualLeadSource = (typeof ALLOWED_MANUAL_SOURCES)[number]["value"];

/** Status operacional de um veículo no estoque. */
export type VehicleStatus = "disponivel" | "reservado" | "vendido";

/**
 * Representa um veículo no estoque da loja.
 */
export interface Vehicle {
  /** Identificador único do veículo. */
  id: string;

  /** Identificador da organização/tenant proprietário. */
  organizationId?: string;

  /** Marca (ex: "Honda", "Toyota"). */
  make: string;
  brand?: string;

  /** Modelo (ex: "Civic", "Corolla"). */
  model: string;

  /** Versão / trim (ex: "EXL 2.0 Flex Aut.", "XLS Ranch"). */
  version: string;

  /** Ano de fabricação (ex: 2022). */
  yearFab: number;

  /** Ano do modelo (ex: 2023). */
  yearModel: number;
  year?: string | number;

  /** Placa do veículo (ex: "ABC1D23" ou "D23"). */
  plate: string;
  plateEnd?: string;

  /** Quilometragem registrada no odômetro. */
  km: number;
  mileage?: number;

  /** Preço de venda em Reais (BRL). */
  price: number;

  /** Status atual do veículo no estoque. */
  status: VehicleStatus;

  /** URL da imagem principal do veículo (retrocompatível). */
  imageUrl: string;

  /** Galeria completa de fotos do veículo (WebP otimizado). */
  images?: string[];

  /** Dias em estoque desde a entrada no pátio. */
  daysInStock?: number;

  /** Preço de referência da Tabela FIPE (R$). */
  fipePrice?: number;

  /** Margem de lucro bruta estimada (R$). */
  estimatedMargin?: number;

  /** Tipo de combustível (Flex, Gasolina, Híbrido, Diesel). */
  fuel?: string;

  /** Tipo de transmissão / câmbio. */
  transmission?: string;

  /** Cor externa do veículo. */
  color?: string;

  /** Observações técnicas e notas do anúncio. */
  notes?: string;
}

// ---------------------------------------------------------------------------
// Vehicle – Form
// ---------------------------------------------------------------------------

/**
 * Dados de formulário para criação de um novo veículo.
 * Exclui `id`, que é gerado automaticamente.
 */
export type VehicleFormData = Omit<Vehicle, "id">;

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/** Status de relacionamento com o cliente na base. */
export type ClientStatus = "ativo" | "comprador" | "inativo";

/**
 * Representa um cliente cadastrado na carteira do CRM.
 */
export interface Client {
  /** Identificador único do cliente. */
  id: string;

  /** Nome completo do cliente. */
  name: string;

  /** Telefone/WhatsApp com DDD. */
  phone: string;

  /** E-mail para contato. */
  email?: string;

  /** CPF ou Documento de identificação. */
  document?: string;

  /** Status do cliente na base (ativo, comprador, inativo). */
  status: ClientStatus;

  /** Vendedor responsável pelo relacionamento. */
  sellerName: string;

  /** Categoria ou modelo de veículo de preferência. */
  vehiclePreference?: string;

  /** Valor total acumulado em compras de veículos (R$). */
  totalPurchased: number;

  /** Quantidade total de veículos adquiridos. */
  purchasesCount: number;

  /** Data/hora do último contato ou negociação (ISO 8601). */
  lastInteractionAt: string | null;

  /** Observações ou histórico de atendimento. */
  notes?: string;
}

/**
 * Dados de formulário para criação de um novo cliente.
 */
export type ClientFormData = Omit<
  Client,
  "id" | "totalPurchased" | "purchasesCount" | "lastInteractionAt"
>;

// ---------------------------------------------------------------------------
// Organização & Assinatura (Multi-tenant)
// ---------------------------------------------------------------------------

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  document?: string | null;
  plan?: string | null;
  subscription_status?: SubscriptionStatus | string | null;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
  created_at?: string;
  updated_at?: string;
}



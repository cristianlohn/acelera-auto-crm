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
  | "icarros";

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
}

// ---------------------------------------------------------------------------
// Vehicle
// ---------------------------------------------------------------------------

/** Status operacional de um veículo no estoque. */
export type VehicleStatus = "disponivel" | "reservado" | "vendido";

/**
 * Representa um veículo no estoque da loja.
 */
export interface Vehicle {
  /** Identificador único do veículo. */
  id: string;

  /** Marca (ex: "Honda", "Toyota"). */
  make: string;

  /** Modelo (ex: "Civic", "Corolla"). */
  model: string;

  /** Versão / trim (ex: "EXL 2.0 Flex Aut.", "XLS Ranch"). */
  version: string;

  /** Ano de fabricação (ex: 2022). */
  yearFab: number;

  /** Ano do modelo (ex: 2023). */
  yearModel: number;

  /** Placa do veículo (ex: "ABC1D23"). */
  plate: string;

  /** Quilometragem registrada no odômetro. */
  km: number;

  /** Preço de venda em Reais (BRL). */
  price: number;

  /** Status atual do veículo no estoque. */
  status: VehicleStatus;

  /** URL da imagem principal do veículo. */
  imageUrl: string;
}

// ---------------------------------------------------------------------------
// Vehicle – Form
// ---------------------------------------------------------------------------

/**
 * Dados de formulário para criação de um novo veículo.
 * Exclui `id`, que é gerado automaticamente.
 */
export type VehicleFormData = Omit<Vehicle, "id">;

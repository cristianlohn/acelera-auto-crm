/**
 * @file customers.ts
 * @description Gestão de Clientes na API v3 do Asaas com busca preventiva e dados fiscais completos.
 */

import { asaasGet, asaasPost } from "./client";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AsaasCustomer {
  id: string;
  name: string;
  cpfCnpj?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  externalReference?: string;
  notificationDisabled?: boolean;
  city?: number | string;
  state?: string;
  country?: string;
  dateCreated?: string;
}

export interface AsaasCustomerListResponse {
  object: string;
  hasMore: boolean;
  totalCount: number;
  limit: number;
  offset: number;
  data: AsaasCustomer[];
}

export interface CustomerFiscalAddress {
  postalCode?: string | null;
  address?: string | null;
  addressNumber?: string | null;
  complement?: string | null;
  province?: string | null;
}

export interface CreateCustomerInput extends CustomerFiscalAddress {
  name: string;
  cpfCnpj: string;
  email: string;
  phone?: string | null;
  mobilePhone?: string | null;
  externalReference?: string | null;
  organizationId?: string | null;
  notificationDisabled?: boolean;
}

/**
 * Remove todos os caracteres não numéricos de CPF ou CNPJ.
 */
export function sanitizeCpfCnpj(doc?: string | null): string {
  if (!doc) return "";
  return doc.replace(/\D/g, "");
}

/**
 * Remove todos os caracteres não numéricos do CEP.
 */
export function sanitizePostalCode(cep?: string | null): string {
  if (!cep) return "";
  return cep.replace(/\D/g, "");
}

/**
 * Busca preventiva por CPF/CNPJ antes de criar novo cliente para evitar duplicidade.
 */
export async function findCustomerByCpfCnpj(cpfCnpj: string): Promise<AsaasCustomer | null> {
  const cleanDoc = sanitizeCpfCnpj(cpfCnpj);
  if (!cleanDoc) return null;

  try {
    const res = await asaasGet<AsaasCustomerListResponse>("/customers", {
      cpfCnpj: cleanDoc,
    });

    if (res && Array.isArray(res.data) && res.data.length > 0) {
      return res.data[0];
    }
    return null;
  } catch (error) {
    console.warn(`[Asaas Customers] Erro ao consultar cliente por CPF/CNPJ (${cleanDoc}):`, error);
    return null;
  }
}

/**
 * Busca cliente no Asaas pela referência externa (ID da organização no CRM).
 */
export async function findCustomerByExternalReference(
  externalReference: string
): Promise<AsaasCustomer | null> {
  if (!externalReference || !externalReference.trim()) return null;

  try {
    const res = await asaasGet<AsaasCustomerListResponse>("/customers", {
      externalReference: externalReference.trim(),
    });

    if (res && Array.isArray(res.data) && res.data.length > 0) {
      return res.data[0];
    }
    return null;
  } catch (error) {
    console.warn(
      `[Asaas Customers] Erro ao consultar cliente por externalReference (${externalReference}):`,
      error
    );
    return null;
  }
}

/**
 * Consulta os dados de um cliente específico no Asaas pelo seu ID (`cus_...`).
 */
export async function getCustomerById(customerId: string): Promise<AsaasCustomer> {
  return asaasGet<AsaasCustomer>(`/customers/${customerId}`);
}

/**
 * Cria um novo cliente com os campos fiscais e de contato completos.
 */
export async function createCustomer(input: CreateCustomerInput): Promise<AsaasCustomer> {
  const cleanDoc = sanitizeCpfCnpj(input.cpfCnpj);
  const cleanCep = sanitizePostalCode(input.postalCode);
  const extRef = input.externalReference || input.organizationId || undefined;

  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    cpfCnpj: cleanDoc,
    email: input.email.trim(),
    externalReference: extRef,
    notificationDisabled: input.notificationDisabled ?? false,
  };

  if (input.phone) payload.phone = input.phone.trim();
  if (input.mobilePhone) payload.mobilePhone = input.mobilePhone.trim();
  if (cleanCep) payload.postalCode = cleanCep;
  if (input.address) payload.address = input.address.trim();
  if (input.addressNumber) payload.addressNumber = input.addressNumber.trim();
  if (input.complement) payload.complement = input.complement.trim();
  if (input.province) payload.province = input.province.trim();

  return asaasPost<AsaasCustomer>("/customers", payload);
}

/**
 * Atualiza os dados fiscais ou de contato de um cliente existente no Asaas.
 */
export async function updateCustomer(
  customerId: string,
  input: Partial<CreateCustomerInput>
): Promise<AsaasCustomer> {
  const payload: Record<string, unknown> = {};

  if (input.name) payload.name = input.name.trim();
  if (input.cpfCnpj) payload.cpfCnpj = sanitizeCpfCnpj(input.cpfCnpj);
  if (input.email) payload.email = input.email.trim();
  if (input.phone !== undefined) payload.phone = input.phone ? input.phone.trim() : null;
  if (input.mobilePhone !== undefined) {
    payload.mobilePhone = input.mobilePhone ? input.mobilePhone.trim() : null;
  }
  if (input.postalCode !== undefined) {
    payload.postalCode = input.postalCode ? sanitizePostalCode(input.postalCode) : null;
  }
  if (input.address !== undefined) payload.address = input.address ? input.address.trim() : null;
  if (input.addressNumber !== undefined) {
    payload.addressNumber = input.addressNumber ? input.addressNumber.trim() : null;
  }
  if (input.complement !== undefined) {
    payload.complement = input.complement ? input.complement.trim() : null;
  }
  if (input.province !== undefined) {
    payload.province = input.province ? input.province.trim() : null;
  }
  if (input.externalReference) payload.externalReference = input.externalReference;
  if (input.notificationDisabled !== undefined) {
    payload.notificationDisabled = input.notificationDisabled;
  }

  return asaasPost<AsaasCustomer>(`/customers/${customerId}`, payload);
}

/**
 * Fluxo de alta fidelidade:
 * 1. Busca preventiva por CPF/CNPJ higienizado para não duplicar.
 * 2. Se não encontrar, busca por externalReference (organization_id).
 * 3. Se não encontrar, cria novo cliente com dados fiscais completos.
 * 4. Sincroniza `asaas_customer_id` no Supabase se houver `organizationId`.
 */
export async function findOrCreateAsaasCustomer(
  input: CreateCustomerInput
): Promise<AsaasCustomer> {
  const orgId = input.organizationId || input.externalReference;

  // 1. Busca preventiva por CPF/CNPJ
  let customer: AsaasCustomer | null = null;
  if (input.cpfCnpj) {
    customer = await findCustomerByCpfCnpj(input.cpfCnpj);
  }

  // 2. Busca por externalReference caso CPF/CNPJ não tenha retornado cliente
  if (!customer && orgId) {
    customer = await findCustomerByExternalReference(orgId);
  }

  // 3. Criação se inexistente
  if (!customer) {
    customer = await createCustomer({
      ...input,
      externalReference: orgId || input.externalReference,
    });
  }

  // 4. Persistência relacional no Supabase
  if (customer?.id && orgId && isSupabaseServerConfigured()) {
    try {
      const supabaseAdmin = createAdminClient();
      await supabaseAdmin
        .from("organizations")
        .update({
          asaas_customer_id: customer.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orgId);
    } catch (err) {
      console.warn("[Asaas Customers] Falha ao vincular asaas_customer_id na organização:", err);
    }
  }

  return customer;
}

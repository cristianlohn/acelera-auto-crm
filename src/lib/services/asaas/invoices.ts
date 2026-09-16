/**
 * @file invoices.ts
 * @description Gestão e Agendamento de Emissão de Notas Fiscais de Serviço Eletrônicas (NFS-e) na API v3 do Asaas.
 */

import { asaasGet, asaasPost } from "./client";

export type AsaasInvoiceStatus =
  | "SCHEDULED"
  | "SYNCHRONIZED"
  | "AUTHORIZED"
  | "PROCESSING_CANCELLATION"
  | "CANCELED"
  | "CANCELLATION_DENIED"
  | "ERROR";

export interface AsaasInvoiceTaxes {
  retainIss?: boolean;
  iss?: number;
  cofins?: number;
  csll?: number;
  inss?: number;
  ir?: number;
  pis?: number;
}

export interface ScheduleInvoiceInput {
  payment?: string;
  customer?: string;
  value?: number;
  serviceDescription: string;
  observations?: string;
  effectiveDate?: string; // YYYY-MM-DD
  externalReference?: string; // organization_id
  municipalServiceId?: string;
  municipalServiceCode?: string;
  municipalServiceName?: string;
  deductions?: number;
  taxes?: AsaasInvoiceTaxes;
}

export interface AsaasInvoiceResponse {
  id: string;
  status: AsaasInvoiceStatus | string;
  customer?: string;
  payment?: string;
  installment?: string;
  value: number;
  deductions?: number;
  effectiveDate: string;
  serviceDescription: string;
  observations?: string;
  pdfUrl?: string | null;
  xmlUrl?: string | null;
  number?: string | null;
  verificationCode?: string | null;
  externalReference?: string | null;
  taxes?: AsaasInvoiceTaxes;
  failedReason?: string | null;
}

/**
 * Agenda a emissão de uma NFS-e vinculada a uma cobrança ou cliente no Asaas.
 *
 * @param input Parâmetros de emissão (paymentId, alíquotas, descrição e competência).
 */
export async function scheduleInvoice(
  input: ScheduleInvoiceInput
): Promise<AsaasInvoiceResponse> {
  const payload: Record<string, unknown> = {
    serviceDescription: input.serviceDescription.trim(),
  };

  if (input.payment) payload.payment = input.payment;
  if (input.customer) payload.customer = input.customer;
  if (input.value !== undefined) payload.value = input.value;
  if (input.observations) payload.observations = input.observations.trim();
  if (input.effectiveDate) payload.effectiveDate = input.effectiveDate;
  if (input.externalReference) payload.externalReference = input.externalReference;
  if (input.municipalServiceId) payload.municipalServiceId = input.municipalServiceId;
  if (input.municipalServiceCode) payload.municipalServiceCode = input.municipalServiceCode;
  if (input.municipalServiceName) payload.municipalServiceName = input.municipalServiceName;
  if (input.deductions !== undefined) payload.deductions = input.deductions;
  if (input.taxes) payload.taxes = input.taxes;

  return asaasPost<AsaasInvoiceResponse>("/invoices", payload);
}

/**
 * Consulta o status e arquivos de uma NFS-e pelo ID (`inv_...`).
 */
export async function getInvoiceById(invoiceId: string): Promise<AsaasInvoiceResponse> {
  return asaasGet<AsaasInvoiceResponse>(`/invoices/${invoiceId}`);
}

/**
 * Solicita o cancelamento de uma NFS-e no Asaas / prefeitura.
 */
export async function cancelInvoice(
  invoiceId: string,
  reason?: string
): Promise<AsaasInvoiceResponse> {
  return asaasPost<AsaasInvoiceResponse>(`/invoices/${invoiceId}/cancel`, {
    reason,
  });
}

/**
 * Autoriza o envio imediato da NFS-e agendada para a prefeitura.
 */
export async function authorizeInvoice(invoiceId: string): Promise<AsaasInvoiceResponse> {
  return asaasPost<AsaasInvoiceResponse>(`/invoices/${invoiceId}/authorize`);
}

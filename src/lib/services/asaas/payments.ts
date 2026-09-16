/**
 * @file payments.ts
 * @description Gestão de Cobranças (PIX, Boleto e Cartão de Crédito) e Assinaturas na API v3 do Asaas.
 */

import { asaasGet, asaasPost } from "./client";

export type AsaasBillingType = "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED";
export type AsaasSubscriptionCycle = "MONTHLY" | "YEARLY" | "QUARTERLY" | "SEMIANNUALLY";

export interface AsaasCreditCardInput {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface AsaasCreditCardHolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  phone: string;
  mobilePhone?: string;
  addressComplement?: string;
}

export interface CreatePaymentInput {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference: string; // organization_id
  postalService?: boolean;
  creditCard?: AsaasCreditCardInput;
  creditCardHolderInfo?: AsaasCreditCardHolderInfo;
  remoteIp?: string;
}

export interface AsaasPaymentResponse {
  id: string;
  dateCreated: string;
  customer: string;
  paymentLink?: string;
  dueDate: string;
  value: number;
  netValue?: number;
  billingType: AsaasBillingType;
  status: string;
  description?: string;
  externalReference?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  transactionReceiptUrl?: string;
  invoiceNumber?: string;
  subscription?: string;
  installment?: string;
  clientPaymentDate?: string;
  paymentDate?: string;
}

export interface AsaasPixQrCodeResponse {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

export interface AsaasIdentificationFieldResponse {
  identificationField: string;
  nossoNumero: string;
  barCode: string;
}

export interface CreateSubscriptionInput {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  nextDueDate: string; // YYYY-MM-DD
  cycle: AsaasSubscriptionCycle;
  description?: string;
  externalReference: string; // organization_id
  creditCard?: AsaasCreditCardInput;
  creditCardHolderInfo?: AsaasCreditCardHolderInfo;
  remoteIp?: string;
}

export interface AsaasSubscriptionResponse {
  id: string;
  dateCreated: string;
  customer: string;
  paymentLink?: string;
  billingType: AsaasBillingType;
  value: number;
  nextDueDate: string;
  cycle: AsaasSubscriptionCycle;
  description?: string;
  status: string;
  externalReference?: string;
}

/**
 * Cria uma cobrança avulsa no Asaas com externalReference vinculada à organização.
 */
export async function createPayment(input: CreatePaymentInput): Promise<AsaasPaymentResponse> {
  return asaasPost<AsaasPaymentResponse>("/payments", input);
}

/**
 * Consulta os dados e o status atual de uma cobrança.
 */
export async function getPaymentById(paymentId: string): Promise<AsaasPaymentResponse> {
  return asaasGet<AsaasPaymentResponse>(`/payments/${paymentId}`);
}

/**
 * Obtém o QR Code e o código Copia e Cola de uma cobrança PIX.
 */
export async function getPaymentPixQrCode(
  paymentId: string
): Promise<AsaasPixQrCodeResponse> {
  return asaasGet<AsaasPixQrCodeResponse>(`/payments/${paymentId}/pixQrCode`);
}

/**
 * Obtém a linha digitável e código de barras de um boleto bancário.
 */
export async function getPaymentIdentificationField(
  paymentId: string
): Promise<AsaasIdentificationFieldResponse> {
  return asaasGet<AsaasIdentificationFieldResponse>(
    `/payments/${paymentId}/identificationField`
  );
}

/**
 * Cria uma assinatura recorrente no Asaas vinculada ao organization_id.
 */
export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<AsaasSubscriptionResponse> {
  return asaasPost<AsaasSubscriptionResponse>("/subscriptions", input);
}

/**
 * Consulta os dados de uma assinatura existente.
 */
export async function getSubscriptionById(
  subscriptionId: string
): Promise<AsaasSubscriptionResponse> {
  return asaasGet<AsaasSubscriptionResponse>(`/subscriptions/${subscriptionId}`);
}

/**
 * Lista as cobranças originadas de uma assinatura.
 */
export async function listSubscriptionPayments(
  subscriptionId: string
): Promise<{ data: AsaasPaymentResponse[] }> {
  return asaasGet<{ data: AsaasPaymentResponse[] }>(
    `/subscriptions/${subscriptionId}/payments`
  );
}

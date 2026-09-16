/**
 * @file templates.ts
 * @description Formatador de templates objetivos para mensagens e notificações do Acelera Auto CRM.
 */

import { sanitizeWhatsAppPhone } from "./client";

export interface LeadAlertData {
  id?: string;
  name: string;
  phone: string;
  interest_vehicle?: string;
  vehicleInterest?: string;
  vehicle_name?: string;
  source?: string;
  origin?: string;
  email?: string | null;
  short_code?: string;
  shortCode?: string;
  organization_name?: string | null;
  organizationName?: string | null;
}

export interface SalespersonData {
  name?: string;
  full_name?: string;
  phone?: string | null;
}

/**
 * Constrói a mensagem objetiva de alerta de novo lead distribuído para o vendedor na Roleta.
 */
export function buildNewLeadAlertMessage(
  lead: LeadAlertData,
  salesperson: SalespersonData,
  appUrl: string = process.env.NEXT_PUBLIC_APP_URL || "https://aceleraautocrm.com.br"
): string {
  const clientName = lead.name || "Cliente";
  const vehicle = lead.vehicle_name || lead.interest_vehicle || lead.vehicleInterest || "Veículo de Interesse";
  const origin = lead.source || lead.origin || "Canal Digital";
  const clientPhone = lead.phone || "";
  const sanitizedClientPhone = sanitizeWhatsAppPhone(clientPhone);
  const sellerName = salesperson.name || salesperson.full_name || "Vendedor";
  const leadId = lead.id || "";
  const shortCode = lead.short_code || lead.shortCode;

  const appDomain = (appUrl || "https://aceleraautocrm.com.br")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  const crmLink = shortCode
    ? `https://${appDomain}/c/${shortCode}`
    : leadId
    ? `https://${appDomain}/leads?lead_id=${leadId}`
    : `https://${appDomain}/leads`;

  const orgName = lead.organization_name || lead.organizationName;
  const storeRef = orgName && orgName.trim() ? `da ${orgName.trim()}` : "da concessionária";

  const waDirectLink = shortCode
    ? `https://${appDomain}/w/${shortCode}`
    : `https://wa.me/${sanitizedClientPhone}?text=${encodeURIComponent(
        `Olá ${clientName}, tudo bem? Sou ${sellerName} ${storeRef}. Vi seu interesse no ${vehicle}. Como posso te ajudar hoje?`
      )}`;

  return [
    `🎯 *NOVO LEAD NA SUA VEZ - ACELERA AUTO*`,
    ``,
    `👤 *Cliente:* ${clientName}`,
    `🚗 *Interesse:* ${vehicle}`,
    `📍 *Origem:* ${origin}`,
    `📱 *Telefone:* ${clientPhone}`,
    ``,
    `👉 *Abrir no CRM:*`,
    crmLink,
    ``,
    `💬 *Chamar no WhatsApp:*`,
    waDirectLink,
  ].join("\n");
}
export function buildLeadNotificationMessage(
  lead: {
    name: string;
    vehicle_name?: string;
    vehicle_of_interest?: string;
    vehicleInterest?: string;
    source: string;
    origin?: string;
    phone: string;
    short_code: string;
  },
  appUrl?: string
): string {
  const baseUrl = (appUrl || process.env.NEXT_PUBLIC_APP_URL || "https://aceleraautocrm.com.br")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  const vehicle =
    lead.vehicle_name ||
    lead.vehicle_of_interest ||
    lead.vehicleInterest ||
    "Em aberto";

  return [
    `🎯 *NOVO LEAD NA SUA VEZ - ACELERA AUTO*`,
    ``,
    `👤 *Cliente:* ${lead.name || "Cliente"}`,
    `🚗 *Interesse:* ${vehicle}`,
    `📍 *Origem:* ${lead.source || lead.origin || "site"}`,
    `📱 *Telefone:* ${lead.phone}`,
    ``,
    `👉 *Abrir no CRM:*`,
    `https://${baseUrl}/c/${lead.short_code}`,
    ``,
    `💬 *Chamar no WhatsApp:*`,
    `https://${baseUrl}/w/${lead.short_code}`,
  ].join("\n");
}

export interface WelcomeCustomerMessageParams {
  customerName?: string | null;
  sellerName?: string | null;
  organizationName?: string | null;
  vehicle?: string | null;
}

/**
 * Constrói a mensagem de boas-vindas personalizada enviada ao cliente via WhatsApp.
 * - Utiliza o primeiro nome do cliente (extraído de pushName / nome).
 * - Identifica o consultor responsável (seller_name).
 * - Se organizationName for informado, exibe "da {organizationName}"; se nulo/vazio, usa fallback gracioso "da nossa loja".
 * - Cenário com veículo: "Vi que você se interessou pelo *{veiculo}*. Ele está disponível aqui no pátio! Quer ver fotos ou simular entrada?"
 * - Cenário sem veículo: "Recebi seu contato por aqui! Já tem algum modelo em mente ou gostaria de conhecer os destaques do nosso estoque?"
 * - Nunca exibe strings genéricas como "Interesse Geral via WhatsApp" ao cliente.
 */
export function buildWelcomeCustomerMessage(
  params: WelcomeCustomerMessageParams
): string;
export function buildWelcomeCustomerMessage(
  customerName?: string | null,
  sellerName?: string | null,
  organizationName?: string | null,
  vehicle?: string | null
): string;
export function buildWelcomeCustomerMessage(
  paramsOrCustomerName?: WelcomeCustomerMessageParams | string | null,
  sellerNameParam?: string | null,
  organizationNameParam?: string | null,
  vehicleParam?: string | null
): string {
  let customerName: string | null | undefined;
  let sellerName: string | null | undefined;
  let organizationName: string | null | undefined;
  let vehicle: string | null | undefined;

  if (typeof paramsOrCustomerName === "object" && paramsOrCustomerName !== null) {
    customerName = paramsOrCustomerName.customerName;
    sellerName = paramsOrCustomerName.sellerName;
    organizationName = paramsOrCustomerName.organizationName;
    vehicle = paramsOrCustomerName.vehicle;
  } else {
    customerName = paramsOrCustomerName;
    sellerName = sellerNameParam;
    organizationName = organizationNameParam;
    vehicle = vehicleParam;
  }

  // 1. Extração do primeiro nome do cliente (fallback seguro: "Cliente")
  const rawCustomer = customerName ? customerName.trim() : "";
  const customerFirstName = rawCustomer ? rawCustomer.split(/\s+/)[0] : "Cliente";

  // 2. Extração do primeiro nome do vendedor responsável
  const rawSeller = sellerName ? sellerName.trim() : "";
  const firstSellerName = rawSeller ? rawSeller.split(/\s+/)[0] : "";
  const isValidSeller =
    Boolean(firstSellerName) &&
    firstSellerName.toLowerCase() !== "consultor" &&
    firstSellerName.toLowerCase() !== "roleta" &&
    firstSellerName.toLowerCase() !== "null" &&
    firstSellerName.toLowerCase() !== "undefined";

  // 3. Referência à organização ("da {organizationName}" ou fallback gracioso "da nossa loja")
  const storeRef =
    organizationName && organizationName.trim()
      ? `da ${organizationName.trim()}`
      : "da nossa loja";

  const sellerGreeting = isValidSeller
    ? `Sou ${firstSellerName} ${storeRef}`
    : `Sou o consultor ${storeRef}`;

  // 4. Detecção e higienização do veículo (rejeita strings genéricas)
  const rawV = vehicle ? vehicle.trim() : "";
  const lowerV = rawV.toLowerCase();
  const isSpecificVehicle =
    Boolean(rawV) &&
    !lowerV.includes("interesse geral") &&
    !lowerV.includes("veículo de interesse") &&
    !lowerV.includes("veiculo de interesse") &&
    lowerV !== "geral" &&
    lowerV !== "em aberto" &&
    !lowerV.includes("não informado") &&
    !lowerV.includes("nao informado") &&
    !lowerV.includes("sem veículo") &&
    !lowerV.includes("sem veiculo");

  // 5. Cenários de copy:
  // a) Com carro: "Vi que você se interessou pelo *{veiculo}*. Ele está disponível aqui no pátio! Quer ver fotos ou simular entrada?"
  // b) Sem carro: "Recebi seu contato por aqui! Já tem algum modelo em mente ou gostaria de conhecer os destaques do nosso estoque?"
  const vehicleCopy = isSpecificVehicle
    ? `Vi que você se interessou pelo *${rawV}*. Ele está disponível aqui no pátio! Quer ver fotos ou simular entrada?`
    : `Recebi seu contato por aqui! Já tem algum modelo em mente ou gostaria de conhecer os destaques do nosso estoque?`;

  return `Olá, ${customerFirstName}! Seja bem-vindo(a)! ${sellerGreeting}. 👋\n\n${vehicleCopy}\n\nEstou à disposição para tirar dúvidas e te atender por aqui em instantes. 🚗💨`;
}




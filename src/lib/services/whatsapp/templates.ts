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

  const waDirectLink = shortCode
    ? `https://${appDomain}/w/${shortCode}`
    : `https://wa.me/${sanitizedClientPhone}?text=${encodeURIComponent(
        `Olá ${clientName}, tudo bem? Sou ${sellerName} da concessionária. Vi seu interesse no ${vehicle}. Como posso te ajudar hoje?`
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



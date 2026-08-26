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
  source?: string;
  origin?: string;
  email?: string | null;
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
  const vehicle = lead.interest_vehicle || lead.vehicleInterest || "Veículo de Interesse";
  const origin = lead.source || lead.origin || "Canal Digital";
  const clientPhone = lead.phone || "";
  const sanitizedClientPhone = sanitizeWhatsAppPhone(clientPhone);
  const sellerName = salesperson.name || salesperson.full_name || "Vendedor";
  const leadId = lead.id || "";

  const cleanAppUrl = appUrl.replace(/\/$/, "");
  const crmLink = leadId ? `${cleanAppUrl}/leads?lead_id=${leadId}` : `${cleanAppUrl}/leads`;

  const greeting = `Olá ${clientName}, tudo bem? Sou ${sellerName} da concessionária. Vi seu interesse no ${vehicle}. Como posso te ajudar hoje?`;
  const encodedGreeting = encodeURIComponent(greeting);
  const waDirectLink = `https://wa.me/${sanitizedClientPhone}?text=${encodedGreeting}`;

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

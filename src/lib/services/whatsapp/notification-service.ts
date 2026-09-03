/**
 * @file notification-service.ts
 * @description Serviço de despacho de notificações de novos leads para vendedores via WhatsApp.
 */

import { buildNewLeadAlertMessage } from "./templates";
import { sendWhatsAppMessage } from "./client";

export interface SellerLeadNotificationParams {
  sellerPhone?: string | null;
  sellerName?: string;
  lead: {
    id?: string;
    name: string;
    phone: string;
    vehicle_name?: string;
    vehicle_of_interest?: string;
    vehicleInterest?: string;
    source?: string;
    origin?: string;
    short_code?: string;
    shortCode?: string;
    organization_id?: string;
  };
  shortCode?: string;
  organizationId?: string;
  appUrl?: string;
}

/**
 * Envia notificação de novo lead ao vendedor via WhatsApp (com fallback gracioso e modo sandbox em demo).
 */
export async function sendSellerLeadNotification(params: SellerLeadNotificationParams) {
  const { sellerPhone, sellerName, lead, shortCode, organizationId, appUrl } = params;

  if (!sellerPhone) {
    return { success: true, dispatched: false };
  }

  const messageText = buildNewLeadAlertMessage(
    {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      vehicle_name: lead.vehicle_name || lead.vehicle_of_interest || lead.vehicleInterest,
      source: lead.source || lead.origin,
      short_code: shortCode || lead.short_code || lead.shortCode,
    },
    {
      full_name: sellerName || "Vendedor",
      phone: sellerPhone,
    },
    appUrl
  );

  const orgId = organizationId || lead.organization_id;
  const isDemo =
    orgId === "00000000-0000-0000-0000-000000000001" ||
    orgId?.startsWith("demo") ||
    orgId === "demo";

  return await sendWhatsAppMessage({
    toPhone: sellerPhone,
    messageText,
    isDemo,
    tenantId: orgId,
  });
}

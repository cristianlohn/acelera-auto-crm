/**
 * @file webmotors-parser.ts
 * @description Parser oficial de payloads de webhook da Webmotors / Lead Ingestion.
 */

import type { NormalizedLeadInput } from "../types";

export function parseWebmotorsPayload(body: Record<string, unknown> | null | undefined): NormalizedLeadInput {
  const b = (body || {}) as Record<string, unknown>;
  const lead = (b.lead || b) as Record<string, unknown>;
  const customer = (lead.customer || b.customer || {}) as Record<string, unknown>;
  const vehicle = (lead.vehicle || b.vehicle || {}) as Record<string, unknown>;

  const clientName = String(customer.name || lead.name || "Lead Webmotors");
  const clientPhone = String(
    customer.phone || customer.cellPhone || customer.mobile || lead.phone || ""
  );
  const clientEmail = (customer.email || lead.email) ? String(customer.email || lead.email) : undefined;
  const message = String(lead.message || customer.message || vehicle.comments || "");

  return {
    externalId: String(lead.id || lead.leadId || b.id || "").trim() || undefined,
    source: "webmotors",
    clientName,
    clientPhone,
    clientEmail,
    message,
    vehicleHint: {
      adId: String(vehicle.adId || vehicle.id || "").trim() || undefined,
      plate: vehicle.plate ? String(vehicle.plate) : vehicle.licensePlate ? String(vehicle.licensePlate) : undefined,
      brand: vehicle.make ? String(vehicle.make) : vehicle.brand ? String(vehicle.brand) : undefined,
      model: vehicle.model ? String(vehicle.model) : undefined,
      version: vehicle.version ? String(vehicle.version) : undefined,
    },
  };
}

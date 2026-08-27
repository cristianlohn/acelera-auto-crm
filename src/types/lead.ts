/**
 * @file lead.ts
 * @description Tipagens completas para ingestão de leads externos, API v1 e Roleta Comercial.
 */

export type LeadSource =
  | "meta_ads"
  | "webmotors"
  | "icarros"
  | "olx"
  | "landing_page"
  | "google_ads"
  | "other";

export type LeadSegment = "new_cars" | "used_cars" | "f_and_i" | "all";

export interface LeadIngestPayload {
  name: string;
  phone: string;
  email?: string;
  source?: LeadSource;
  segment?: LeadSegment;
  vehicle_of_interest?: string;
  notes?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export interface AssignedSellerInfo {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role?: string;
  segment?: string;
}

export interface LeadIngestResponse {
  success: boolean;
  lead_id: string;
  assigned_to: AssignedSellerInfo | null;
  whatsapp_direct_url: string;
  message?: string;
}

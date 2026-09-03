/**
 * @file types.ts
 * @description Contratos de payload normalizado para ingestão externa de leads (Webmotors, Meta Ads, etc.).
 */

export type ExternalLeadSource = "webmotors" | "meta_ads" | "icarros" | "olx" | "google_ads" | "landing_page";

export interface NormalizedLeadInput {
  externalId?: string;
  source: ExternalLeadSource;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  message?: string;
  // Pistas para encontrar o carro no estoque:
  vehicleHint?: {
    adId?: string;
    plate?: string;
    brand?: string;
    model?: string;
    version?: string;
  };
}

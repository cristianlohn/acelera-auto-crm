/**
 * @file lead-utils.ts
 * @description Funções utilitárias puras para a lógica de negócio de Leads.
 *
 * Extraídas do componente de página para permitir testes unitários isolados.
 * Sem dependências de UI ou React — só lógica de negócio pura.
 */

import type { Lead } from "@/types/crm";

// ---------------------------------------------------------------------------
// Tempo / Urgência
// ---------------------------------------------------------------------------

/**
 * Formata a diferença entre agora e uma data ISO em string legível em PT-BR.
 *
 * @param isoDate - Data ISO 8601 ou null (sem contato).
 * @returns Texto como "2h atrás", "3d atrás" ou "Sem contato".
 */
export function timeAgo(isoDate: string | null): string {
  if (!isoDate) return "Sem contato";
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d atrás`;
  if (hrs > 0) return `${hrs}h atrás`;
  if (mins > 0) return `${mins}min atrás`;
  return "Agora mesmo";
}

/**
 * Classifica o nível de urgência do contato com base no tempo decorrido.
 *
 * @param isoDate - Data ISO 8601 do último contato, ou null.
 * @returns `"verde"` (< 6h), `"amarelo"` (6–24h) ou `"vermelho"` (> 24h / sem contato).
 */
export type UrgencyLevel = "verde" | "amarelo" | "vermelho";

export function urgencyLevel(isoDate: string | null): UrgencyLevel {
  if (!isoDate) return "vermelho";
  const hrs = (Date.now() - new Date(isoDate).getTime()) / 3_600_000;
  if (hrs > 24) return "vermelho";
  if (hrs > 6) return "amarelo";
  return "verde";
}

/**
 * Retorna as classes CSS Tailwind correspondentes ao nível de urgência.
 *
 * @param isoDate - Data ISO 8601 do último contato, ou null.
 * @returns Classes CSS de cor para aplicar no elemento.
 */
export function urgencyClass(isoDate: string | null): string {
  const level = urgencyLevel(isoDate);
  if (level === "vermelho") return "text-red-500";
  if (level === "amarelo") return "text-orange-500";
  return "text-green-500";
}

// ---------------------------------------------------------------------------
// WhatsApp
// ---------------------------------------------------------------------------

/**
 * Higieniza um número de telefone removendo todos os caracteres não numéricos.
 *
 * @param phone - Telefone em qualquer formato.
 * @returns Somente dígitos, ex: "11987654321".
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Gera a URL wa.me com mensagem pré-formatada e personalizada para o lead.
 *
 * @param lead - Objeto Lead com nome, telefone e veículo de interesse.
 * @returns URL codificada para WhatsApp Web / App.
 */
export function whatsappUrl(lead: Lead): string {
  const msg = encodeURIComponent(
    `Olá ${lead.name}! Tudo bem? 😊\n\nSou da *Acelera Auto* e vi que você se interessou pelo *${lead.vehicleInterest}*.\n\nPosso te enviar mais informações ou agendar uma visita? 🚗`
  );
  const phone = sanitizePhone(lead.phone);
  return `https://wa.me/55${phone}?text=${msg}`;
}

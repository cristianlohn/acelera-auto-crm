/**
 * @file lead-utils.ts
 * @description Funções utilitárias puras para a lógica de negócio de Leads.
 *
 * Centraliza regras de cálculo de tempo decorrido, classificação de SLA de urgência,
 * sanitização de telefones e geração de deep links para WhatsApp.
 * 
 * Totalmente desacoplado de React/DOM para viabilizar testes unitários de alta performance.
 */

import type { Lead } from "@/types/crm";

// ---------------------------------------------------------------------------
// Tempo / SLA de Urgência
// ---------------------------------------------------------------------------

/**
 * Formata a diferença entre o timestamp atual e uma data ISO em string legível (PT-BR).
 *
 * @param isoDate - Data em formato ISO 8601 ou null (quando não houve contato).
 * @returns String amigável como "2h atrás", "3d atrás", "Agora mesmo" ou "Sem contato".
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
 * Níveis de classificação de SLA de atendimento ao lead:
 * - `"verde"`: Contato recente (< 6.0h).
 * - `"amarelo"`: Contato intermediário (>= 6.0h e < 24.0h).
 * - `"vermelho"`: Contato expirado ou inexistente (>= 24.0h ou null).
 */
export type UrgencyLevel = "verde" | "amarelo" | "vermelho";

/**
 * Classifica a urgência do lead aplicando Análise de Valor Limite (BVA) sobre o tempo decorrido.
 *
 * @param isoDate - Timestamp ISO 8601 do último contato, ou null.
 * @returns UrgencyLevel ('verde' | 'amarelo' | 'vermelho').
 */
export function urgencyLevel(isoDate: string | null): UrgencyLevel {
  if (!isoDate) return "vermelho";
  const diff = Date.now() - new Date(isoDate).getTime();
  const hrs = diff / 3_600_000;
  if (hrs >= 24) return "vermelho";
  if (hrs >= 6) return "amarelo";
  return "verde";
}

/**
 * Mapeia o nível de urgência para as classes CSS Tailwind correspondentes.
 *
 * @param isoDate - Timestamp ISO 8601 do último contato, ou null.
 * @returns Classes Tailwind de cor de texto.
 */
export function urgencyClass(isoDate: string | null): string {
  const level = urgencyLevel(isoDate);
  if (level === "vermelho") return "text-red-500";
  if (level === "amarelo") return "text-orange-500";
  return "text-green-500";
}

// ---------------------------------------------------------------------------
// WhatsApp & Comunicação
// ---------------------------------------------------------------------------

/**
 * Higieniza strings de telefone removendo pontuações, espaços, parênteses e traços.
 *
 * @param phone - Telefone em formato arbitrário (ex: "(11) 98765-4321").
 * @returns String contendo apenas caracteres numéricos.
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Constrói o deep link `wa.me` para abertura direta do WhatsApp com mensagem codificada.
 *
 * Garante:
 * 1. Prefixo de DDI nacional (55) adicionado ao número higienizado.
 * 2. Mensagem personalizada contendo o nome do cliente e veículo de interesse.
 * 3. Safe URI encoding para caracteres acentuados, especiais e emojis.
 *
 * @param lead - Entidade Lead com dados do cliente e interesse.
 * @returns URL completa pronta para navegação segura.
 */
export function whatsappUrl(lead: Lead): string {
  const msg = encodeURIComponent(
    `Olá ${lead.name}! Tudo bem? 😊\n\nSou da *Acelera Auto* e vi que você se interessou pelo *${lead.vehicleInterest}*.\n\nPosso te enviar mais informações ou agendar uma visita? 🚗`
  );
  const phone = sanitizePhone(lead.phone);
  return `https://wa.me/55${phone}?text=${msg}`;
}

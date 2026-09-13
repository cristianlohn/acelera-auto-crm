/**
 * @file normalize-stage.ts
 * @description Mapeamento e normalização de estágios do funil do CRM e Kanban.
 */

export type CanonicalStage =
  | "new"
  | "first_contact"
  | "visit"
  | "proposal"
  | "won"
  | "lost";

/**
 * Normaliza qualquer valor de status ou estágio para as etapas canônicas do Kanban.
 */
export function normalizeLeadStage(rawStatusOrStage?: string | null): CanonicalStage {
  if (!rawStatusOrStage) return "new";
  const s = rawStatusOrStage.toString().toLowerCase().trim();

  if (
    [
      "won",
      "concluido",
      "concluído",
      "venda_concluida",
      "venda_concluída",
      "venda concluída",
      "venda concluida",
      "fechado",
      "venda_fechada",
      "ganho",
      "vendido",
    ].includes(s)
  ) {
    return "won";
  }
  if (
    [
      "lost",
      "descarte",
      "perdido",
      "cancelado",
      "desistiu",
    ].includes(s)
  ) {
    return "lost";
  }
  if (
    [
      "proposta",
      "proposta_fi",
      "proposta & f&i",
      "proposta e f&i",
      "proposal",
      "proposal_fi",
      "proposta_enviada",
      "proposta enviada",
      "em_negociacao",
      "em negociação",
      "negociacao",
      "negociação",
      "financiamento",
    ].includes(s)
  ) {
    return "proposal";
  }
  if (
    [
      "visita",
      "visita / test drive",
      "visita / test-drive",
      "visita e test drive",
      "visita_agendada",
      "visita agendada",
      "test_drive",
      "test-drive",
      "test drive",
      "visit",
      "visit_scheduled",
      "agendado",
    ].includes(s)
  ) {
    return "visit";
  }
  if (
    [
      "primeiro_contato",
      "primeiro contato",
      "em_atendimento",
      "em atendimento",
      "atendimento",
      "contato",
      "in_contact",
      "first_contact",
    ].includes(s)
  ) {
    return "first_contact";
  }

  return "new";
}

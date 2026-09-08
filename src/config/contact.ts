/**
 * @file contact.ts
 * @description Central oficial de contatos, telefones e links de WhatsApp do Acelera Auto CRM.
 */

export const CONTACT_CONFIG = {
  phone: "5547996348698",
  displayPhone: "(47) 99634-8698",
  email: "contato@aceleraautocrm.com.br",
  sales: {
    phone: "5547996348698",
    displayPhone: "(47) 99634-8698",
    enterpriseMessage:
      "Olá! Gostaria de falar com um especialista sobre o Plano Enterprise do Acelera Auto CRM.",
    defaultMessage:
      "Olá! Gostaria de conhecer melhor o Acelera Auto CRM para minha revenda.",
  },
  support: {
    phone: "5547996348698",
    displayPhone: "(47) 99634-8698",
    defaultMessage: "Olá, preciso de ajuda com o Acelera Auto CRM.",
  },
} as const;

/**
 * Retorna a URL direta do WhatsApp (wa.me) para contato comercial e de vendas.
 * @param customMessage Mensagem opcional pré-formatada.
 */
export function getSalesWhatsAppUrl(customMessage?: string): string {
  const message = customMessage || CONTACT_CONFIG.sales.defaultMessage;
  return `https://wa.me/${CONTACT_CONFIG.sales.phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Retorna a URL direta do WhatsApp (wa.me) para suporte técnico ao cliente.
 * @param customMessage Mensagem opcional pré-formatada.
 */
export function getSupportWhatsAppUrl(customMessage?: string): string {
  const message = customMessage || CONTACT_CONFIG.support.defaultMessage;
  return `https://wa.me/${CONTACT_CONFIG.support.phone}?text=${encodeURIComponent(message)}`;
}

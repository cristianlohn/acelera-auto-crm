/**
 * @file site.ts
 * @description Configurações globais, metadados institucionais e dados jurídicos do Acelera Auto CRM.
 */

export const siteConfig = {
  name: "Acelera Auto CRM",
  description:
    "CRM e Roleta Comercial Especializada para Concessionárias e Revendas.",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://aceleraautocrm.com.br",
  company: {
    legalName: "ACELERA AUTO",
    tradeName: "Acelera Auto",
    cnpj: "68.903.730/0001-36",
    cityState: "Joinville - SC",
    supportEmail: "contato@aceleraautocrm.com.br",
  },
};

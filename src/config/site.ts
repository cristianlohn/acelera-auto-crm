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
    legalName: "Catuto Soluções Digitais LTDA",
    tradeName: "Acelera Auto CRM",
    cnpj: "00.000.000/0001-00",
    cityState: "Joinville - SC",
    supportEmail: "contato@aceleraautocrm.com.br",
  },
};

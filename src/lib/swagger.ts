/**
 * @file swagger.ts
 * @description Configuração da especificação OpenAPI 3.0 para o Acelera Auto CRM.
 */

import { createSwaggerSpec } from "next-swagger-doc";

/**
 * Verifica se a documentação Swagger está habilitada para o ambiente atual.
 * Bloqueia em produção por padrão, a menos que ENABLE_SWAGGER=true esteja configurado.
 */
export function isSwaggerEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  return process.env.ENABLE_SWAGGER === "true";
}

/**
 * Gera dinamicamente a especificação OpenAPI 3.0 lendo as rotas em `src/app/api`.
 */
export function getApiDocs(): ReturnType<typeof createSwaggerSpec> {
  const spec = createSwaggerSpec({
    apiFolder: "src/app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Acelera Auto CRM - API Specification",
        version: "1.0.0",
        description:
          "Documentação completa e interativa das APIs do Acelera Auto CRM. Fornece endpoints para ingestão de leads, distribuição automática por roleta comercial, gestão de veículos, métricas e integrações multi-tenant.",
        contact: {
          name: "Suporte de Engenharia Acelera Auto",
          email: "suporte@aceleraautocrm.com.br",
        },
      },
      servers: [
        {
          url: "/",
          description: "Servidor Atual",
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description:
              "Token JWT de autenticação do usuário do CRM (obtido via login no Supabase Auth).",
          },
          ApiKeyAuth: {
            type: "apiKey",
            in: "header",
            name: "x-api-key",
            description:
              "Chave de API criptográfica gerada no painel de integrações do CRM (ex: acelera_live_...).",
          },
        },
      },
      tags: [
        {
          name: "Auth",
          description: "Endpoints de autenticação, sessão e gerenciamento de usuários",
        },
        {
          name: "Billing & Assinaturas",
          description:
            "Gestão de planos, assinaturas, checkout com Pix/Cartão/Boleto e webhooks do gateway Asaas",
        },
        {
          name: "Leads",
          description: "Gestão de oportunidades comerciais, funil Kanban e histórico de interações",
        },
        {
          name: "Webhooks & Ingestão",
          description:
            "Recebimento externo de leads via Webhooks e integrações de portais (Webmotors, iCarros, Meta Ads)",
        },
        {
          name: "Distribuição & Roleta",
          description:
            "Motor de distribuição inteligente de leads (Fair Round-Robin) e controle de plantão de vendedores",
        },
        {
          name: "Veículos",
          description: "Catálogo e estoque de veículos disponíveis para venda e negociação",
        },
        {
          name: "Configurações",
          description:
            "Configurações gerais da organização, membros da equipe e gestão de Chaves de API",
        },
      ],
    },
  });

  return spec;
}

/**
 * @file swagger-spec.test.ts
 * @description Testes unitários para a geração da especificação OpenAPI 3.0, endpoint /api/doc e auditoria de sanitização de segurança.
 */

import { describe, it, expect } from "vitest";
import { getApiDocs, isSwaggerEnabled } from "@/lib/swagger";
import { GET } from "@/app/api/doc/route";

describe("[UNIT-SWAGGER] OpenAPI 3.0 Specification & Swagger Config", () => {
  it("deve gerar a especificação OpenAPI 3.0 com metadados corretos", () => {
    const spec = getApiDocs() as unknown as {
      openapi: string;
      info: { title: string; version: string };
      components?: {
        securitySchemes?: {
          BearerAuth?: { type: string; scheme: string };
          ApiKeyAuth?: { type: string; in: string; name: string };
        };
      };
      tags?: { name: string }[];
    };

    expect(spec).toBeDefined();
    expect(spec.openapi).toBe("3.0.0");
    expect(spec.info.title).toBe("Acelera Auto CRM - API Specification");
    expect(spec.info.version).toBe("1.0.0");

    // Verifica Esquemas de Segurança
    const sec = spec.components?.securitySchemes;
    expect(sec?.BearerAuth).toBeDefined();
    expect(sec?.BearerAuth?.type).toBe("http");
    expect(sec?.BearerAuth?.scheme).toBe("bearer");

    expect(sec?.ApiKeyAuth).toBeDefined();
    expect(sec?.ApiKeyAuth?.type).toBe("apiKey");
    expect(sec?.ApiKeyAuth?.name).toBe("x-api-key");
    expect(sec?.ApiKeyAuth?.in).toBe("header");

    // Verifica Tags
    const tagNames = spec.tags?.map((t) => t.name) || [];
    expect(tagNames).toContain("Auth");
    expect(tagNames).toContain("Billing & Assinaturas");
    expect(tagNames).toContain("Leads");
    expect(tagNames).toContain("Webhooks & Ingestão");
    expect(tagNames).toContain("Distribuição & Roleta");
    expect(tagNames).toContain("Veículos");
    expect(tagNames).toContain("Configurações");
  });

  it("deve garantir que a especificação OpenAPI NÃO exponha chaves de ambiente ou segredos reais", () => {
    const spec = getApiDocs();
    const specString = JSON.stringify(spec);

    // 1. Não deve conter chaves de serviço ou anônimas reais do Supabase
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      expect(specString).not.toContain(process.env.SUPABASE_SERVICE_ROLE_KEY);
    }
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      expect(specString).not.toContain(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    }

    // 2. Não deve vazar nomes de variáveis confidenciais de ambiente
    expect(specString).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(specString).not.toContain("ASAAS_API_KEY");

    // 3. Qualquer exemplo de token deve ser estritamente ilustrativo/placeholder
    expect(specString).not.toContain("acelera_meta_verify_token_live");
  });

  it("deve habilitar Swagger em desenvolvimento e respeitar ENABLE_SWAGGER em produção", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalEnable = process.env.ENABLE_SWAGGER;

    try {
      // Teste em ambiente não-produção
      // @ts-expect-error test env override
      process.env.NODE_ENV = "development";
      expect(isSwaggerEnabled()).toBe(true);

      // Teste em produção sem ENABLE_SWAGGER
      // @ts-expect-error test env override
      process.env.NODE_ENV = "production";
      delete process.env.ENABLE_SWAGGER;
      expect(isSwaggerEnabled()).toBe(false);

      // Teste em produção com ENABLE_SWAGGER=true
      process.env.ENABLE_SWAGGER = "true";
      expect(isSwaggerEnabled()).toBe(true);
    } finally {
      // @ts-expect-error test env restore
      process.env.NODE_ENV = originalEnv;
      if (originalEnable) {
        process.env.ENABLE_SWAGGER = originalEnable;
      } else {
        delete process.env.ENABLE_SWAGGER;
      }
    }
  });

  it("deve responder status 200 no handler GET /api/doc quando habilitado", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.openapi).toBe("3.0.0");
    expect(json.info.title).toBe("Acelera Auto CRM - API Specification");
  });

  it("deve documentar os endpoints de Billing & Assinaturas (/api/v1/webhooks/asaas e /api/v1/billing/checkout)", () => {
    const spec = getApiDocs() as unknown as {
      paths: Record<
        string,
        Record<
          string,
          {
            tags?: string[];
            summary?: string;
            parameters?: { name: string; in: string }[];
            responses?: Record<string, unknown>;
          }
        >
      >;
    };

    expect(spec.paths).toBeDefined();

    // 1. Webhook Asaas
    const asaasWebhook = spec.paths["/api/v1/webhooks/asaas"]?.post;
    expect(asaasWebhook).toBeDefined();
    expect(asaasWebhook?.tags).toContain("Billing & Assinaturas");
    expect(asaasWebhook?.parameters?.some((p) => p.name === "asaas-access-token")).toBe(true);
    expect(asaasWebhook?.responses?.["200"]).toBeDefined();
    expect(asaasWebhook?.responses?.["400"]).toBeDefined();
    expect(asaasWebhook?.responses?.["401"]).toBeDefined();

    // 2. Checkout de Assinatura
    const billingCheckout = spec.paths["/api/v1/billing/checkout"]?.post;
    expect(billingCheckout).toBeDefined();
    expect(billingCheckout?.tags).toContain("Billing & Assinaturas");
    expect(billingCheckout?.responses?.["200"]).toBeDefined();
    expect(billingCheckout?.responses?.["400"]).toBeDefined();
  });
});

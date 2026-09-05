/**
 * @file seo-metadata.test.ts
 * @description Suíte de Testes de Integração de SEO Técnico, OpenGraph, Sitemap, Robots e Manifest (REQ-CRM-17).
 *
 * ============================================================================
 * ESCOPO DE TESTE & RASTREABILIDADE (SUT: SEO, Metadata, OG Image / REQ-CRM-17)
 * ============================================================================
 * Cenários Testados:
 *   - [IT-17.1]: Validação dos metadados globais (Title template, OpenGraph tags, locale pt_BR e canonical).
 *   - [IT-17.2]: Execução e validação da rota sitemap.ts (retorno de URLs públicas com prioridades corretas).
 *   - [IT-17.3]: Execução e validação de robots.ts (permissão de rotas públicas e bloqueio estrito de /leads, /superadmin e /api/*).
 *   - [IT-17.4]: Validação da geração do manifesto PWA (manifest.ts) com cores da marca e display standalone.
 *   - [IT-17.5]: Verificação da existência e dimensões dos metadados OpenGraph (opengraph-image.tsx).
 *
 * Padrão Estrutural: AAA (Arrange, Act, Assert)
 * Ambiente: Vitest + Node / Happy-DOM
 * ============================================================================
 */

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import RootLayout, { metadata } from "@/app/layout";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import manifest from "@/app/manifest";

vi.mock("next/og", () => ({
  ImageResponse: class MockImageResponse {
    status = 200;
    headers = new Headers({ "content-type": "image/png" });
    constructor(public element: React.ReactNode, public options: unknown) {}
  },
}));

import OpenGraphImage, { size, contentType, alt } from "@/app/opengraph-image";

describe("[IT-17] SEO Técnico, OpenGraph e Metadados de Indexação", () => {
  it("[IT-17.1] Deve conter metadados globais completos, OpenGraph pt_BR, icons, canonical e tags de indexação", () => {
    // Assert (metadataBase & Alternates)
    expect(metadata.metadataBase?.toString()).toContain("aceleraautocrm.com.br");
    expect(metadata.alternates?.canonical).toBe("https://aceleraautocrm.com.br");

    // Title & Template
    expect(metadata.title).toEqual({
      default: "Acelera Auto CRM | CRM Automotivo de Alta Velocidade",
      template: "%s | Acelera Auto CRM",
    });

    // Description & Keywords
    expect(metadata.description).toContain("CRM e Funil de Vendas");
    expect(metadata.keywords).toContain("CRM automotivo");
    expect(metadata.keywords).toContain("funil de vendas WhatsApp revenda");

    // Authors & Publisher
    expect(metadata.creator).toBe("Catuto Soluções Digitais");
    expect(metadata.publisher).toBe("Catuto Soluções Digitais");

    // Icons
    expect(metadata.icons).toBeDefined();
    expect(metadata.icons).toMatchObject({
      shortcut: "/favicon.ico",
    });

    // OpenGraph
    expect(metadata.openGraph).toBeDefined();
    expect((metadata.openGraph as { type?: string })?.type).toBe("website");
    expect((metadata.openGraph as { locale?: string })?.locale).toBe("pt_BR");
    expect((metadata.openGraph as { siteName?: string })?.siteName).toBe("Acelera Auto CRM");
    expect((metadata.openGraph as { title?: string })?.title).toBe(
      "Acelera Auto CRM | CRM Automotivo de Alta Velocidade"
    );
    expect((metadata.openGraph as { images?: Array<{ url: string }> })?.images?.[0]?.url).toContain("/og-image.png");

    // Twitter
    expect(metadata.twitter).toBeDefined();
    expect((metadata.twitter as { card?: string })?.card).toBe("summary_large_image");

    // Robots
    expect(metadata.robots).toBeDefined();
    expect((metadata.robots as { index?: boolean })?.index).toBe(true);
    expect((metadata.robots as { follow?: boolean })?.follow).toBe(true);
  });

  it("[IT-17.2] Deve gerar sitemap.xml dinâmico mapeando todas as rotas públicas com prioridades", () => {
    // Act
    const sitemapEntries = sitemap();

    // Assert
    expect(Array.isArray(sitemapEntries)).toBe(true);
    expect(sitemapEntries.length).toBeGreaterThanOrEqual(6);

    const urls = sitemapEntries.map((e) => e.url);

    // Deve conter '/', '/login', '/register', '/cadastro', '/termos' e '/privacidade'
    expect(urls.some((u) => u.includes("acelera"))).toBe(true);
    expect(urls.some((u) => u.includes("/login"))).toBe(true);
    expect(urls.some((u) => u.includes("/register"))).toBe(true);
    expect(urls.some((u) => u.includes("/cadastro"))).toBe(true);
    expect(urls.some((u) => u.includes("/termos"))).toBe(true);
    expect(urls.some((u) => u.includes("/privacidade"))).toBe(true);

    // Prioridade máxima na home
    const homeEntry = sitemapEntries.find(
      (e) => !e.url.includes("/login") && !e.url.includes("/register") && !e.url.includes("/cadastro") && !e.url.includes("/termos") && !e.url.includes("/privacidade")
    );
    expect(homeEntry?.priority).toBe(1.0);
    expect(homeEntry?.changeFrequency).toBe("weekly");
  });

  it("[IT-17.3] Deve gerar robots.txt permitindo rotas públicas e bloqueando estritamente áreas autenticadas", () => {
    // Act
    const robotsRules = robots();

    // Assert
    expect(robotsRules.sitemap).toContain("sitemap.xml");

    const rules = Array.isArray(robotsRules.rules)
      ? robotsRules.rules[0]
      : robotsRules.rules;

    expect(rules.userAgent).toBe("*");

    // Rotas permitidas
    expect(rules.allow).toContain("/");
    expect(rules.allow).toContain("/login");
    expect(rules.allow).toContain("/register");
    expect(rules.allow).toContain("/og-image.png");

    // Rotas restritas / bloqueadas
    expect(rules.disallow).toContain("/leads");
    expect(rules.disallow).toContain("/vehicles");
    expect(rules.disallow).toContain("/reports");
    expect(rules.disallow).toContain("/settings");
    expect(rules.disallow).toContain("/superadmin");
    expect(rules.disallow).toContain("/admin");
    expect(rules.disallow).toContain("/api/*");
  });

  it("[IT-17.4] Deve gerar manifest.json com branding Acelera Auto e modo display standalone", () => {
    // Act
    const manifestConfig = manifest();

    // Assert
    expect(manifestConfig.name).toBe("Acelera Auto CRM");
    expect(manifestConfig.short_name).toMatch(/Acelera\s?Auto/i);
    expect(manifestConfig.start_url).toBe("/cockpit");
    expect(manifestConfig.display).toBe("standalone");
    expect(manifestConfig.background_color).toBe("#09090b");
    expect(manifestConfig.theme_color).toBe("#f97316");

    expect(manifestConfig.icons).toBeDefined();
    expect(manifestConfig.icons?.length).toBeGreaterThanOrEqual(2);
    expect(manifestConfig.icons?.some((i) => i.sizes === "192x192")).toBe(true);
    expect(manifestConfig.icons?.some((i) => i.sizes === "512x512")).toBe(true);
  });

  it("[IT-17.5] Deve exportar configurações e renderizar a imagem OpenGraph (1200x630)", async () => {
    // Assert configurações estáticas
    expect(size.width).toBe(1200);
    expect(size.height).toBe(630);
    expect(contentType).toBe("image/png");
    expect(alt).toContain("Acelera Auto CRM");

    // Act
    const imageResponse = await OpenGraphImage();

    // Assert Response
    expect(imageResponse).toBeDefined();
    expect(imageResponse.status).toBe(200);
  });

  it("[IT-17.6] Deve injetar o script JSON-LD com Schema.org para Organization e SoftwareApplication", () => {
    // Arrange & Act
    render(
      <RootLayout>
        <div>Conteúdo de Teste</div>
      </RootLayout>
    );

    // Assert
    const script = document.getElementById("schema-jsonld");
    expect(script).toBeInTheDocument();
    expect(script?.getAttribute("type")).toBe("application/ld+json");

    const json = JSON.parse(script?.textContent || "{}");
    expect(json["@context"]).toBe("https://schema.org");
    expect(json["@graph"]).toBeDefined();

    const org = json["@graph"].find(
      (item: { "@type": string }) => item["@type"] === "Organization"
    );
    expect(org.name).toBe("Catuto Soluções Digitais");
    expect(org.contactPoint?.email).toBe("contato@aceleraautocrm.com.br");

    const app = json["@graph"].find(
      (item: { "@type": string }) => item["@type"] === "SoftwareApplication"
    );
    expect(app.name).toBe("Acelera Auto CRM");
    expect(app.applicationCategory).toBe("BusinessApplication");
    expect(app.offers?.priceCurrency).toBe("BRL");
  });
});

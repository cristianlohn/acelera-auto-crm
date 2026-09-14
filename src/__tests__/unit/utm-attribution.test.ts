/**
 * @file utm-attribution.test.ts
 * @description Suíte de testes unitários para rastreamento de atribuição de tráfego (UTMs)
 * e integração com o provisionamento de organizações.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  extractUtmFromSearchParams,
  resolveAttribution,
  getDefaultAttribution,
  parseAttributionCookie,
  saveAttributionCookie,
  getStoredAttribution,
  ATTRIBUTION_COOKIE_NAME,
  type AttributionData,
} from "@/lib/analytics/utm";
import { registerOrganizationAction } from "@/app/actions/auth";
import * as supabaseAdminModule from "@/lib/supabase/admin";
import { cookies } from "next/headers";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

describe("[UNIT-UTM] Rastreamento e Atribuição de Tráfego via UTMs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("[UTM-1] Deve extrair corretamente utm_source=instagram, utm_medium=bio e utm_campaign=perfil", () => {
    const params = new URLSearchParams("utm_source=instagram&utm_medium=bio&utm_campaign=perfil");
    const result = extractUtmFromSearchParams(params, "/");

    expect(result).not.toBeNull();
    expect(result?.utm_source).toBe("instagram");
    expect(result?.utm_medium).toBe("bio");
    expect(result?.utm_campaign).toBe("perfil");
    expect(result?.utm_content).toBeNull();
    expect(result?.utm_term).toBeNull();
    expect(result?.landing_page).toBe("/");
    expect(result?.first_visit_at).toBeDefined();
    expect(new Date(result!.first_visit_at).getTime()).not.toBeNaN();
  });

  it("[UTM-2] Deve extrair todos os 5 parâmetros UTM quando presentes", () => {
    const search =
      "utm_source=google&utm_medium=cpc&utm_campaign=blackfriday&utm_content=banner_top&utm_term=crm+veiculos";
    const params = new URLSearchParams(search);
    const result = extractUtmFromSearchParams(params, "/cadastro");

    expect(result).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "blackfriday",
      utm_content: "banner_top",
      utm_term: "crm veiculos",
      landing_page: "/cadastro",
      first_visit_at: expect.any(String),
    });
  });

  it("[UTM-3] Deve preencher defensivamente landing_page como '/' se pathname for vazio ou indefinido", () => {
    const params = new URLSearchParams("utm_source=meta_ads");
    const result = extractUtmFromSearchParams(params, "");

    expect(result?.landing_page).toBe("/");
    expect(result?.utm_source).toBe("meta_ads");
  });

  it("[UTM-4] Deve retornar null para URLs limpas sem nenhum parâmetro UTM", () => {
    const params = new URLSearchParams("ref=header&tab=1");
    const result = extractUtmFromSearchParams(params, "/");

    expect(result).toBeNull();
  });

  it("[UTM-5] Deve resolver acessos sem UTM recaindo graciosamente para source: 'direct'", () => {
    const params = new URLSearchParams("");
    const resolved = resolveAttribution(params, "/");

    expect(resolved.utm_source).toBe("direct");
    expect(resolved.utm_medium).toBeNull();
    expect(resolved.utm_campaign).toBeNull();
    expect(resolved.landing_page).toBe("/");
    expect(resolved.first_visit_at).toBeDefined();

    const fallback = getDefaultAttribution("/teste");
    expect(fallback.utm_source).toBe("direct");
    expect(fallback.landing_page).toBe("/teste");
  });

  it("[UTM-6] Deve preservar o timestamp original first_visit_at na regra First Touch ao atualizar nova campanha", () => {
    const initialVisitTime = "2026-08-01T10:00:00.000Z";
    const existingAttribution: AttributionData = {
      utm_source: "instagram",
      utm_medium: "bio",
      utm_campaign: "perfil",
      utm_content: null,
      utm_term: null,
      landing_page: "/",
      first_visit_at: initialVisitTime,
    };

    // Novo acesso vindo de campanha do Google
    const newParams = new URLSearchParams("utm_source=google&utm_medium=cpc&utm_campaign=search");
    const resolved = resolveAttribution(newParams, "/precos", existingAttribution);

    expect(resolved.utm_source).toBe("google");
    expect(resolved.utm_medium).toBe("cpc");
    expect(resolved.utm_campaign).toBe("search");
    expect(resolved.landing_page).toBe("/precos");
    // Preserva o first_visit_at original do primeiro contato
    expect(resolved.first_visit_at).toBe(initialVisitTime);
  });

  it("[UTM-7] Deve preservar integralmente atribuição existente se o novo acesso não contiver novas UTMs", () => {
    const existingAttribution: AttributionData = {
      utm_source: "instagram",
      utm_medium: "bio",
      utm_campaign: "perfil",
      utm_content: null,
      utm_term: null,
      landing_page: "/",
      first_visit_at: "2026-08-01T10:00:00.000Z",
    };

    const emptyParams = new URLSearchParams("");
    const resolved = resolveAttribution(emptyParams, "/features", existingAttribution);

    expect(resolved).toEqual(existingAttribution);
  });

  it("[UTM-8] Deve fazer parse seguro de cookie serializado e tratar corrupção graciosamente", () => {
    const validData: AttributionData = {
      utm_source: "instagram",
      utm_medium: "stories",
      utm_campaign: "promo",
      utm_content: null,
      utm_term: null,
      landing_page: "/ofertas",
      first_visit_at: "2026-09-01T12:00:00.000Z",
    };

    const serialized = encodeURIComponent(JSON.stringify(validData));
    const parsed = parseAttributionCookie(serialized);
    expect(parsed).toEqual(validData);

    // Cookie corrompido / JSON inválido
    expect(parseAttributionCookie("invalid_json_###")).toBeNull();
    expect(parseAttributionCookie("")).toBeNull();
    expect(parseAttributionCookie(undefined)).toBeNull();
  });

  it("[UTM-9] Deve ler e gravar cookies no document.cookie do navegador", () => {
    const fakeData: AttributionData = {
      utm_source: "youtube",
      utm_medium: "video",
      utm_campaign: "demo",
      utm_content: "link_desc",
      utm_term: null,
      landing_page: "/",
      first_visit_at: "2026-09-10T08:00:00.000Z",
    };

    // Simula document.cookie
    let cookieStore = "";
    Object.defineProperty(global, "document", {
      value: {
        get cookie() {
          return cookieStore;
        },
        set cookie(val: string) {
          cookieStore = val;
        },
      },
      writable: true,
      configurable: true,
    });

    saveAttributionCookie(fakeData);
    expect(cookieStore).toContain(ATTRIBUTION_COOKIE_NAME);

    const stored = getStoredAttribution();
    expect(stored?.utm_source).toBe("youtube");
    expect(stored?.utm_medium).toBe("video");
    expect(stored?.utm_campaign).toBe("demo");
  });
});

interface OrgInsertPayload {
  name: string;
  slug: string;
  document: string | null;
  plan: string;
  subscription_status: string;
  acquisition_source: string;
  acquisition_medium: string | null;
  acquisition_campaign: string | null;
  acquisition_metadata: Record<string, unknown>;
}

describe("[UNIT-UTM-REGISTER] Integração com Cadastro da Organização", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("[REG-1] Deve persistir dados da UTM do cookie acelera_attribution ao criar organização", async () => {
    const attributionData: AttributionData = {
      utm_source: "instagram",
      utm_medium: "bio",
      utm_campaign: "perfil",
      utm_content: "link_bio",
      utm_term: null,
      landing_page: "/",
      first_visit_at: "2026-09-13T12:00:00.000Z",
    };

    const mockCookieGet = vi.fn().mockReturnValue({
      value: encodeURIComponent(JSON.stringify(attributionData)),
    });
    vi.mocked(cookies).mockResolvedValue({
      get: mockCookieGet,
      set: vi.fn(),
      delete: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    let insertedPayload: OrgInsertPayload | null = null;
    const mockInsert = vi.fn().mockImplementation((payload: OrgInsertPayload) => {
      insertedPayload = payload;
      return {
        select: () => ({
          single: () => Promise.resolve({ data: { id: "org-utm-123", ...payload }, error: null }),
        }),
      };
    });

    vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue({
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    } as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>);

    const result = await registerOrganizationAction({
      name: "AutoPrime Veículos",
    });

    expect(result.success).toBe(true);
    expect(insertedPayload).not.toBeNull();
    expect(insertedPayload!.acquisition_source).toBe("instagram");
    expect(insertedPayload!.acquisition_medium).toBe("bio");
    expect(insertedPayload!.acquisition_campaign).toBe("perfil");
    expect(insertedPayload!.acquisition_metadata).toEqual(attributionData);
  });

  it("[REG-2] Deve recair para source: 'direct' quando o cookie de atribuição não existir", async () => {
    const mockCookieGet = vi.fn().mockReturnValue(undefined);
    vi.mocked(cookies).mockResolvedValue({
      get: mockCookieGet,
      set: vi.fn(),
      delete: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    let insertedPayload: OrgInsertPayload | null = null;
    const mockInsert = vi.fn().mockImplementation((payload: OrgInsertPayload) => {
      insertedPayload = payload;
      return {
        select: () => ({
          single: () => Promise.resolve({ data: { id: "org-direct-123", ...payload }, error: null }),
        }),
      };
    });

    vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue({
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    } as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>);

    const result = await registerOrganizationAction({
      name: "Loja Direta Veículos",
    });

    expect(result.success).toBe(true);
    expect(insertedPayload).not.toBeNull();
    expect(insertedPayload!.acquisition_source).toBe("direct");
    expect(insertedPayload!.acquisition_medium).toBeNull();
    expect(insertedPayload!.acquisition_campaign).toBeNull();
    expect(insertedPayload!.acquisition_metadata).toEqual({});
  });
});

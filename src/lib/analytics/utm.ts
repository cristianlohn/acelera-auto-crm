/**
 * @file utm.ts
 * @description Módulo de utilitários e tipagem para rastreamento de atribuição de tráfego (UTMs).
 * Gerencia persistência em cookie primário de First Touch com suporte a campanhas explícitas.
 */

export interface AttributionData {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  landing_page: string;
  first_visit_at: string;
  [key: string]: unknown;
}

export const ATTRIBUTION_COOKIE_NAME = "acelera_attribution";
export const ATTRIBUTION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias (2.592.000 segundos)

/**
 * Retorna uma atribuição padrão com origem direta.
 */
export function getDefaultAttribution(pathname: string = "/"): AttributionData {
  return {
    utm_source: "direct",
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    landing_page: pathname || "/",
    first_visit_at: new Date().toISOString(),
  };
}

/**
 * Extrai parâmetros UTM dos search params informados.
 * Retorna null se nenhum parâmetro de campanha for detectado.
 */
export function extractUtmFromSearchParams(
  searchParams: URLSearchParams,
  pathname: string = "/"
): AttributionData | null {
  const utm_source = searchParams.get("utm_source");
  const utm_medium = searchParams.get("utm_medium");
  const utm_campaign = searchParams.get("utm_campaign");
  const utm_content = searchParams.get("utm_content");
  const utm_term = searchParams.get("utm_term");

  const hasAnyUtm = Boolean(
    utm_source || utm_medium || utm_campaign || utm_content || utm_term
  );

  if (!hasAnyUtm) {
    return null;
  }

  return {
    utm_source: utm_source ? utm_source.trim() : null,
    utm_medium: utm_medium ? utm_medium.trim() : null,
    utm_campaign: utm_campaign ? utm_campaign.trim() : null,
    utm_content: utm_content ? utm_content.trim() : null,
    utm_term: utm_term ? utm_term.trim() : null,
    landing_page: pathname || "/",
    first_visit_at: new Date().toISOString(),
  };
}

/**
 * Faz parse defensivo de uma string bruta de cookie de atribuição.
 */
export function parseAttributionCookie(rawCookie?: string | null): AttributionData | null {
  if (!rawCookie) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(rawCookie));
    if (typeof parsed === "object" && parsed !== null) {
      return {
        utm_source: parsed.utm_source ?? null,
        utm_medium: parsed.utm_medium ?? null,
        utm_campaign: parsed.utm_campaign ?? null,
        utm_content: parsed.utm_content ?? null,
        utm_term: parsed.utm_term ?? null,
        landing_page: parsed.landing_page || "/",
        first_visit_at: parsed.first_visit_at || new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Lê o cookie de atribuição salvo no navegador (document.cookie).
 */
export function getStoredAttribution(): AttributionData | null {
  if (typeof document === "undefined") {
    return null;
  }

  try {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [name, ...rest] = cookie.trim().split("=");
      if (name === ATTRIBUTION_COOKIE_NAME) {
        const rawValue = rest.join("=");
        return parseAttributionCookie(rawValue);
      }
    }
  } catch {
    // Silencioso em caso de erro no browser
  }

  return null;
}

/**
 * Grava o cookie de atribuição no navegador com SameSite=Lax, Path=/ e Max-Age de 30 dias.
 */
export function saveAttributionCookie(data: AttributionData): void {
  if (typeof document === "undefined") {
    return;
  }

  try {
    const serialized = encodeURIComponent(JSON.stringify(data));
    document.cookie = `${ATTRIBUTION_COOKIE_NAME}=${serialized}; Max-Age=${ATTRIBUTION_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
  } catch {
    // Silencioso
  }
}

/**
 * Resolve a atribuição final com base nos searchParams, página de entrada e atribuição existente.
 * Aplica regra de First Touch com atualização quando novos parâmetros explícitos de campanha chegam.
 */
export function resolveAttribution(
  searchParams: URLSearchParams,
  pathname: string = "/",
  existing?: AttributionData | null
): AttributionData {
  const current = existing ?? (typeof document !== "undefined" ? getStoredAttribution() : null);
  const extracted = extractUtmFromSearchParams(searchParams, pathname);

  if (extracted) {
    if (current) {
      // Preserva o primeiro toque original (first_visit_at) ao atualizar com nova campanha
      return {
        ...extracted,
        first_visit_at: current.first_visit_at || extracted.first_visit_at,
      };
    }
    return extracted;
  }

  if (current) {
    return current;
  }

  return getDefaultAttribution(pathname);
}

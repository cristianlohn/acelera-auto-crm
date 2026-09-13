/**
 * @file plan-resolution.ts
 * @description Módulo puro de Resolução Determinística e Blindada de Planos e Assentos Extras do Asaas.
 *
 * Ordem Rigorosa de Prioridade:
 * 1. externalReference com identificador explícito (ex: plan:pro|extras:2 ou JSON).
 * 2. Descrição textual da fatura (STARTER, PRO, ENTERPRISE).
 * 3. Preços canônicos exatos (297, 2970, 497, 4970).
 * 4. Fallback do plano da organização atual (fallbackOrgPlan).
 * 5. Cálculo matemático por faixas:
 *    - Starter + extras (R$ 297 a R$ 496, R$ 49/vendedor extra)
 *    - Pro + extras (R$ 497 a R$ 1.499, R$ 49/vendedor extra - ex: Pro + 7 extras = R$ 840 NUNCA Enterprise)
 */

export interface PlanResolutionInput {
  value?: number | null;
  description?: string | null;
  externalReference?: string | null;
  fallbackOrgPlan?: string | null;
}

export interface PlanResolutionResult {
  plan: "starter" | "pro" | "enterprise";
  cycle: "MONTHLY" | "YEARLY";
  extraSellersCount: number;
}

const EXTRA_SELLER_PRICE = 49;
const STARTER_BASE_PRICE = 297;
const STARTER_ANNUAL_PRICE = 2970;
const PRO_BASE_PRICE = 497;
const PRO_ANNUAL_PRICE = 4970;

// Preços explícitos conhecidos do plano Enterprise (mensal)
const ENTERPRISE_EXPLICIT_PRICES = new Set([897, 1200, 1297]);

/**
 * Faz o parse estruturado do externalReference suportando:
 * - JSON: {"plan": "pro", "extras": 2}
 * - Formato delimitado por pipes: plan:pro|extras:2 ou pro|extras:3
 * - Formato delimitado por dois pontos: org-123:pro:MONTHLY ou plan:pro
 * - String direta do plano: "pro", "starter", "enterprise"
 */
function parseExternalReference(rawRef?: string | null): {
  plan?: "starter" | "pro" | "enterprise";
  cycle?: "MONTHLY" | "YEARLY";
  extras?: number;
  orgId?: string;
} | null {
  if (!rawRef || !rawRef.trim()) return null;
  const trimmed = rawRef.trim();

  // 1. JSON estruturado
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      const rawPlan = (parsed.plan || parsed.targetPlan)?.toLowerCase();
      const plan =
        rawPlan === "starter" || rawPlan === "pro" || rawPlan === "enterprise"
          ? rawPlan
          : undefined;

      const extras =
        typeof parsed.extras === "number"
          ? Math.max(0, parsed.extras)
          : typeof parsed.extraSellersCount === "number"
          ? Math.max(0, parsed.extraSellersCount)
          : undefined;

      const cycle =
        parsed.cycle?.toUpperCase() === "YEARLY" || parsed.cycle?.toUpperCase() === "ANNUAL"
          ? "YEARLY"
          : parsed.cycle
          ? "MONTHLY"
          : undefined;

      return {
        orgId: parsed.orgId || parsed.organizationId || parsed.id,
        plan,
        cycle,
        extras,
      };
    } catch {
      // continua para outros formatos
    }
  }

  // 2. Delimitado por pipes (ex: plan:pro|extras:2 ou org-123|plan:starter|extras:1)
  if (trimmed.includes("|")) {
    const segments = trimmed.split("|");
    let plan: "starter" | "pro" | "enterprise" | undefined;
    let extras: number | undefined;
    let cycle: "MONTHLY" | "YEARLY" | undefined;
    let orgId: string | undefined;

    for (const seg of segments) {
      const [key, val] = seg.split(":").map((s) => s?.trim());
      const lowerKey = key?.toLowerCase();
      const lowerVal = val?.toLowerCase();

      if (!val && (lowerKey === "starter" || lowerKey === "pro" || lowerKey === "enterprise")) {
        plan = lowerKey as "starter" | "pro" | "enterprise";
      } else if (lowerKey === "plan" && val) {
        if (lowerVal === "starter" || lowerVal === "pro" || lowerVal === "enterprise") {
          plan = lowerVal as "starter" | "pro" | "enterprise";
        }
      } else if ((lowerKey === "extras" || lowerKey === "extra") && val) {
        const num = parseInt(val, 10);
        if (!isNaN(num)) extras = Math.max(0, num);
      } else if (lowerKey === "cycle" && val) {
        cycle =
          val.toUpperCase() === "YEARLY" || val.toUpperCase() === "ANNUAL"
            ? "YEARLY"
            : "MONTHLY";
      } else if (lowerKey === "org" || lowerKey === "orgid") {
        orgId = val;
      }
    }

    return { plan, extras, cycle, orgId };
  }

  // 3. Delimitado por dois pontos (ex: plan:pro ou org-123:pro:MONTHLY)
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":").map((s) => s.trim());
    if (parts[0].toLowerCase() === "plan" && parts[1]) {
      const p = parts[1].toLowerCase();
      if (p === "starter" || p === "pro" || p === "enterprise") {
        return { plan: p as "starter" | "pro" | "enterprise" };
      }
    }
    if (parts.length >= 2) {
      const p = parts[1].toLowerCase();
      if (p === "starter" || p === "pro" || p === "enterprise") {
        return {
          orgId: parts[0],
          plan: p as "starter" | "pro" | "enterprise",
          cycle: parts[2]?.toUpperCase() === "YEARLY" ? "YEARLY" : "MONTHLY",
        };
      }
    }
  }

  // 4. Nome direto do plano
  const cleanPlan = trimmed.toLowerCase();
  if (cleanPlan === "starter" || cleanPlan === "pro" || cleanPlan === "enterprise") {
    return { plan: cleanPlan };
  }

  return null;
}

/**
 * Extrai plano, ciclo e eventuais assentos extras a partir da descrição textual.
 */
function parseDescription(description?: string | null): {
  plan?: "starter" | "pro" | "enterprise";
  cycle?: "MONTHLY" | "YEARLY";
  extras?: number;
} | null {
  if (!description || !description.trim()) return null;
  const descUpper = description.toUpperCase();

  let plan: "starter" | "pro" | "enterprise" | undefined;
  if (descUpper.includes("ENTERPRISE")) {
    plan = "enterprise";
  } else if (descUpper.includes("STARTER")) {
    plan = "starter";
  } else if (descUpper.includes("PRO")) {
    plan = "pro";
  }

  if (!plan) return null;

  let cycle: "MONTHLY" | "YEARLY" = "MONTHLY";
  if (
    descUpper.includes("ANUAL") ||
    descUpper.includes("YEARLY") ||
    descUpper.includes("ANNUAL")
  ) {
    cycle = "YEARLY";
  }

  let extras: number | undefined;
  const extrasMatch = description.match(/(\d+)\s*(?:vendedor(?:es)?\s*)?extra/i);
  if (extrasMatch) {
    const num = parseInt(extrasMatch[1], 10);
    if (!isNaN(num)) extras = Math.max(0, num);
  }

  return { plan, cycle, extras };
}

/**
 * Normaliza plano para formato canônico minúsculo.
 */
function normalizePlanName(rawPlan?: string | null): "starter" | "pro" | "enterprise" | undefined {
  if (!rawPlan) return undefined;
  const lower = rawPlan.toLowerCase().trim();
  if (lower === "starter" || lower === "pro" || lower === "enterprise") {
    return lower;
  }
  return undefined;
}

/**
 * Assinatura com objeto de entrada canônico (Fase 2 de Faturamento Dinâmico).
 */
export function resolvePlanFromData(input: PlanResolutionInput): PlanResolutionResult;

/**
 * Sobrecarga legada compatível com chamadas posicionais.
 */
export function resolvePlanFromData(
  parsedRefPlan?: string | null,
  description?: string | null,
  paymentValue?: number | null,
  fallbackOrgPlan?: string | null
): "starter" | "pro" | "enterprise";

/**
 * Implementação combinada garantindo compatibilidade total e ordem rigorosa de prioridade.
 */
export function resolvePlanFromData(
  arg1?: PlanResolutionInput | string | null,
  arg2?: string | null,
  arg3?: number | null,
  arg4?: string | null
): PlanResolutionResult | "starter" | "pro" | "enterprise" {
  const isInputObject =
    typeof arg1 === "object" &&
    arg1 !== null &&
    ("value" in arg1 || "description" in arg1 || "externalReference" in arg1 || "fallbackOrgPlan" in arg1);

  const input: PlanResolutionInput = isInputObject
    ? (arg1 as PlanResolutionInput)
    : {
        externalReference: typeof arg1 === "string" ? arg1 : undefined,
        description: arg2,
        value: arg3,
        fallbackOrgPlan: arg4,
      };

  const val =
    input.value !== undefined && input.value !== null
      ? Math.round(input.value * 100) / 100
      : undefined;

  const normFallback = normalizePlanName(input.fallbackOrgPlan);

  // ---------------------------------------------------------------------------
  // 1. externalReference com identificador explícito (ex: plan:pro|extras:2)
  // ---------------------------------------------------------------------------
  const parsedRef = parseExternalReference(input.externalReference);
  if (parsedRef?.plan) {
    const plan = parsedRef.plan;
    const cycle =
      parsedRef.cycle ||
      (val && val > 1500 && val !== PRO_BASE_PRICE && val !== STARTER_BASE_PRICE
        ? "YEARLY"
        : "MONTHLY");

    let extraSellersCount = parsedRef.extras ?? 0;

    // Se não tiver extras explícitos no ref mas tiver valor informado, calcula os extras
    if (extraSellersCount === 0 && val !== undefined) {
      if (plan === "starter" && val >= STARTER_BASE_PRICE && val <= 496) {
        extraSellersCount = Math.max(0, Math.round((val - STARTER_BASE_PRICE) / EXTRA_SELLER_PRICE));
      } else if (plan === "pro" && val >= PRO_BASE_PRICE && val <= 1499) {
        extraSellersCount = Math.max(0, Math.round((val - PRO_BASE_PRICE) / EXTRA_SELLER_PRICE));
      }
    }

    const result: PlanResolutionResult = { plan, cycle, extraSellersCount };
    return isInputObject ? result : result.plan;
  }

  // ---------------------------------------------------------------------------
  // 2. Descrição textual da fatura (STARTER, PRO, ENTERPRISE)
  // ---------------------------------------------------------------------------
  const parsedDesc = parseDescription(input.description);
  if (parsedDesc?.plan) {
    const plan = parsedDesc.plan;
    const cycle =
      parsedDesc.cycle ||
      (val && val > 1500 ? "YEARLY" : "MONTHLY");

    let extraSellersCount = parsedDesc.extras ?? 0;

    if (extraSellersCount === 0 && val !== undefined) {
      if (plan === "starter" && val >= STARTER_BASE_PRICE && val <= 496) {
        extraSellersCount = Math.max(0, Math.round((val - STARTER_BASE_PRICE) / EXTRA_SELLER_PRICE));
      } else if (plan === "pro" && val >= PRO_BASE_PRICE && val <= 1499) {
        extraSellersCount = Math.max(0, Math.round((val - PRO_BASE_PRICE) / EXTRA_SELLER_PRICE));
      }
    }

    const result: PlanResolutionResult = { plan, cycle, extraSellersCount };
    return isInputObject ? result : result.plan;
  }

  // ---------------------------------------------------------------------------
  // 3. Preços canônicos exatos (297, 2970, 497, 4970)
  // ---------------------------------------------------------------------------
  if (val === STARTER_BASE_PRICE) {
    const result: PlanResolutionResult = { plan: "starter", cycle: "MONTHLY", extraSellersCount: 0 };
    return isInputObject ? result : result.plan;
  }
  if (val === STARTER_ANNUAL_PRICE) {
    const result: PlanResolutionResult = { plan: "starter", cycle: "YEARLY", extraSellersCount: 0 };
    return isInputObject ? result : result.plan;
  }
  if (val === PRO_BASE_PRICE) {
    const result: PlanResolutionResult = { plan: "pro", cycle: "MONTHLY", extraSellersCount: 0 };
    return isInputObject ? result : result.plan;
  }
  if (val === PRO_ANNUAL_PRICE) {
    const result: PlanResolutionResult = { plan: "pro", cycle: "YEARLY", extraSellersCount: 0 };
    return isInputObject ? result : result.plan;
  }

  // ---------------------------------------------------------------------------
  // 4. Fallback do plano da organização atual (fallbackOrgPlan)
  // ---------------------------------------------------------------------------
  if (normFallback) {
    if (normFallback === "starter") {
      let extraSellersCount = 0;
      let cycle: "MONTHLY" | "YEARLY" = "MONTHLY";

      if (val !== undefined) {
        if (val >= STARTER_BASE_PRICE && val <= 496) {
          extraSellersCount = Math.max(0, Math.round((val - STARTER_BASE_PRICE) / EXTRA_SELLER_PRICE));
        } else if (val === STARTER_ANNUAL_PRICE) {
          cycle = "YEARLY";
        }
      }

      const result: PlanResolutionResult = { plan: "starter", cycle, extraSellersCount };
      return isInputObject ? result : result.plan;
    }

    if (normFallback === "pro") {
      let extraSellersCount = 0;
      let cycle: "MONTHLY" | "YEARLY" = "MONTHLY";

      if (val !== undefined) {
        if (val >= PRO_BASE_PRICE && val <= 1499) {
          extraSellersCount = Math.max(0, Math.round((val - PRO_BASE_PRICE) / EXTRA_SELLER_PRICE));
        } else if (val === PRO_ANNUAL_PRICE) {
          cycle = "YEARLY";
        }
      }

      const result: PlanResolutionResult = { plan: "pro", cycle, extraSellersCount };
      return isInputObject ? result : result.plan;
    }

    if (normFallback === "enterprise") {
      const cycle: "MONTHLY" | "YEARLY" = val && val > 5000 ? "YEARLY" : "MONTHLY";
      const result: PlanResolutionResult = { plan: "enterprise", cycle, extraSellersCount: 0 };
      return isInputObject ? result : result.plan;
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Cálculo matemático por faixas
  //    - Starter + extras (R$ 297 a R$ 496)
  //    - Pro + extras (R$ 497 a R$ 1.499)
  //    - Nunca classifique Pro com múltiplos vendedores (ex: 840) como Enterprise
  // ---------------------------------------------------------------------------
  if (val !== undefined) {
    // Valores explícitos conhecidos de Enterprise
    if (ENTERPRISE_EXPLICIT_PRICES.has(val)) {
      const result: PlanResolutionResult = { plan: "enterprise", cycle: "MONTHLY", extraSellersCount: 0 };
      return isInputObject ? result : result.plan;
    }

    // Faixa Starter + extras: 297 a 496
    if (val >= STARTER_BASE_PRICE && val <= 496) {
      const extraSellersCount = Math.max(0, Math.round((val - STARTER_BASE_PRICE) / EXTRA_SELLER_PRICE));
      const result: PlanResolutionResult = { plan: "starter", cycle: "MONTHLY", extraSellersCount };
      return isInputObject ? result : result.plan;
    }

    // Faixa Pro + extras: 497 a 1499 (NUNCA Enterprise!)
    if (val >= PRO_BASE_PRICE && val <= 1499) {
      const extraSellersCount = Math.max(0, Math.round((val - PRO_BASE_PRICE) / EXTRA_SELLER_PRICE));
      const result: PlanResolutionResult = { plan: "pro", cycle: "MONTHLY", extraSellersCount };
      return isInputObject ? result : result.plan;
    }

    // Faixa Enterprise de grande porte (> 1500 excluindo os anuais já checados)
    if (val >= 1500) {
      const result: PlanResolutionResult = { plan: "enterprise", cycle: "YEARLY", extraSellersCount: 0 };
      return isInputObject ? result : result.plan;
    }

    // Tolerância para Starter com pequenos descontos promocionais (250 a 296)
    if (val >= 250 && val < STARTER_BASE_PRICE) {
      const result: PlanResolutionResult = { plan: "starter", cycle: "MONTHLY", extraSellersCount: 0 };
      return isInputObject ? result : result.plan;
    }

    // Tolerância para Pro com pequenos descontos promocionais (400 a 496)
    if (val >= 400 && val < PRO_BASE_PRICE) {
      const result: PlanResolutionResult = { plan: "pro", cycle: "MONTHLY", extraSellersCount: 0 };
      return isInputObject ? result : result.plan;
    }
  }

  // Fallback padrão de segurança
  const defaultResult: PlanResolutionResult = { plan: "starter", cycle: "MONTHLY", extraSellersCount: 0 };
  return isInputObject ? defaultResult : defaultResult.plan;
}

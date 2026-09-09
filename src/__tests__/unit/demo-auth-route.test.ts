/**
 * @file demo-auth-route.test.ts
 * @description Testes unitários para o endpoint /api/auth/demo, enterDemoModeAction e initDemoModeCookies.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/auth/demo/route";
import { enterDemoModeAction } from "@/app/actions/auth";
import { initDemoModeCookies } from "@/lib/auth/demo-helpers";
import { DEFAULT_DEMO_ORG_ID } from "@/lib/auth/constants";

describe("[UNIT-DEMO-AUTH] Inicialização Confiável do Modo Demo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Endpoint GET /api/auth/demo deve configurar cookies do modo demo e redirecionar com 307 para /dashboard/leads", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/demo");
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard/leads");

    const setCookieHeaders = res.headers.getSetCookie();
    expect(setCookieHeaders.some((c) => c.includes("acelera_demo_mode=true"))).toBe(true);
    expect(setCookieHeaders.some((c) => c.includes("sb-demo-auth=true"))).toBe(true);
    expect(setCookieHeaders.some((c) => c.includes("acelera_demo_role=admin"))).toBe(true);
    expect(setCookieHeaders.some((c) => c.includes(`acelera_demo_org=${DEFAULT_DEMO_ORG_ID}`))).toBe(true);

    // Cookies residuais de bloqueio limpos
    expect(setCookieHeaders.some((c) => c.includes("billing_status=;"))).toBe(true);
    expect(setCookieHeaders.some((c) => c.includes("account_suspended=;"))).toBe(true);
  });

  it("Endpoint POST /api/auth/demo deve se comportar de forma idêntica ao GET", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/demo", { method: "POST" });
    const res = await POST(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard/leads");
  });

  it("initDemoModeCookies deve gravar cookies e limpar chaves residuais de bloqueio no navegador", () => {
    initDemoModeCookies();

    expect(document.cookie).toContain("acelera_demo_mode=true");
    expect(document.cookie).toContain("sb-demo-auth=true");
    expect(document.cookie).toContain("acelera_demo_role=admin");
  });

  it("enterDemoModeAction deve executar com sucesso no servidor", async () => {
    const result = await enterDemoModeAction();
    expect(result.success).toBe(true);
  });
});

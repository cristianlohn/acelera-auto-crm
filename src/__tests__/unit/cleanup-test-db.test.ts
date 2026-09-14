/**
 * @file cleanup-test-db.test.ts
 * @description Suíte de Testes Unitários para o utilitário de teardown e limpeza de banco E2E.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanupE2ETestData } from "../helpers/cleanup-test-db";
import globalTeardown from "../e2e/teardown";
import * as supabaseAdminModule from "@/lib/supabase/admin";

describe("[UNIT-E2E-CLEANUP] Utilitário de Limpeza de Banco E2E (cleanupE2ETestData)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it("deve retornar gracioso quando variáveis do Supabase não estiverem configuradas", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const result = await cleanupE2ETestData();
    expect(result.success).toBe(true);
    expect(result.organizationsFound).toBe(0);
    expect(result.organizationsDeleted).toBe(0);
    expect(result.message).toContain("Supabase não configurado");
  });

  it("deve localizar organizações com prefixo [E2E-TEST] e remover em cascata", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

    const inMock = vi.fn().mockResolvedValue({ error: null });
    const ilikeMock = vi.fn().mockResolvedValue({ error: null });

    const deleteUserMock = vi.fn().mockResolvedValue({ data: {}, error: null });

    const fakeAdmin = {
      from: vi.fn((table: string) => {
        if (table === "organizations") {
          return {
            select: vi.fn().mockReturnValue({
              ilike: vi.fn().mockResolvedValue({
                data: [
                  { id: "org-e2e-001", name: "[E2E-TEST] Auto Shopping A" },
                  { id: "org-e2e-002", name: "[E2E-TEST] Auto Shopping B" },
                ],
                error: null,
              }),
            }),
            delete: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }

        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ id: "usr-e2e-001", email: "e2e-01@test.com" }],
                error: null,
              }),
            }),
            delete: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }

        // Outras tabelas (leads, vehicles, etc.)
        return {
          delete: vi.fn().mockReturnValue({
            in: inMock,
            ilike: ilikeMock,
          }),
        };
      }),
      auth: {
        admin: {
          deleteUser: deleteUserMock,
        },
      },
    };

    vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
      fakeAdmin as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
    );

    const result = await cleanupE2ETestData();

    expect(result.success).toBe(true);
    expect(result.organizationsFound).toBe(2);
    expect(result.organizationsDeleted).toBe(2);
    expect(deleteUserMock).toHaveBeenCalledWith("usr-e2e-001");
  });

  it("deve incluir specificOrgId e specificUserId na limpeza", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

    const deleteUserMock = vi.fn().mockResolvedValue({ data: {}, error: null });

    const fakeAdmin = {
      from: vi.fn((table: string) => {
        if (table === "organizations") {
          return {
            select: vi.fn().mockReturnValue({
              ilike: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
            delete: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }

        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
            delete: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }

        return {
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null }),
            ilike: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }),
      auth: {
        admin: {
          deleteUser: deleteUserMock,
        },
      },
    };

    vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
      fakeAdmin as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
    );

    const result = await cleanupE2ETestData("specific-org-123", "specific-usr-456");

    expect(result.success).toBe(true);
    expect(result.organizationsFound).toBe(1);
    expect(result.organizationsDeleted).toBe(1);
    expect(deleteUserMock).toHaveBeenCalledWith("specific-usr-456");
  });

  it("deve executar globalTeardown sem falhas", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    await expect(globalTeardown()).resolves.toBeUndefined();
  });
});

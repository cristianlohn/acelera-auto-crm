/**
 * @file vehicle-actions-and-upload.test.ts
 * @description Suíte de testes unitários para ações de upload WebP, criação, edição, galeria e exclusão de veículos.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { convertImageToWebP } from "@/lib/utils/image-processing";
import {
  uploadVehicleImageAction,
  createVehicleAction,
  updateVehicleAction,
  deleteVehicleAction,
  getVehiclesAction,
} from "@/app/actions/vehicle-actions";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockVehicleRow = {
  id: "v-db-123",
  organization_id: "org-test-01",
  make: "Toyota",
  model: "Corolla Cross",
  version: "XR 2.0",
  year_fab: 2024,
  year_model: 2025,
  price: 180000,
  mileage: 5000,
  plate_last_digits: "ABC1D23",
  color: "Branco",
  fuel: "flex",
  transmission: "automatico",
  status: "disponivel",
  photo_url: "https://storage.supabase.co/vehicles/org-test-01/corolla.webp",
  notes: JSON.stringify({
    images: ["https://storage.supabase.co/vehicles/org-test-01/corolla.webp"],
    notes: "Impecável",
  }),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

let lastUpdatePayload: Record<string, unknown> | null = null;
let lastDeleteEqCalls: [string, string][] = [];

function createMockQueryBuilder() {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn((payload) => {
      lastUpdatePayload = payload;
      return builder;
    }),
    delete: vi.fn(() => builder),
    eq: vi.fn((col, val) => {
      lastDeleteEqCalls.push([col, val]);
      return builder;
    }),
    order: vi.fn(() => builder),
    single: vi.fn().mockResolvedValue({ data: mockVehicleRow, error: null }),
    then: (onfulfilled: (res: { data: unknown[]; error: null }) => unknown) =>
      Promise.resolve({ data: [mockVehicleRow], error: null }).then(onfulfilled),
  };
  return builder;
}

// Mock das dependências de autenticação e supabase
vi.mock("@/lib/auth/tenant", () => ({
  resolveUserTenantContext: vi.fn().mockResolvedValue({
    userId: "user-test-01",
    organizationId: "org-test-01",
    isDemo: false,
    role: "gestor",
  }),
  DEFAULT_DEMO_ORG_ID: "a0000000-0000-0000-0000-000000000001",
}));

vi.mock("@/lib/supabase/server", () => ({
  isSupabaseServerConfigured: vi.fn().mockReturnValue(true),
  createServerSupabaseClient: vi.fn().mockImplementation(() =>
    Promise.resolve({
      from: vi.fn().mockImplementation(() => createMockQueryBuilder()),
    })
  ),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({
    storage: {
      createBucket: vi.fn().mockResolvedValue({ data: {}, error: null }),
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: "org-test-01/123-car.webp" },
          error: null,
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: "https://storage.supabase.co/vehicles/org-test-01/123-car.webp" },
        }),
      }),
    },
  }),
}));

describe("[UNIT-VEHICLE-ACTIONS] Upload e Gestão de Veículos com Galeria WebP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastUpdatePayload = null;
    lastDeleteEqCalls = [];
  });

  describe("1. Utilitário de Conversão WebP (convertImageToWebP)", () => {
    it("[TEST-WEBP-1] deve retornar promessa com Blob e nome sanitizado com extensão .webp", async () => {
      const dummyFile = new File(["dummy content"], "meu carro (foto 1).png", {
        type: "image/png",
      });

      const result = await convertImageToWebP(dummyFile, 1600, 0.85);

      expect(result).toBeDefined();
      expect(result.fileName).toContain(".webp");
      expect(result.blob).toBeDefined();
    });
  });

  describe("2. Server Action de Upload (uploadVehicleImageAction)", () => {
    it("[TEST-UPLOAD-1] deve enviar arquivo para o Supabase Storage e retornar a URL pública", async () => {
      const formData = new FormData();
      const dummyBlob = new Blob(["fake-image-bytes"], { type: "image/webp" });
      formData.append("file", dummyBlob, "honda-civic.webp");
      formData.append("fileName", "honda-civic.webp");

      const result = await uploadVehicleImageAction(formData);

      expect(result.success).toBe(true);
      expect(result.url).toBe("https://storage.supabase.co/vehicles/org-test-01/123-car.webp");
    });

    it("[TEST-UPLOAD-2] deve retornar erro quando nenhum arquivo for enviado", async () => {
      const formData = new FormData();
      const result = await uploadVehicleImageAction(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Nenhum arquivo enviado");
    });
  });

  describe("3. Server Action de Criação (createVehicleAction)", () => {
    it("[TEST-CREATE-1] deve cadastrar novo veículo persistindo galeria e dados técnicos", async () => {
      const newVehicleData = {
        make: "Toyota",
        model: "Corolla Cross",
        version: "XR 2.0",
        yearFab: 2024,
        yearModel: 2025,
        price: 180000,
        km: 5000,
        plate: "ABC1D23",
        status: "disponivel" as const,
        imageUrl: "https://storage.supabase.co/vehicles/org-test-01/corolla.webp",
        images: ["https://storage.supabase.co/vehicles/org-test-01/corolla.webp"],
        notes: "Impecável",
      };

      const result = await createVehicleAction(newVehicleData);

      expect(result.success).toBe(true);
      expect(result.vehicle).toBeDefined();
      expect(result.vehicle?.make).toBe("Toyota");
      expect(result.vehicle?.model).toBe("Corolla Cross");
      expect(result.vehicle?.price).toBe(180000);
      expect(result.vehicle?.images).toContain("https://storage.supabase.co/vehicles/org-test-01/corolla.webp");
    });
  });

  describe("4. Server Action de Edição (updateVehicleAction)", () => {
    it("[TEST-UPDATE-1] deve atualizar dados de preço, quilometragem e galeria de fotos", async () => {
      const updateData = {
        price: 175000,
        km: 6200,
        status: "reservado" as const,
        images: [
          "https://storage.supabase.co/vehicles/org-test-01/corolla.webp",
          "https://storage.supabase.co/vehicles/org-test-01/corolla-interior.webp",
        ],
      };

      const result = await updateVehicleAction("v-db-123", updateData);

      expect(result.success).toBe(true);
      expect(result.vehicle).toBeDefined();
      expect(result.vehicle?.id).toBe("v-db-123");
    });

    it("[TEST-UPDATE-2] deve salvar o array de imagens atualizado após uma remoção de foto", async () => {
      const updateData = {
        imageUrl: "https://storage.supabase.co/vehicles/org-test-01/foto2.webp",
        images: ["https://storage.supabase.co/vehicles/org-test-01/foto2.webp"],
      };

      const result = await updateVehicleAction("v-db-123", updateData);

      expect(result.success).toBe(true);
      expect(lastUpdatePayload).not.toBeNull();
      expect(lastUpdatePayload?.photo_url).toBe("https://storage.supabase.co/vehicles/org-test-01/foto2.webp");
      expect(lastUpdatePayload?.notes).toContain("foto2.webp");
    });
  });

  describe("5. Server Action de Exclusão (deleteVehicleAction)", () => {
    it("[TEST-DELETE-1] deve excluir o registro no Supabase filtrando pelo organization_id correto", async () => {
      const result = await deleteVehicleAction("v-db-123");

      expect(result.success).toBe(true);
      // Valida que o filtro do tenant foi aplicado na exclusão
      expect(lastDeleteEqCalls).toEqual(
        expect.arrayContaining([
          ["id", "v-db-123"],
          ["organization_id", "org-test-01"],
        ])
      );
    });
  });

  describe("6. Server Action de Listagem (getVehiclesAction)", () => {
    it("[TEST-LIST-1] deve consultar lista de veículos mapeando a galeria de fotos", async () => {
      const vehicles = await getVehiclesAction();

      expect(Array.isArray(vehicles)).toBe(true);
      expect(vehicles.length).toBeGreaterThan(0);
      expect(vehicles[0].make).toBe("Toyota");
      expect(vehicles[0].images).toBeDefined();
    });
  });
});

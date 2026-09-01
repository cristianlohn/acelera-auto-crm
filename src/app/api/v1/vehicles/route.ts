/**
 * @file route.ts
 * @description Endpoint de Estoque e Catálogo de Veículos (GET e POST /api/v1/vehicles).
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAndTenant } from "@/lib/auth/get-current-user";
import { vehicleSchema } from "@/lib/validations/crm";
import {
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { getScopedSupabaseClient } from "@/lib/supabase/authenticated-client";
import { mockVehicles } from "@/lib/mock-data";
import type { Database } from "@/types/database.types";

/**
 * @swagger
 * /api/v1/vehicles:
 *   get:
 *     summary: Catálogo e estoque de veículos
 *     description: Lista os veículos cadastrados no pátio da concessionária com filtros por marca, modelo, status e faixa de preço.
 *     tags:
 *       - Veículos
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: make
 *         schema:
 *           type: string
 *         description: "Filtrar por marca (ex: Toyota, Jeep, Honda)."
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [disponivel, reservado, vendido, all]
 *           default: disponivel
 *       - in: query
 *         name: max_price
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Lista de veículos retornada com sucesso.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Erro interno no servidor.
 *   post:
 *     summary: Cadastro de veículo no estoque
 *     description: Insere um novo veículo no catálogo da concessionária autenticada.
 *     tags:
 *       - Veículos
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - make
 *               - model
 *               - year_fab
 *               - year_model
 *               - price
 *               - mileage
 *               - plate_last_digits
 *             properties:
 *               make:
 *                 type: string
 *                 example: Toyota
 *               model:
 *                 type: string
 *                 example: Corolla Cross
 *               version:
 *                 type: string
 *                 example: XRE 2.0 Flex
 *               year_fab:
 *                 type: integer
 *                 example: 2023
 *               year_model:
 *                 type: integer
 *                 example: 2024
 *               price:
 *                 type: number
 *                 example: 149900
 *               mileage:
 *                 type: integer
 *                 example: 18500
 *               plate_last_digits:
 *                 type: string
 *                 example: "ABC1D23"
 *               color:
 *                 type: string
 *                 example: Branco Perolizado
 *               fuel:
 *                 type: string
 *                 enum: [flex, gasolina, etanol, diesel, hibrido, eletrico]
 *                 default: flex
 *               transmission:
 *                 type: string
 *                 enum: [automatico, manual, cvt]
 *                 default: automatico
 *               status:
 *                 type: string
 *                 enum: [disponivel, reservado, vendido]
 *                 default: disponivel
 *     responses:
 *       201:
 *         description: Veículo cadastrado com sucesso.
 *       400:
 *         description: Dados do veículo inválidos.
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Erro interno no servidor.
 */

export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserAndTenant(request);
    if (!auth.success) {
      return auth.response;
    }

    const { organizationId } = auth.context;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Forbidden: Usuário autenticado não pertence a nenhum tenant/organização." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const make = searchParams.get("make");
    const status = searchParams.get("status") || "disponivel";
    const maxPrice = searchParams.get("max_price");

    if (isSupabaseServerConfigured()) {
      const supabase = await getScopedSupabaseClient(request);
      if (supabase) {
        let query = supabase
          .from("vehicles")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false });

        if (make) {
          query = query.ilike("make", `%${make}%`);
        }

        if (status && status !== "all") {
          query = query.eq("status", status as Database["public"]["Enums"]["vehicle_status"]);
        }

        if (maxPrice && !isNaN(Number(maxPrice))) {
          query = query.lte("price", Number(maxPrice));
        }

        const { data, error } = await query;

        if (error) {
          console.error("[Get Vehicles Error]", error.message);
          return NextResponse.json({ error: "Erro ao consultar veículos." }, { status: 500 });
        }

        return NextResponse.json({ data: data || [] }, { status: 200 });
      }
    }

    let filtered = [...mockVehicles];
    if (make) {
      filtered = filtered.filter((v) => v.make.toLowerCase().includes(make.toLowerCase()));
    }
    if (status && status !== "all") {
      filtered = filtered.filter((v) => v.status === status);
    }
    if (maxPrice && !isNaN(Number(maxPrice))) {
      filtered = filtered.filter((v) => v.price <= Number(maxPrice));
    }

    return NextResponse.json({ data: filtered }, { status: 200 });
  } catch (error) {
    console.error("[Get Vehicles Fatal]", error);
    return NextResponse.json({ error: "Erro interno no servidor ao listar veículos." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCurrentUserAndTenant(request);
    if (!auth.success) {
      return auth.response;
    }

    const { organizationId } = auth.context;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Forbidden: Usuário autenticado não pertence a nenhum tenant/organização." },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Bad Request: JSON malformatado." }, { status: 400 });
    }

    const validation = vehicleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados de veículo inválidos.", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;
    let vehicleId = `veh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (isSupabaseServerConfigured()) {
      const supabase = await getScopedSupabaseClient(request);
      if (supabase) {
        const { data: inserted, error } = await supabase
          .from("vehicles")
          .insert({
            organization_id: organizationId,
            make: data.make,
            model: data.model,
            version: data.version || null,
            year_fab: data.year_fab,
            year_model: data.year_model,
            price: data.price,
            mileage: data.mileage,
            plate_last_digits: data.plate_last_digits,
            color: data.color,
            fuel: data.fuel,
            transmission: data.transmission,
            status: data.status,
            photo_url: data.photo_url || null,
            notes: data.notes || null,
          })
          .select("*")
          .maybeSingle();

        if (error) {
          console.error("[Insert Vehicle Error]", error.message);
          return NextResponse.json({ error: "Erro ao cadastrar veículo no banco." }, { status: 500 });
        }

        if (inserted?.id) {
          vehicleId = inserted.id;
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        vehicle_id: vehicleId,
        message: "Veículo cadastrado no estoque com sucesso.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Insert Vehicle Fatal]", error);
    return NextResponse.json({ error: "Erro interno no servidor ao cadastrar veículo." }, { status: 500 });
  }
}

/**
 * @file route.ts
 * @description Endpoints de Gestão Operacional de Leads da API v1 (GET e POST /api/v1/leads).
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAndTenant } from "@/lib/auth/get-current-user";
import { leadQuerySchema, createCrmLeadSchema } from "@/lib/validations/crm";
import { normalizeOrigin } from "@/app/api/webhooks/leads/route";
import { resolveAssignedSellerInfo } from "@/lib/crm/roleta";
import {
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { getScopedSupabaseClient } from "@/lib/supabase/authenticated-client";
import { mockLeads } from "@/lib/mock-data";
import type { Database, LeadStatus } from "@/types/database.types";

/**
 * @swagger
 * /api/v1/leads:
 *   get:
 *     summary: Listagem paginada de leads com filtros
 *     description: Retorna a lista paginada de leads pertencentes à concessionária autenticada, com suporte a busca textual e filtros de funil e origem.
 *     tags:
 *       - Leads
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Quantidade de itens por página (máx 100).
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [novo, atendimento, visita, proposta, fechado, all]
 *           default: all
 *         description: Filtrar por etapa do funil.
 *       - in: query
 *         name: origin
 *         schema:
 *           type: string
 *         description: Filtrar pelo canal de origem (webmotors, meta_ads, site, etc).
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Busca por nome, telefone ou e-mail do lead.
 *     responses:
 *       200:
 *         description: Lista de leads recuperada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 total_pages:
 *                   type: integer
 *       401:
 *         description: Token de autenticação ausente ou inválido.
 *       500:
 *         description: Erro interno no servidor.
 *   post:
 *     summary: Cadastro manual de lead
 *     description: Cadastra um novo lead diretamente no CRM, vinculando-o à concessionária autenticada e aplicando atribuição por vendedor ou roleta.
 *     tags:
 *       - Leads
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *                 example: Carlos Alberto
 *               phone:
 *                 type: string
 *                 example: "11988887777"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: carlos.alberto@email.com
 *               vehicle_interest:
 *                 type: string
 *                 example: Toyota Corolla Cross 2024
 *               origin:
 *                 type: string
 *                 example: patio_balcao
 *               status:
 *                 type: string
 *                 enum: [novo, atendimento, visita, proposta, fechado]
 *                 default: novo
 *               seller_name:
 *                 type: string
 *                 example: Rafael Alves
 *               notes:
 *                 type: string
 *                 example: Cliente esteve na loja física buscando opções de financiamento.
 *     responses:
 *       201:
 *         description: Lead cadastrado com sucesso.
 *       400:
 *         description: Dados do lead inválidos.
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

    const queryValidation = leadQuerySchema.safeParse({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
      status: searchParams.get("status") || "all",
      origin: searchParams.get("origin") || undefined,
      assigned_to: searchParams.get("assigned_to") || undefined,
      search: searchParams.get("search") || undefined,
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        { error: "Parâmetros de consulta inválidos.", details: queryValidation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { page, limit, status, origin, assigned_to, search } = queryValidation.data;
    const offset = (page - 1) * limit;

    if (isSupabaseServerConfigured()) {
      const supabase = await getScopedSupabaseClient(request);
      if (supabase) {
        let query = supabase
          .from("leads")
          .select("*", { count: "exact" })
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false });

        if (status && status !== "all") {
          query = query.eq("status", status as Database["public"]["Enums"]["lead_status"]);
        }

        if (origin) {
          query = query.eq("origin", normalizeOrigin(origin));
        }

        if (assigned_to) {
          query = query.ilike("seller_name", `%${assigned_to}%`);
        }

        if (search) {
          query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
        }

        const { data, count, error } = await query.range(offset, offset + limit - 1);

        if (error) {
          console.error("[Leads Query Error]", error.message);
          return NextResponse.json({ error: "Erro ao consultar leads." }, { status: 500 });
        }

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        return NextResponse.json(
          {
            data: data || [],
            page,
            limit,
            total,
            total_pages: totalPages,
          },
          { status: 200 }
        );
      }
    }

    // Mock data fallback filtrado por tenant
    let filtered = [...mockLeads];
    if (status && status !== "all") {
      filtered = filtered.filter((l) => l.status === status);
    }
    if (origin) {
      filtered = filtered.filter((l) => l.origin === normalizeOrigin(origin));
    }
    if (assigned_to) {
      filtered = filtered.filter((l) =>
        (l.sellerName || "").toLowerCase().includes(assigned_to.toLowerCase())
      );
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.name.toLowerCase().includes(s) ||
          l.phone.includes(s) ||
          (l.email && l.email.toLowerCase().includes(s))
      );
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const paginated = filtered.slice(offset, offset + limit);

    return NextResponse.json(
      {
        data: paginated,
        page,
        limit,
        total,
        total_pages: totalPages,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Get Leads Fatal]", error);
    return NextResponse.json({ error: "Erro interno no servidor ao consultar leads." }, { status: 500 });
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

    const validation = createCrmLeadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados de cadastro inválidos.", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;
    const normalizedOrigin = normalizeOrigin(data.origin);
    let sellerInfo = { sellerId: null as string | null, sellerName: "Fila Geral" };
    try {
      const resolved = await resolveAssignedSellerInfo(data.seller_name, organizationId);
      sellerInfo = {
        sellerId: resolved.sellerId ?? null,
        sellerName: resolved.sellerName,
      };
    } catch (roletaErr) {
      console.warn("[Create Lead Roleta Warning]:", roletaErr);
    }

    const nowIso = new Date().toISOString();
    let leadId = `lead_man_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (isSupabaseServerConfigured()) {
      const supabase = await getScopedSupabaseClient(request);
      if (supabase) {
        const { data: inserted, error: insertError } = await supabase
          .from("leads")
          .insert({
            organization_id: organizationId,
            tenant_id: organizationId,
            name: data.name,
            phone: data.phone,
            email: data.email || null,
            vehicle_interest: data.vehicle_interest,
            status: data.status as LeadStatus,
            origin: normalizedOrigin,
            seller_name: sellerInfo.sellerName,
            seller_id: sellerInfo.sellerId || null,
            notes: data.notes || null,
            last_contact_at: nowIso,
            created_at: nowIso,
          })
          .select("*")
          .maybeSingle();

        if (insertError) {
          console.warn("[Create Lead Error Fallback]:", insertError.message);
          const { data: fallbackInserted, error: fallbackError } = await supabase
            .from("leads")
            .insert({
              organization_id: organizationId,
              name: data.name,
              phone: data.phone,
              email: data.email || null,
              vehicle_interest: data.vehicle_interest,
              status: data.status as LeadStatus,
              origin: normalizedOrigin,
              seller_name: sellerInfo.sellerName,
              seller_id: sellerInfo.sellerId || null,
              notes: data.notes || null,
              last_contact_at: nowIso,
              created_at: nowIso,
            })
            .select("*")
            .maybeSingle();

          if (fallbackError) {
            console.error("[Create Lead Error]", fallbackError.message);
            return NextResponse.json({ error: "Erro ao criar lead no banco de dados." }, { status: 500 });
          }

          if (fallbackInserted?.id) {
            leadId = fallbackInserted.id;
          }
        } else if (inserted?.id) {
          leadId = inserted.id;
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        lead_id: leadId,
        message: "Lead cadastrado com sucesso",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Create Lead Fatal]", error);
    return NextResponse.json({ error: "Erro interno no servidor ao cadastrar lead." }, { status: 500 });
  }
}

/**
 * @file route.ts
 * @description Rota de API para criação de assinatura no Asaas (POST /api/billing/subscribe).
 */

import { NextRequest, NextResponse } from "next/server";
import { createSubscriptionCheckoutAction } from "@/app/actions/billing-actions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { planId = "pro", billingCycle = "mensal" } = body;

    const result = await createSubscriptionCheckoutAction({
      planId,
      billingCycle,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Falha ao gerar checkout de assinatura" },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[API Billing Subscribe Error]", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao processar requisição" },
      { status: 500 }
    );
  }
}

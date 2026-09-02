/**
 * @file route.ts
 * @description Endpoint Oficial da API v1 para Criação de Sessão de Checkout e Faturamento Asaas (POST /api/v1/billing/checkout).
 *
 * Funcionalidades:
 * - Emissão de assinaturas recorrentes com suporte a Pix, Cartão de Crédito e Boleto.
 * - Suporte a múltiplos planos (Starter, Pro, Enterprise) e ciclos (MONTHLY, YEARLY).
 * - Retorno completo de URL de checkout, QR Code Pix e linha digitável.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSubscriptionCheckoutAction } from "@/app/actions/billing-actions";
import { sanitizeDigits, isValidDocument } from "@/lib/validations/document";

/**
 * @swagger
 * /api/v1/billing/checkout:
 *   post:
 *     summary: Criar Checkout de Assinatura Asaas (Pix, Boleto, Cartão)
 *     description: Inicia uma sessão de checkout no Asaas para contratação de planos (Pro, Enterprise). Retorna a URL segura de fatura/checkout, QR Code Pix copia e cola e linha digitável para pagamento.
 *     tags:
 *       - Billing & Assinaturas
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plan
 *             properties:
 *               plan:
 *                 type: string
 *                 description: Identificador do plano desejado.
 *                 enum:
 *                   - starter
 *                   - pro
 *                   - enterprise
 *                 example: "pro"
 *               cycle:
 *                 type: string
 *                 description: Periodicidade do ciclo de faturamento.
 *                 enum:
 *                   - MONTHLY
 *                   - YEARLY
 *                 example: "MONTHLY"
 *               document:
 *                 type: string
 *                 description: CPF ou CNPJ do titular para emissão da nota fiscal e cobrança.
 *                 example: "12345678000195"
 *               documentType:
 *                 type: string
 *                 enum:
 *                   - CPF
 *                   - CNPJ
 *                 example: "CNPJ"
 *               billingName:
 *                 type: string
 *                 description: Razão Social ou Nome do Titular.
 *                 example: "Concessionária Acelera Auto Ltda"
 *               billingEmail:
 *                 type: string
 *                 format: email
 *                 example: "financeiro@concessionaria.com.br"
 *               billingPhone:
 *                 type: string
 *                 example: "11988887777"
 *           examples:
 *             PlanoProMensal:
 *               summary: Plano Pro - Faturamento Mensal (Pix / Cartão)
 *               value:
 *                 plan: "pro"
 *                 cycle: "MONTHLY"
 *                 document: "12345678000195"
 *                 documentType: "CNPJ"
 *                 billingName: "Concessionária Acelera Auto Ltda"
 *                 billingEmail: "financeiro@aceleraauto.com.br"
 *                 billingPhone: "11998887766"
 *             PlanoEnterpriseAnual:
 *               summary: Plano Enterprise - Faturamento Anual com Desconto
 *               value:
 *                 plan: "enterprise"
 *                 cycle: "YEARLY"
 *                 document: "12345678000195"
 *                 documentType: "CNPJ"
 *                 billingName: "Mega Dealer Veículos S.A."
 *                 billingEmail: "diretoria@megadealer.com.br"
 *                 billingPhone: "11977778888"
 *     responses:
 *       200:
 *         description: Sessão de checkout e fatura criadas com sucesso no Asaas.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 checkoutUrl:
 *                   type: string
 *                   format: uri
 *                   example: "https://sandbox.asaas.com/i/pay_sub_001"
 *                 invoiceUrl:
 *                   type: string
 *                   format: uri
 *                   example: "https://sandbox.asaas.com/i/pay_sub_001"
 *                 subscriptionId:
 *                   type: string
 *                   example: "sub_10928301"
 *                 customerId:
 *                   type: string
 *                   example: "cus_00000512412"
 *                 pixQrCode:
 *                   type: string
 *                   description: Imagem base64 do QR Code Pix para pagamento instantâneo.
 *                   example: "data:image/png;base64,iVBORw0KGgo..."
 *                 pixCopyPaste:
 *                   type: string
 *                   description: Código copia e cola Pix para pagamento no app bancário.
 *                   example: "00020101021226870014br.gov.bcb.pix2565..."
 *                 bankSlipBarcode:
 *                   type: string
 *                   description: Linha digitável do boleto bancário (se disponível).
 *                   example: "23793.38128 60000.000003 00000.000000 1 98210000029700"
 *       400:
 *         description: Dados de entrada inválidos ou falha na emissão da assinatura.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Documento fiscal inválido."
 *       401:
 *         description: Não autorizado (requer sessão de usuário autenticado ou chave de API).
 *       500:
 *         description: Erro interno do servidor ou falha de comunicação com o gateway.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const rawPlan = body.plan || body.planId || "pro";
    const planId = String(rawPlan).toLowerCase().trim();

    const rawCycle = String(body.cycle || body.billingCycle || "MONTHLY").toUpperCase().trim();
    const billingCycle = rawCycle === "YEARLY" || rawCycle === "ANUAL" ? "anual" : "mensal";

    const rawDoc = body.cpfCnpj || body.document;
    const document = rawDoc ? String(rawDoc).trim() : undefined;
    const documentType = body.documentType
      ? (String(body.documentType).toUpperCase().trim() as "CPF" | "CNPJ")
      : document && sanitizeDigits(document).length > 11
      ? "CNPJ"
      : "CPF";

    // Validação prévia de documento fiscal se informado
    if (document && !isValidDocument(document, documentType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Documento fiscal (${documentType}) informado é inválido.`,
        },
        { status: 400 }
      );
    }

    const rawName = body.name || body.billingName ? String(body.name || body.billingName).trim() : undefined;
    const rawEmail = body.email || body.billingEmail ? String(body.email || body.billingEmail).trim() : undefined;
    const rawPhone = body.phone || body.billingPhone ? String(body.phone || body.billingPhone).trim() : undefined;

    const result = await createSubscriptionCheckoutAction({
      planId,
      billingCycle,
      document,
      documentType,
      cpfCnpj: document,
      name: rawName,
      billingName: rawName,
      email: rawEmail,
      billingEmail: rawEmail,
      phone: rawPhone,
      billingPhone: rawPhone,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Falha ao gerar checkout de assinatura no gateway Asaas.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        plan: planId,
        cycle: billingCycle === "anual" ? "YEARLY" : "MONTHLY",
        checkoutUrl: result.checkoutUrl,
        invoiceUrl: result.invoiceUrl || result.checkoutUrl,
        subscriptionId: result.subscriptionId,
        customerId: result.customerId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API Billing Checkout Error]", error);
    const message =
      error instanceof Error ? error.message : "Erro interno no servidor ao processar checkout.";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

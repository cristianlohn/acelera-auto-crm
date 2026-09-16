/**
 * @file route.ts
 * @description Endpoint da API v1 para Webhooks do Asaas (/api/v1/webhooks/asaas).
 * Delega o processamento diretamente para o handler oficial de produção em /api/webhooks/asaas.
 */

/**
 * @swagger
 * /api/v1/webhooks/asaas:
 *   post:
 *     summary: Webhook de Cobranças e Assinaturas Asaas
 *     description: Endpoint de recepção assíncrona de notificações de pagamento e ciclo de vida de assinaturas do gateway Asaas (Pix, Boleto e Cartão de Crédito). Valida o token de segurança no header 'asaas-access-token' e atualiza a organização de forma idempotente.
 *     tags:
 *       - Billing & Assinaturas
 *     parameters:
 *       - in: header
 *         name: asaas-access-token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token de autenticação secreto configurado na conta Asaas.
 *         example: "$aact_YTU5YTE0M2M6N2Nm...exemplo"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event
 *             properties:
 *               id:
 *                 type: string
 *                 example: "evt_001"
 *               event:
 *                 type: string
 *                 description: Tipo do evento disparado pelo gateway Asaas.
 *                 enum:
 *                   - PAYMENT_CONFIRMED
 *                   - PAYMENT_RECEIVED
 *                   - PAYMENT_OVERDUE
 *                   - PAYMENT_DELETED
 *                   - PAYMENT_REFUNDED
 *                   - PAYMENT_RESTORED
 *                   - INVOICE_SYNCHRONIZED
 *                   - INVOICE_FAILED
 *                 example: "PAYMENT_CONFIRMED"
 *     responses:
 *       200:
 *         description: Evento do webhook processado com sucesso.
 *       400:
 *         description: Payload malformado ou ausência do campo 'event'.
 *       401:
 *         description: Token de autenticação asaas-access-token ausente ou inválido.
 */

export { POST } from "@/app/api/webhooks/asaas/route";

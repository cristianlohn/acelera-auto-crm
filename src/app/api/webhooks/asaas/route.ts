/**
 * @file route.ts
 * @description Rota legada de Webhooks do Asaas (POST /api/webhooks/asaas).
 * Redireciona a execução diretamente para o endpoint canônico /api/v1/webhooks/asaas.
 */

export { POST } from "@/app/api/v1/webhooks/asaas/route";

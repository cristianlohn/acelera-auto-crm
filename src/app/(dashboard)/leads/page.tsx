/**
 * @file page.tsx  –  /leads
 * @description Redirecionamento canônico para a rota oficial do Funil de Vendas (/dashboard/leads).
 */

import { redirect } from "next/navigation";

export default function LeadsRedirectPage() {
  redirect("/dashboard/leads");
}


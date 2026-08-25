/**
 * @file page.tsx  –  /
 * @description Redireciona a raiz da aplicação para o Funil de Vendas (/leads).
 */

import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/leads");
}

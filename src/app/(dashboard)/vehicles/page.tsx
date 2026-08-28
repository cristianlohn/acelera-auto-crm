/**
 * @file page.tsx  –  /vehicles (Estoque)
 * @description Página de Gestão de Estoque de Veículos do Acelera Auto CRM (Server Component).
 *
 * Busca a listagem de veículos diretamente no servidor antes da renderização (0ms de atraso visual)
 * e hidrata o VehiclesPageClient.
 */

import React from "react";
import { Metadata } from "next";
import { getVehicles } from "@/app/actions/vehicles";
import { VehiclesPageClient } from "@/components/vehicles/vehicles-page-client";

export const metadata: Metadata = {
  title: "Estoque de Veículos | Acelera Auto CRM",
  description:
    "Gestão e visualização de estoque de seminovos e 0km da concessionária.",
};

export default async function VehiclesPage() {
  const vehicles = await getVehicles();

  return <VehiclesPageClient initialVehicles={vehicles} />;
}

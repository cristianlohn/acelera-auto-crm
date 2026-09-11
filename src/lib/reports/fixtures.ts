/**
 * @file fixtures.ts
 * @description Fixtures e dados simulados para o Modo Demonstração de Relatórios Executivos.
 */

import type {
  ReportPeriod,
  PeriodOption,
  ExecutiveReportData,
} from "./types";

export const PERIOD_OPTIONS: PeriodOption[] = [
  { id: "7d", label: "7 dias" },
  { id: "month", label: "Este Mês" },
  { id: "quarter", label: "Trimestre" },
  { id: "year", label: "Ano" },
];

export const PERIOD_METRICS: Record<ReportPeriod, ExecutiveReportData> = {
  "7d": {
    kpis: {
      revenue: 108000,
      revenueGrowth: 18.4,
      conversionRate: 12.5,
      conversionGrowth: 2.1,
      averageTicket: 108000,
      ticketGrowth: 4.8,
      avgResponseMinutes: 9,
      responseDiffMinutes: -2,
    },
    funnel: [
      { id: "novo", name: "Novo Lead", count: 1, percentage: 100, conversionFromPrev: 100 },
      { id: "primeiro_contato", name: "Primeiro Contato", count: 1, percentage: 87.5, conversionFromPrev: 87.5 },
      { id: "em_negociacao", name: "Em Negociação", count: 1, percentage: 75.0, conversionFromPrev: 85.7 },
      { id: "visita_agendada", name: "Visita Agendada", count: 1, percentage: 62.5, conversionFromPrev: 83.3 },
      { id: "proposta", name: "Proposta Enviada", count: 1, percentage: 50.0, conversionFromPrev: 80.0 },
      { id: "financiamento", name: "Financiamento / F&I", count: 1, percentage: 37.5, conversionFromPrev: 75.0 },
      { id: "fechado", name: "Venda Concluída", count: 1, percentage: 25.0, conversionFromPrev: 66.7 },
      { id: "perdido", name: "Oportunidade Perdida", count: 1, percentage: 12.5, conversionFromPrev: 50.0 },
    ],
    channels: [
      { channel: "Instagram Ads", leadsCount: 2, dealsCount: 1, conversionRate: 50.0, share: 25.0, color: "bg-pink-500" },
      { channel: "Webmotors", leadsCount: 2, dealsCount: 0, conversionRate: 0.0, share: 25.0, color: "bg-red-500" },
      { channel: "Site / Google", leadsCount: 1, dealsCount: 0, conversionRate: 0.0, share: 12.5, color: "bg-blue-500" },
      { channel: "Indicação", leadsCount: 1, dealsCount: 0, conversionRate: 0.0, share: 12.5, color: "bg-amber-500" },
      { channel: "Showroom / Pátio", leadsCount: 1, dealsCount: 0, conversionRate: 0.0, share: 12.5, color: "bg-purple-500" },
      { channel: "OLX", leadsCount: 1, dealsCount: 0, conversionRate: 0.0, share: 12.5, color: "bg-orange-500" },
    ],
    sellers: [
      { id: "sp-002", name: "Amanda Souza", avatar: "AS", dealsCount: 1, revenue: 108000, avgResponseMinutes: 8, conversionRate: 25.0 },
      { id: "sp-001", name: "Rafael Martins", avatar: "RM", dealsCount: 0, revenue: 0, avgResponseMinutes: 10, conversionRate: 0.0 },
    ],
    topVehicles: [
      { make: "Chevrolet", model: "Tracker Premier", version: "2022 1.2 Turbo Aut.", unitsSold: 1, totalRevenue: 108000, avgDaysToSell: 14 },
    ],
    lostReasons: [
      { reason: "comprou_concorrente", label: "Comprou no Concorrente", count: 1, percentage: 100 },
    ],
  },
  month: {
    kpis: {
      revenue: 108000,
      revenueGrowth: 18.4,
      conversionRate: 12.5,
      conversionGrowth: 2.1,
      averageTicket: 108000,
      ticketGrowth: 4.8,
      avgResponseMinutes: 9,
      responseDiffMinutes: -2,
    },
    funnel: [
      { id: "novo", name: "Novo Lead", count: 1, percentage: 100, conversionFromPrev: 100 },
      { id: "primeiro_contato", name: "Primeiro Contato", count: 1, percentage: 87.5, conversionFromPrev: 87.5 },
      { id: "em_negociacao", name: "Em Negociação", count: 1, percentage: 75.0, conversionFromPrev: 85.7 },
      { id: "visita_agendada", name: "Visita Agendada", count: 1, percentage: 62.5, conversionFromPrev: 83.3 },
      { id: "proposta", name: "Proposta Enviada", count: 1, percentage: 50.0, conversionFromPrev: 80.0 },
      { id: "financiamento", name: "Financiamento / F&I", count: 1, percentage: 37.5, conversionFromPrev: 75.0 },
      { id: "fechado", name: "Venda Concluída", count: 1, percentage: 25.0, conversionFromPrev: 66.7 },
      { id: "perdido", name: "Oportunidade Perdida", count: 1, percentage: 12.5, conversionFromPrev: 50.0 },
    ],
    channels: [
      { channel: "Instagram Ads", leadsCount: 2, dealsCount: 1, conversionRate: 50.0, share: 25.0, color: "bg-pink-500" },
      { channel: "Webmotors", leadsCount: 2, dealsCount: 0, conversionRate: 0.0, share: 25.0, color: "bg-red-500" },
      { channel: "Site / Google", leadsCount: 1, dealsCount: 0, conversionRate: 0.0, share: 12.5, color: "bg-blue-500" },
      { channel: "Indicação", leadsCount: 1, dealsCount: 0, conversionRate: 0.0, share: 12.5, color: "bg-amber-500" },
      { channel: "Showroom / Pátio", leadsCount: 1, dealsCount: 0, conversionRate: 0.0, share: 12.5, color: "bg-purple-500" },
      { channel: "OLX", leadsCount: 1, dealsCount: 0, conversionRate: 0.0, share: 12.5, color: "bg-orange-500" },
    ],
    sellers: [
      { id: "sp-002", name: "Amanda Souza", avatar: "AS", dealsCount: 1, revenue: 108000, avgResponseMinutes: 8, conversionRate: 25.0 },
      { id: "sp-001", name: "Rafael Martins", avatar: "RM", dealsCount: 0, revenue: 0, avgResponseMinutes: 10, conversionRate: 0.0 },
    ],
    topVehicles: [
      { make: "Chevrolet", model: "Tracker Premier", version: "2022 1.2 Turbo Aut.", unitsSold: 1, totalRevenue: 108000, avgDaysToSell: 14 },
    ],
    lostReasons: [
      { reason: "comprou_concorrente", label: "Comprou no Concorrente", count: 1, percentage: 100 },
    ],
  },
  quarter: {
    kpis: {
      revenue: 5420000,
      revenueGrowth: 24.6,
      conversionRate: 14.8,
      conversionGrowth: 3.4,
      averageTicket: 100370.37,
      ticketGrowth: 6.1,
      avgResponseMinutes: 21,
      responseDiffMinutes: -6,
    },
    funnel: [
      { id: "novo", name: "Novo Lead", count: 365, percentage: 100, conversionFromPrev: 100 },
      { id: "atendimento", name: "Em Atendimento", count: 295, percentage: 80.8, conversionFromPrev: 80.8 },
      { id: "visita", name: "Visita / Test-Drive", count: 142, percentage: 38.9, conversionFromPrev: 48.1 },
      { id: "proposta", name: "Proposta", count: 88, percentage: 24.1, conversionFromPrev: 62.0 },
      { id: "fechado", name: "Venda Fechada", count: 54, percentage: 14.8, conversionFromPrev: 61.4 },
    ],
    channels: [
      { channel: "WhatsApp", leadsCount: 168, dealsCount: 32, conversionRate: 19.0, share: 46.0, color: "bg-emerald-500" },
      { channel: "Instagram", leadsCount: 92, dealsCount: 11, conversionRate: 12.0, share: 25.2, color: "bg-pink-500" },
      { channel: "Site Próprio", leadsCount: 55, dealsCount: 6, conversionRate: 10.9, share: 15.1, color: "bg-blue-500" },
      { channel: "OLX", leadsCount: 32, dealsCount: 3, conversionRate: 9.4, share: 8.8, color: "bg-orange-500" },
      { channel: "Indicação", leadsCount: 18, dealsCount: 2, conversionRate: 11.1, share: 4.9, color: "bg-amber-500" },
    ],
    sellers: [
      { id: "s1", name: "Rafael Alves", avatar: "RA", dealsCount: 24, revenue: 2850000, avgResponseMinutes: 13, conversionRate: 23.5 },
      { id: "s2", name: "Camila Dias", avatar: "CD", dealsCount: 16, revenue: 1620000, avgResponseMinutes: 18, conversionRate: 16.1 },
      { id: "s3", name: "Lucas Santana", avatar: "LS", dealsCount: 9, revenue: 710000, avgResponseMinutes: 22, conversionRate: 11.8 },
      { id: "s4", name: "Beatriz Rocha", avatar: "BR", dealsCount: 5, revenue: 240000, avgResponseMinutes: 29, conversionRate: 8.3 },
    ],
    topVehicles: [
      { make: "Honda", model: "Civic", version: "EXL 2.0 CVT", unitsSold: 12, totalRevenue: 1798800, avgDaysToSell: 11 },
      { make: "Toyota", model: "Corolla Cross", version: "XRE 2.0", unitsSold: 9, totalRevenue: 1520100, avgDaysToSell: 16 },
      { make: "Jeep", model: "Compass", version: "Longitude 1.3 T", unitsSold: 8, totalRevenue: 1079200, avgDaysToSell: 20 },
    ],
  },
  year: {
    kpis: {
      revenue: 19800000,
      revenueGrowth: 31.2,
      conversionRate: 15.4,
      conversionGrowth: 4.2,
      averageTicket: 90825.69,
      ticketGrowth: 7.9,
      avgResponseMinutes: 20,
      responseDiffMinutes: -8,
    },
    funnel: [
      { id: "novo", name: "Novo Lead", count: 1420, percentage: 100, conversionFromPrev: 100 },
      { id: "atendimento", name: "Em Atendimento", count: 1150, percentage: 81.0, conversionFromPrev: 81.0 },
      { id: "visita", name: "Visita / Test-Drive", count: 560, percentage: 39.4, conversionFromPrev: 48.7 },
      { id: "proposta", name: "Proposta", count: 345, percentage: 24.3, conversionFromPrev: 61.6 },
      { id: "fechado", name: "Venda Fechada", count: 218, percentage: 15.4, conversionFromPrev: 63.2 },
    ],
    channels: [
      { channel: "WhatsApp", leadsCount: 650, dealsCount: 128, conversionRate: 19.7, share: 45.8, color: "bg-emerald-500" },
      { channel: "Instagram", leadsCount: 360, dealsCount: 44, conversionRate: 12.2, share: 25.4, color: "bg-pink-500" },
      { channel: "Site Próprio", leadsCount: 215, dealsCount: 25, conversionRate: 11.6, share: 15.1, color: "bg-blue-500" },
      { channel: "OLX", leadsCount: 125, dealsCount: 12, conversionRate: 9.6, share: 8.8, color: "bg-orange-500" },
      { channel: "Indicação", leadsCount: 70, dealsCount: 9, conversionRate: 12.9, share: 4.9, color: "bg-amber-500" },
    ],
    sellers: [
      { id: "s1", name: "Rafael Alves", avatar: "RA", dealsCount: 94, revenue: 10500000, avgResponseMinutes: 12, conversionRate: 24.1 },
      { id: "s2", name: "Camila Dias", avatar: "CD", dealsCount: 65, revenue: 6100000, avgResponseMinutes: 17, conversionRate: 16.8 },
      { id: "s3", name: "Lucas Santana", avatar: "LS", dealsCount: 38, revenue: 2350000, avgResponseMinutes: 21, conversionRate: 12.2 },
      { id: "s4", name: "Beatriz Rocha", avatar: "BR", dealsCount: 21, revenue: 850000, avgResponseMinutes: 28, conversionRate: 8.9 },
    ],
    topVehicles: [
      { make: "Honda", model: "Civic", version: "EXL 2.0 CVT", unitsSold: 42, totalRevenue: 6295800, avgDaysToSell: 10 },
      { make: "Toyota", model: "Corolla Cross", version: "XRE 2.0", unitsSold: 34, totalRevenue: 5742600, avgDaysToSell: 15 },
      { make: "Jeep", model: "Compass", version: "Longitude 1.3 T", unitsSold: 28, totalRevenue: 3777200, avgDaysToSell: 18 },
    ],
  },
};

export const EMPTY_METRICS: ExecutiveReportData = {
  kpis: {
    revenue: 0,
    revenueGrowth: 0,
    conversionRate: 0,
    conversionGrowth: 0,
    averageTicket: 0,
    ticketGrowth: 0,
    avgResponseMinutes: 0,
    responseDiffMinutes: 0,
  },
  funnel: [
    { id: "novo", name: "Novo Lead", count: 0, percentage: 0, conversionFromPrev: 0 },
    { id: "atendimento", name: "Em Atendimento", count: 0, percentage: 0, conversionFromPrev: 0 },
    { id: "visita", name: "Visita / Test-Drive", count: 0, percentage: 0, conversionFromPrev: 0 },
    { id: "proposta", name: "Proposta", count: 0, percentage: 0, conversionFromPrev: 0 },
    { id: "fechado", name: "Venda Fechada", count: 0, percentage: 0, conversionFromPrev: 0 },
  ],
  channels: [],
  sellers: [],
  topVehicles: [],
};

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
      revenue: 449700,
      revenueGrowth: 12.5,
      conversionRate: 15.8,
      conversionGrowth: 1.8,
      averageTicket: 149900,
      ticketGrowth: 3.2,
      avgResponseMinutes: 14,
      responseDiffMinutes: -3,
    },
    funnel: [
      { id: "novo", name: "Novo Lead", count: 38, percentage: 100, conversionFromPrev: 100 },
      { id: "atendimento", name: "Em Atendimento", count: 31, percentage: 81.6, conversionFromPrev: 81.6 },
      { id: "visita", name: "Visita / Test-Drive", count: 14, percentage: 36.8, conversionFromPrev: 45.2 },
      { id: "proposta", name: "Proposta", count: 9, percentage: 23.7, conversionFromPrev: 64.3 },
      { id: "fechado", name: "Venda Fechada", count: 6, percentage: 15.8, conversionFromPrev: 66.7 },
    ],
    channels: [
      { channel: "WhatsApp", leadsCount: 18, dealsCount: 4, conversionRate: 22.2, share: 47.4, color: "bg-emerald-500" },
      { channel: "Instagram", leadsCount: 10, dealsCount: 1, conversionRate: 10.0, share: 26.3, color: "bg-pink-500" },
      { channel: "Site Oficial", leadsCount: 6, dealsCount: 1, conversionRate: 16.7, share: 15.8, color: "bg-blue-500" },
      { channel: "Indicação", leadsCount: 4, dealsCount: 0, conversionRate: 0.0, share: 10.5, color: "bg-amber-500" },
    ],
    sellers: [
      { id: "s1", name: "Rafael Alves", avatar: "RA", dealsCount: 3, revenue: 299800, avgResponseMinutes: 11, conversionRate: 21.4 },
      { id: "s2", name: "Camila Dias", avatar: "CD", dealsCount: 2, revenue: 149900, avgResponseMinutes: 16, conversionRate: 16.7 },
      { id: "s3", name: "Lucas Santana", avatar: "LS", dealsCount: 1, revenue: 89900, avgResponseMinutes: 18, conversionRate: 12.5 },
    ],
    topVehicles: [
      { make: "Honda", model: "Civic", version: "EXL 2.0 CVT", unitsSold: 2, totalRevenue: 299800, avgDaysToSell: 14 },
      { make: "Toyota", model: "Corolla Cross", version: "XRE 2.0", unitsSold: 1, totalRevenue: 168900, avgDaysToSell: 19 },
    ],
  },
  month: {
    kpis: {
      revenue: 1845000,
      revenueGrowth: 18.4,
      conversionRate: 14.2,
      conversionGrowth: 2.1,
      averageTicket: 153750,
      ticketGrowth: 4.8,
      avgResponseMinutes: 18,
      responseDiffMinutes: -4,
    },
    funnel: [
      { id: "novo", name: "Novo Lead", count: 120, percentage: 100, conversionFromPrev: 100 },
      { id: "atendimento", name: "Em Atendimento", count: 98, percentage: 81.7, conversionFromPrev: 81.7 },
      { id: "visita", name: "Visita / Test-Drive", count: 45, percentage: 37.5, conversionFromPrev: 45.9 },
      { id: "proposta", name: "Proposta", count: 28, percentage: 23.3, conversionFromPrev: 62.2 },
      { id: "fechado", name: "Venda Fechada", count: 17, percentage: 14.2, conversionFromPrev: 60.7 },
    ],
    channels: [
      { channel: "WhatsApp", leadsCount: 54, dealsCount: 10, conversionRate: 18.5, share: 45.0, color: "bg-emerald-500" },
      { channel: "Instagram", leadsCount: 30, dealsCount: 3, conversionRate: 10.0, share: 25.0, color: "bg-pink-500" },
      { channel: "Site Oficial", leadsCount: 18, dealsCount: 2, conversionRate: 11.1, share: 15.0, color: "bg-blue-500" },
      { channel: "OLX", leadsCount: 12, dealsCount: 1, conversionRate: 8.3, share: 10.0, color: "bg-orange-500" },
      { channel: "Indicação", leadsCount: 6, dealsCount: 1, conversionRate: 16.7, share: 5.0, color: "bg-amber-500" },
    ],
    sellers: [
      { id: "s1", name: "Rafael Alves", avatar: "RA", dealsCount: 8, revenue: 980000, avgResponseMinutes: 12, conversionRate: 22.8 },
      { id: "s2", name: "Camila Dias", avatar: "CD", dealsCount: 5, revenue: 520000, avgResponseMinutes: 19, conversionRate: 15.2 },
      { id: "s3", name: "Lucas Santana", avatar: "LS", dealsCount: 3, revenue: 245000, avgResponseMinutes: 24, conversionRate: 11.5 },
      { id: "s4", name: "Beatriz Rocha", avatar: "BR", dealsCount: 1, revenue: 100000, avgResponseMinutes: 32, conversionRate: 7.1 },
    ],
    topVehicles: [
      { make: "Honda", model: "Civic", version: "EXL 2.0 CVT", unitsSold: 4, totalRevenue: 599600, avgDaysToSell: 12 },
      { make: "Toyota", model: "Corolla Cross", version: "XRE 2.0", unitsSold: 3, totalRevenue: 506700, avgDaysToSell: 18 },
      { make: "Jeep", model: "Compass", version: "Longitude 1.3 T", unitsSold: 3, totalRevenue: 404700, avgDaysToSell: 22 },
      { make: "Fiat", model: "Strada", version: "Volcano 1.3 CD", unitsSold: 2, totalRevenue: 220000, avgDaysToSell: 9 },
    ],
  },
  quarter: {
    kpis: {
      revenue: 5420000,
      revenueGrowth: 24.6,
      conversionRate: 14.8,
      conversionGrowth: 3.4,
      averageTicket: 150555,
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
      { channel: "Site Oficial", leadsCount: 55, dealsCount: 6, conversionRate: 10.9, share: 15.1, color: "bg-blue-500" },
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
      averageTicket: 148872,
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
      { channel: "Site Oficial", leadsCount: 215, dealsCount: 25, conversionRate: 11.6, share: 15.1, color: "bg-blue-500" },
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

/**
 * @file team-status.ts
 * @description Helpers para persistência em memória e cookie de status de plantão (roleta).
 */

export const ROULETTE_STATUS_COOKIE = "acelera_roulette_status_v1";

declare global {
  var __acelera_roulette_status_map: Map<string, boolean> | undefined;
}

export function getRouletteStatusMap(): Map<string, boolean> {
  if (!globalThis.__acelera_roulette_status_map) {
    globalThis.__acelera_roulette_status_map = new Map<string, boolean>();
  }
  return globalThis.__acelera_roulette_status_map;
}

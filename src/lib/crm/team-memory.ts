/**
 * @file team-memory.ts
 * @description Armazenamento em memória dos membros da equipe para modo demo e offline.
 */

import { DEMO_SELLERS } from "@/lib/demo/demo-dataset";
import type { TeamMember } from "@/types/team";

export const memoryTeamMembers: TeamMember[] = [...DEMO_SELLERS];

export function resetMemoryTeamMembers(): void {
  memoryTeamMembers.length = 0;
  memoryTeamMembers.push(...DEMO_SELLERS.map((m) => ({ ...m })));
}

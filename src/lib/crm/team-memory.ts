/**
 * @file team-memory.ts
 * @description Armazenamento em memória dos membros da equipe para modo demo e offline.
 */

import { getDemoDataset } from "@/lib/demo/demo-dataset";
import type { TeamMember } from "@/types/team";

export const memoryTeamMembers: TeamMember[] = [...getDemoDataset().sellers];

export function resetMemoryTeamMembers(): void {
  const freshSellers = getDemoDataset(Date.now()).sellers;
  memoryTeamMembers.length = 0;
  memoryTeamMembers.push(...freshSellers.map((m) => ({ ...m })));
}

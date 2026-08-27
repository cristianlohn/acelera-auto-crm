/**
 * @file team-schema.ts
 * @description Re-exportação e compatibilidade para schemas e tipagens de equipe.
 */

export {
  salespersonFormSchema,
  salespersonFormSchema as salespersonSchema,
  updateSalespersonSchema,
  type SalespersonFormData,
  type SalespersonFormData as SalespersonInput,
  type SalespersonFormData as SalespersonOutput,
  type UpdateSalespersonFormData,
} from "@/lib/validations/team";

export type {
  TeamMember,
  TeamMember as SalespersonMember,
  TeamRole,
  TeamSegment,
  TeamMemberStatus,
  TeamSummaryMetrics,
} from "@/types/team";

export interface CreateSalespersonResult {
  success: boolean;
  member?: import("@/types/team").TeamMember;
  error?: string;
}

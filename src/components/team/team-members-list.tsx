/**
 * @file team-members-list.tsx
 * @description Lista e gerenciamento visual de colaboradores com diálogo de confirmação AlertDialog.
 */

"use client";

import React from "react";
import { Mail, Phone, ShieldCheck, UserCheck } from "lucide-react";
import { MemberRowActions } from "@/components/team/member-row-actions";
import type { TeamMember } from "@/types/team";

export interface TeamMembersListProps {
  members: TeamMember[];
  onMemberDeleted?: (memberId: string) => void;
}

export function TeamMembersList({ members, onMemberDeleted }: TeamMembersListProps) {
  if (members.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#121216] p-8 text-center text-zinc-400 text-xs">
        Nenhum colaborador cadastrado.
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="team-members-list">
      {members.map((member) => {
        const isOwner =
          (member.role as string) === "admin" ||
          (member.role as string) === "owner" ||
          Boolean((member as { isOwner?: boolean }).isOwner);

        return (
          <div
            key={member.id}
            className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-[#121216] text-white"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{member.name || member.email}</span>
                {isOwner && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 text-[10px] font-bold">
                    <ShieldCheck className="h-3 w-3" />
                    Proprietário
                  </span>
                )}
                {member.status === "active" && !isOwner && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold">
                    <UserCheck className="h-3 w-3" />
                    Ativo
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-zinc-500" />
                  {member.email}
                </span>
                {member.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-zinc-500" />
                    {member.phone}
                  </span>
                )}
              </div>
            </div>

            <div>
              <MemberRowActions member={member} onDeleted={onMemberDeleted} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

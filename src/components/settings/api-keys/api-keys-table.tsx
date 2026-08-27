/**
 * @file api-keys-table.tsx
 * @description Tabela de listagem e controle de Chaves de API com status e ação de revogação.
 */

"use client";

import React, { useState } from "react";
import { Key, Trash2, CheckCircle2, XCircle } from "lucide-react";
import type { ApiKey } from "@/types/api-key";

interface ApiKeysTableProps {
  apiKeys: ApiKey[];
  onRevokeKey: (keyId: string) => void;
  isRevokingId?: string | null;
}

function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return "Nunca utilizada";
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ApiKeysTable({ apiKeys, onRevokeKey, isRevokingId }: ApiKeysTableProps) {
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  return (
    <div
      data-testid="api-keys-table"
      className="rounded-3xl bg-zinc-900/80 border border-white/10 overflow-hidden backdrop-blur-md shadow-xl"
    >
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Key className="h-4 w-4 text-orange-400" />
            <span>Chaves de API Geradas</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Gerencie as credenciais com acesso de escrita no endpoint de ingestão.
          </p>
        </div>

        <div className="text-xs font-semibold text-zinc-400">
          <span className="text-white font-bold">{apiKeys.filter((k) => k.is_active).length}</span> ativas /{" "}
          <span>{apiKeys.length}</span> total
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-950/60 text-zinc-400 font-semibold border-b border-white/10 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-5 py-3">Nome da Chave</th>
              <th className="px-5 py-3">Prefixo</th>
              <th className="px-5 py-3">Criada em</th>
              <th className="px-5 py-3">Último Uso</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {apiKeys.map((key) => {
              const isActive = key.is_active && !key.revoked_at;
              const isConfirming = confirmRevokeId === key.id;

              return (
                <tr
                  key={key.id}
                  className="hover:bg-white/[0.02] transition-colors"
                  data-testid={`row-key-${key.id}`}
                >
                  {/* Nome da Chave */}
                  <td className="px-5 py-4">
                    <div className="font-bold text-white truncate max-w-[220px]">
                      {key.name}
                    </div>
                  </td>

                  {/* Prefixo */}
                  <td className="px-5 py-4">
                    <code className="font-mono text-zinc-300 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                      {key.key_prefix}
                    </code>
                  </td>

                  {/* Criada em */}
                  <td className="px-5 py-4 text-zinc-400 whitespace-nowrap">
                    {formatDateBR(key.created_at)}
                  </td>

                  {/* Último Uso */}
                  <td className="px-5 py-4 text-zinc-400 whitespace-nowrap">
                    {formatDateBR(key.last_used_at)}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    {isActive ? (
                      <span
                        data-testid={`badge-status-${key.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 font-bold text-[11px]"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Ativa</span>
                      </span>
                    ) : (
                      <span
                        data-testid={`badge-status-${key.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 px-2.5 py-0.5 font-medium text-[11px]"
                      >
                        <XCircle className="h-3 w-3" />
                        <span>Revogada</span>
                      </span>
                    )}
                  </td>

                  {/* Ações */}
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    {isActive ? (
                      isConfirming ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              onRevokeKey(key.id);
                              setConfirmRevokeId(null);
                            }}
                            data-testid={`btn-confirm-revoke-${key.id}`}
                            className="rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-1 text-[11px] transition-colors"
                          >
                            Sim, Revogar
                          </button>
                          <button
                            onClick={() => setConfirmRevokeId(null)}
                            className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 text-[11px] transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmRevokeId(key.id)}
                          data-testid={`btn-revoke-key-${key.id}`}
                          disabled={isRevokingId === key.id}
                          className="inline-flex items-center gap-1 text-zinc-400 hover:text-red-400 font-semibold transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Revogar</span>
                        </button>
                      )
                    ) : (
                      <span className="text-zinc-600 text-[11px]">Inativa</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {apiKeys.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">
                  <Key className="h-8 w-8 mx-auto mb-2 opacity-40 text-orange-400" />
                  <p className="font-semibold text-zinc-300">Nenhuma Chave de API Criada</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Clique em &quot;+ Nova Chave de API&quot; acima para conectar suas ferramentas externas.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

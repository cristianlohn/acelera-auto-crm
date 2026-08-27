/**
 * @file api-keys-client.tsx
 * @description Container cliente para o gerenciamento de Chaves de API e Integrações.
 */

"use client";

import React, { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { ApiKey } from "@/types/api-key";
import { ApiKeysTable } from "./api-keys-table";
import { CreateApiKeyModal } from "./create-api-key-modal";
import { ApiKeyRevealedDialog } from "./api-key-revealed-dialog";
import { IntegrationDocsCard } from "./integration-docs-card";
import { createApiKeyAction, revokeApiKeyAction } from "@/app/actions/api-key-actions";
import { Button } from "@/components/ui/button";

interface ApiKeysClientProps {
  initialApiKeys: ApiKey[];
}

export function ApiKeysClient({ initialApiKeys }: ApiKeysClientProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(initialApiKeys);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRevokingId, setIsRevokingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Estado da chave recém-criada para revelação única
  const [revealedKeyData, setRevealedKeyData] = useState<{
    rawKey: string;
    keyName: string;
  } | null>(null);

  const handleCreateApiKey = async (payload: {
    name: string;
    expires_in_days?: number | null;
  }): Promise<boolean> => {
    const res = await createApiKeyAction(payload);
    if (!res.success || !res.rawKey || !res.key) {
      toast.error("Falha ao gerar chave de API", {
        description: res.error || "Ocorreu um erro durante a criação.",
      });
      return false;
    }

    // Adiciona a nova chave à lista local
    setApiKeys((prev) => [res.key!, ...prev]);

    // Abre o diálogo de revelação da chave bruta
    setRevealedKeyData({
      rawKey: res.rawKey,
      keyName: res.name || payload.name,
    });

    toast.success("Chave de API gerada com sucesso!");
    return true;
  };

  const handleRevokeApiKey = (keyId: string) => {
    const targetKey = apiKeys.find((k) => k.id === keyId);
    if (!targetKey) return;

    setIsRevokingId(keyId);

    // Atualização otimista
    setApiKeys((prev) =>
      prev.map((k) =>
        k.id === keyId
          ? { ...k, is_active: false, revoked_at: new Date().toISOString() }
          : k
      )
    );

    toast.success(`Chave "${targetKey.name}" foi revogada.`);

    startTransition(async () => {
      const res = await revokeApiKeyAction(keyId);
      setIsRevokingId(null);
      if (!res.success) {
        // Rollback em caso de falha
        setApiKeys((prev) =>
          prev.map((k) => (k.id === keyId ? { ...targetKey } : k))
        );
        toast.error("Falha ao revogar chave no servidor", {
          description: res.error,
        });
      }
    });
  };

  return (
    <div className="space-y-8" data-testid="api-keys-container">
      {/* Barra de Ação Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Chaves de API & Webhooks
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Crie tokens de acesso para automatizar o envio de leads a partir de fontes externas.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
          data-testid="btn-open-create-key"
          className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold rounded-2xl text-xs px-4 py-2.5 shadow-lg shadow-orange-500/20"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          <span>Nova Chave de API</span>
        </Button>
      </div>

      {/* Guia Rápido de Documentação HTTP */}
      <IntegrationDocsCard />

      {/* Tabela de Chaves de API */}
      <ApiKeysTable
        apiKeys={apiKeys}
        onRevokeKey={handleRevokeApiKey}
        isRevokingId={isRevokingId}
      />

      {/* Modal de Criação */}
      <CreateApiKeyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateApiKey}
      />

      {/* Diálogo de Revelação Única */}
      {revealedKeyData && (
        <ApiKeyRevealedDialog
          isOpen={!!revealedKeyData}
          onClose={() => setRevealedKeyData(null)}
          rawKey={revealedKeyData.rawKey}
          keyName={revealedKeyData.keyName}
        />
      )}
    </div>
  );
}

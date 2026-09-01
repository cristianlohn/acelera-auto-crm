/**
 * @file whatsapp-integration-card.tsx
 * @description Card de integração e pareamento com Evolution API v2 para WhatsApp.
 */

"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  MessageSquare,
  QrCode,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Smartphone,
  Unlink,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getWhatsAppStatusAction,
  connectWhatsAppAction,
  disconnectWhatsAppAction,
  type WhatsAppInstanceStatus,
} from "@/app/actions/whatsapp-actions";
import { cn } from "@/lib/utils";

export function WhatsAppIntegrationCard() {
  const [status, setStatus] = useState<WhatsAppInstanceStatus>("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [instanceName, setInstanceName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Consulta e sincronização de status com cleanup seguro
  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      try {
        const res = await getWhatsAppStatusAction();
        if (isMounted && res?.success) {
          setStatus(res.status);
          if (res.instanceName) setInstanceName(res.instanceName);
          if (res.qrCode) {
            setQrCode(res.qrCode);
          } else if (res.status === "connected" || res.status === "disconnected") {
            setQrCode(null);
            setPairingCode(null);
          }
        }
      } catch (err) {
        console.error("Erro ao verificar status do WhatsApp:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkStatus();

    const interval = setInterval(checkStatus, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Ação: Iniciar Conexão / Gerar QR Code
  const handleConnect = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    try {
      const res = await connectWhatsAppAction();
      if (res.success) {
        setStatus("connecting");
        setQrCode(res.qrCode || null);
        setPairingCode(res.pairingCode || null);
        setInstanceName(res.instanceName || "");
      } else {
        setErrorMessage(res.error || "Não foi possível gerar o QR Code de conexão.");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsConnecting(false);
    }
  };

  // Ação: Desconectar Instância
  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setErrorMessage(null);
    try {
      const res = await disconnectWhatsAppAction();
      if (res.success) {
        setStatus("disconnected");
        setQrCode(null);
        setPairingCode(null);
      } else {
        setErrorMessage(res.error || "Erro ao desconectar WhatsApp.");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div
      id="card-whatsapp-integration"
      className="rounded-xl border bg-card p-5 sm:p-6 shadow-sm space-y-5 transition-all"
    >
      {/* Topo do Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">
                WhatsApp da Concessionária (Evolution API v2)
              </h3>
              <span className="rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold">
                API Oficial
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Conecte o número da loja para envio automático de notificações aos vendedores quando novos leads chegarem na Roleta Comercial.
            </p>
          </div>
        </div>

        {/* Badge de Status de Conexão */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {isLoading ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground border">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Verificando...
            </span>
          ) : status === "connected" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-3 py-1 text-xs font-bold shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              Conectado
            </span>
          ) : status === "connecting" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 px-3 py-1 text-xs font-bold animate-pulse shadow-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
              Aguardando Leitura
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-500/15 text-zinc-400 border border-zinc-500/30 px-3 py-1 text-xs font-bold">
              <XCircle className="h-3.5 w-3.5 text-zinc-400" />
              Desconectado
            </span>
          )}
        </div>
      </div>

      {/* Mensagem de Erro se houver */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Erro de Conexão</p>
            <p className="text-[11px] opacity-90 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Cenário 1: Conectado com Sucesso */}
      {status === "connected" && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                Instância Ativa e Pronta para Disparo
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {instanceName ? `Instância: ${instanceName} • ` : ""}
                O disparo automático de WhatsApp está 100% operacional para alertar os consultores de plantão.
              </p>
            </div>
          </div>

          <Button
            id="btn-disconnect-whatsapp"
            type="button"
            variant="outline"
            size="sm"
            disabled={isDisconnecting}
            onClick={handleDisconnect}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-1.5 text-xs font-semibold shrink-0"
          >
            {isDisconnecting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Desconectando...</span>
              </>
            ) : (
              <>
                <Unlink className="h-3.5 w-3.5" />
                <span>Desconectar Aparelho</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Cenário 2: Aguardando leitura do QR Code (Connecting) */}
      {status === "connecting" && (
        <div className="rounded-xl border bg-muted/20 p-5 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left">
            {/* Box do QR Code */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative flex items-center justify-center rounded-xl border-2 border-dashed border-orange-500/40 bg-white p-3 shadow-md">
                {qrCode ? (
                  <Image
                    src={qrCode}
                    alt="QR Code WhatsApp"
                    width={180}
                    height={180}
                    unoptimized
                    className="rounded-lg object-contain"
                  />
                ) : (
                  <div className="flex h-[180px] w-[180px] flex-col items-center justify-center gap-2 text-zinc-400">
                    <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
                    <span className="text-[11px]">Gerando QR Code...</span>
                  </div>
                )}
              </div>

              <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                Aguardando leitura do aparelho...
              </span>
            </div>

            {/* Instruções de Pareamento */}
            <div className="max-w-md space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 justify-center md:justify-start">
                <Smartphone className="h-4 w-4 text-orange-400" />
                Como Conectar em 3 Passos:
              </h4>

              <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside text-left">
                <li>Abra o WhatsApp no seu smartphone</li>
                <li>
                  Acesse <strong>Configurações</strong> &gt; <strong>Aparelhos Conectados</strong>
                </li>
                <li>
                  Toque em <strong>Conectar um aparelho</strong> e aponte a câmera para este QR Code
                </li>
              </ol>

              {pairingCode && (
                <div className="rounded-lg border bg-card p-2.5 text-xs text-foreground">
                  <span className="text-muted-foreground text-[11px] block">Código de Pareamento:</span>
                  <code className="font-mono text-sm font-bold text-orange-400">{pairingCode}</code>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button
                  id="btn-reload-qr"
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isConnecting}
                  onClick={handleConnect}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isConnecting && "animate-spin")} />
                  <span>Recarregar QR Code</span>
                </Button>

                <Button
                  id="btn-cancel-connection"
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatus("disconnected");
                    setQrCode(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cenário 3: Desconectado */}
      {status === "disconnected" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border bg-muted/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Nenhum aparelho conectado</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Gere um QR Code para vincular o WhatsApp oficial e habilitar o alerta instantâneo da Roleta.
              </p>
            </div>
          </div>

          <Button
            id="btn-connect-whatsapp"
            type="button"
            size="sm"
            disabled={isConnecting}
            onClick={handleConnect}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shrink-0 shadow-sm"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Gerando QR Code...</span>
              </>
            ) : (
              <>
                <QrCode className="h-3.5 w-3.5" />
                <span>Conectar WhatsApp / Gerar QR Code</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * @file billing-checkout-dialog.tsx
 * @description Modal interativo de checkout de faturamento com seleção de tipo fiscal (CPF / CNPJ),
 * validação matemática em tempo real e redirecionamento seguro para a fatura do Asaas.
 */

"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Building2,
  User,
  ShieldCheck,
  Loader2,
  Lock,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import {
  formatDocument,
  formatPhone,
  isValidDocument,
  sanitizeDigits,
} from "@/lib/validations/document";
import { createSubscriptionCheckoutAction } from "@/app/actions/billing-actions";
import { toast } from "sonner";

export interface BillingCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planName: string;
  planPrice: number;
  billingCycle?: "mensal" | "anual" | "MONTHLY" | "YEARLY" | string;
  cycle?: "MONTHLY" | "YEARLY" | "mensal" | "anual" | string;
  initialData?: {
    name?: string;
    email?: string;
    phone?: string;
    document?: string;
    documentType?: "CPF" | "CNPJ";
  };
}

interface BillingCheckoutFormProps {
  planId: string;
  planName: string;
  planPrice: number;
  billingCycle?: "mensal" | "anual" | "MONTHLY" | "YEARLY" | string;
  cycle?: "MONTHLY" | "YEARLY" | "mensal" | "anual" | string;
  initialData?: BillingCheckoutDialogProps["initialData"];
  onCancel: () => void;
}

function BillingCheckoutFormContent({
  planId,
  planName,
  planPrice,
  billingCycle,
  cycle,
  initialData,
  onCancel,
}: BillingCheckoutFormProps) {
  const selectedCycle = (cycle || billingCycle || "mensal").toString();
  const resolvedCycle: "MONTHLY" | "YEARLY" =
    selectedCycle.toLowerCase() === "anual" ||
    selectedCycle.toLowerCase() === "annual" ||
    selectedCycle.toLowerCase() === "annually" ||
    selectedCycle.toLowerCase() === "yearly" ||
    selectedCycle.toUpperCase() === "YEARLY"
      ? "YEARLY"
      : "MONTHLY";

  const defaultDocType: "CPF" | "CNPJ" =
    initialData?.documentType ||
    (initialData?.document && sanitizeDigits(initialData.document).length <= 11
      ? "CPF"
      : "CNPJ");

  const [documentType, setDocumentType] = useState<"CPF" | "CNPJ">(defaultDocType);
  const [billingName, setBillingName] = useState(initialData?.name || "");
  const [document, setDocument] = useState(
    initialData?.document ? formatDocument(initialData.document, defaultDocType) : ""
  );
  const [billingEmail, setBillingEmail] = useState(initialData?.email || "");
  const [billingPhone, setBillingPhone] = useState(
    initialData?.phone ? formatPhone(initialData.phone) : ""
  );
  const [documentTouched, setDocumentTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cleanDoc = sanitizeDigits(document);
  const isDocValid = cleanDoc.length > 0 ? isValidDocument(cleanDoc, documentType) : false;
  const isDocInvalid = documentTouched && cleanDoc.length > 0 && !isDocValid;

  const handleDocumentTypeChange = (type: "CPF" | "CNPJ") => {
    setDocumentType(type);
    setDocument(formatDocument(document, type));
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDocument(e.target.value, documentType);
    setDocument(formatted);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setBillingPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setDocumentTouched(true);

    if (!billingName.trim()) {
      setErrorMessage("Informe o Nome ou Razão Social.");
      return;
    }

    if (!cleanDoc) {
      setErrorMessage(`Informe o ${documentType} para emissão fiscal da fatura.`);
      return;
    }

    if (!isDocValid) {
      setErrorMessage(`O número de ${documentType} informado é inválido.`);
      return;
    }

    if (!billingEmail.trim() || !billingEmail.includes("@")) {
      setErrorMessage("Informe um e-mail financeiro válido para receber as cobranças.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createSubscriptionCheckoutAction({
        planId,
        billingCycle: resolvedCycle === "YEARLY" ? "anual" : "mensal",
        cycle: resolvedCycle,
        documentType,
        document: cleanDoc,
        cpfCnpj: cleanDoc,
        name: billingName.trim(),
        billingName: billingName.trim(),
        email: billingEmail.trim(),
        billingEmail: billingEmail.trim(),
        phone: billingPhone.trim(),
        billingPhone: billingPhone.trim(),
      });

      const invoiceUrl = result.invoiceUrl || result.checkoutUrl;

      if (result.success && invoiceUrl) {
        if (typeof window !== "undefined") {
          window.open(invoiceUrl, "_blank", "noopener,noreferrer");
        }
        if (onCancel) {
          onCancel();
        }
        toast.success("Fatura gerada com sucesso! Conclua o pagamento na nova aba.");
      } else if (!result.success) {
        const errorText = result.error || "Não foi possível gerar a fatura de pagamento.";
        setErrorMessage(errorText);
        toast.error(errorText);
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error("[Billing Checkout Dialog Error]", err);
      const msg = err instanceof Error ? err.message : "Erro na comunicação com o gateway Asaas.";
      setErrorMessage(msg);
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase tracking-wider mb-1">
          <ShieldCheck className="h-4 w-4" />
          <span>Checkout Seguro Asaas</span>
        </div>
        <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white">
          Dados de Faturamento da Assinatura
        </DialogTitle>
        <DialogDescription className="text-xs sm:text-sm text-zinc-400">
          Você está assinando o <strong className="text-white">{planName}</strong> por{" "}
          <span className="text-emerald-400 font-bold">
            R$ {planPrice.toLocaleString("pt-BR")}
            {resolvedCycle === "YEARLY" ? "/ano" : "/mês"}
          </span>
          .
        </DialogDescription>
      </DialogHeader>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300 shadow-inner my-2"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Seletor de Tipo Fiscal (CNPJ vs CPF) */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300">Tipo de Faturamento</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDocumentTypeChange("CNPJ")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                documentType === "CNPJ"
                  ? "border-orange-500 bg-orange-500/10 text-orange-300 shadow-sm"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white"
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Pessoa Jurídica (CNPJ)</span>
            </button>
            <button
              type="button"
              onClick={() => handleDocumentTypeChange("CPF")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                documentType === "CPF"
                  ? "border-orange-500 bg-orange-500/10 text-orange-300 shadow-sm"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white"
              }`}
            >
              <User className="h-4 w-4" />
              <span>Pessoa Física (CPF)</span>
            </button>
          </div>
        </div>

        {/* Nome / Razão Social */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300">
            {documentType === "CNPJ" ? "Razão Social / Nome da Loja" : "Nome Completo do Titular"}
          </label>
          <Input
            type="text"
            required
            placeholder={
              documentType === "CNPJ"
                ? "Ex: Auto Prime Veículos LTDA"
                : "Ex: Carlos Henrique Silva"
            }
            value={billingName}
            onChange={(e) => setBillingName(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-orange-500 h-10 text-xs sm:text-sm"
          />
        </div>

        {/* Documento (CPF/CNPJ) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-300">
              {documentType === "CNPJ" ? "CNPJ da Concessionária" : "CPF do Titular"}
            </label>
            {cleanDoc.length > 0 && isDocValid && (
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                ✓ {documentType} válido
              </span>
            )}
          </div>
          <Input
            type="text"
            required
            placeholder={documentType === "CNPJ" ? "00.000.000/0000-00" : "000.000.000-00"}
            value={document}
            onBlur={() => setDocumentTouched(true)}
            onChange={handleDocumentChange}
            className={`bg-white/5 text-white placeholder:text-zinc-500 h-10 text-xs sm:text-sm transition-colors ${
              isDocInvalid
                ? "border-red-500 focus:border-red-500"
                : isDocValid
                ? "border-emerald-500/60 focus:border-emerald-500"
                : "border-white/10 focus:border-orange-500"
            }`}
          />
          {isDocInvalid && (
            <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1">
              Número de {documentType} inválido. Verifique os dígitos digitados.
            </p>
          )}
        </div>

        {/* E-mail Financeiro & Telefone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">E-mail Financeiro</label>
            <Input
              type="email"
              required
              placeholder="financeiro@loja.com"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-orange-500 h-10 text-xs sm:text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">WhatsApp / Telefone</label>
            <Input
              type="tel"
              placeholder="(11) 98888-7777"
              value={billingPhone}
              onChange={handlePhoneChange}
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-orange-500 h-10 text-xs sm:text-sm"
            />
          </div>
        </div>

        {/* Rodapé da Modal: Ações e Aviso de Segurança (Sem Barra Cinza) */}
        <div className="mt-6 flex flex-col gap-3">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus-visible:outline-none"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="checkout-confirm-btn"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-orange-600 hover:bg-orange-500 text-white shadow-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <span>Continuar para Pagamento Seguro</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Lock className="w-3.5 h-3.5" />
            <span>Fatura oficial emitida com segurança pelo gateway Asaas (Pix / Cartão)</span>
          </div>
        </div>
      </form>
    </>
  );
}

export function BillingCheckoutDialog({
  open,
  onOpenChange,
  planId,
  planName,
  planPrice,
  billingCycle,
  cycle,
  initialData,
}: BillingCheckoutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#121218] border-white/10 text-white shadow-2xl p-6">
        {open && (
          <BillingCheckoutFormContent
            key={`${planId}-${open}`}
            planId={planId}
            planName={planName}
            planPrice={planPrice}
            billingCycle={billingCycle}
            cycle={cycle}
            initialData={initialData}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

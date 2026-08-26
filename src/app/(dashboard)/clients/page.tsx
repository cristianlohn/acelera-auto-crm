/**
 * @file page.tsx
 * @description Módulo de Gestão de Clientes e Carteira (ClientsPage).
 *
 * Funcionalidades:
 * - KPIs da carteira de clientes (Total, Ativos, Compradores/Vendas, Ticket Médio).
 * - Busca instantânea reativa por nome, telefone ou e-mail.
 * - Filtro por abas de status de relacionamento (Todos, Ativos, Compradores, Inativos).
 * - Tabela/Cards com deep-link direto para WhatsApp com mensagem personalizada.
 * - Empty State contextual para pesquisas sem resultado.
 * - Modal de cadastro de novos clientes com validação e inserção reativa no topo.
 */

"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Users,
  UserCheck,
  ShoppingBag,
  DollarSign,
  Search,
  Plus,
  Phone,
  Mail,
  Car,
  Clock,
  MessageCircle,
  Sparkles,
  FileText,
  User,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  mockClients,
  createClient,
  formatCurrency,
} from "@/lib/mock-data";
import { timeAgo } from "@/lib/lead-utils";
import type { Client, ClientStatus, ClientFormData } from "@/types/crm";

// ---------------------------------------------------------------------------
// Constantes e Configurações Visuais
// ---------------------------------------------------------------------------

type FilterTab = "todos" | ClientStatus;

const STATUS_CONFIG: Record<
  ClientStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  ativo: {
    label: "Ativo",
    badgeClass:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60",
    dotClass: "bg-emerald-500",
  },
  comprador: {
    label: "Comprador",
    badgeClass:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60",
    dotClass: "bg-blue-500",
  },
  inativo: {
    label: "Inativo",
    badgeClass:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700/60",
    dotClass: "bg-slate-400",
  },
};

const TAB_OPTIONS: { id: FilterTab; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "ativo", label: "Ativos" },
  { id: "comprador", label: "Compradores" },
  { id: "inativo", label: "Inativos" },
];

/**
 * Gera URL de mensagem personalizada no WhatsApp para o cliente.
 */
export function buildClientWhatsAppUrl(client: Client): string {
  const cleanDigits = client.phone.replace(/\D/g, "");
  const phoneWithDDI = cleanDigits.startsWith("55")
    ? cleanDigits
    : `55${cleanDigits}`;
  const msg = encodeURIComponent(
    `Olá ${client.name}! Tudo bem? 😊\n\nSou da equipe da *Acelera Auto*. Estou entrando em contato para saber como podemos te ajudar com seu próximo veículo! 🚗`
  );
  return `https://wa.me/${phoneWithDDI}?text=${msg}`;
}

// ---------------------------------------------------------------------------
// Modal de Cadastro de Cliente
// ---------------------------------------------------------------------------

const INITIAL_CLIENT_FORM: ClientFormData = {
  name: "",
  phone: "",
  email: "",
  document: "",
  status: "ativo",
  sellerName: "Rafael Alves",
  vehiclePreference: "",
  notes: "",
};

interface AddClientModalProps {
  onAdd: (client: Client) => void;
}

function AddClientModal({ onAdd }: AddClientModalProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ClientFormData>(INITIAL_CLIENT_FORM);

  const isFormValid = Boolean(form.name.trim() && form.phone.trim());

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const newClient = createClient(form);
    onAdd(newClient);
    setForm(INITIAL_CLIENT_FORM);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          id="btn-add-client"
          className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-red-600 hover:shadow-orange-500/35"
          aria-label="Adicionar novo cliente à base"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Cliente</span>
        </Button>
      </DialogTrigger>

      <DialogContent
        id="modal-add-client"
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        aria-describedby="modal-add-client-desc"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/30">
              <UserCheck className="h-4 w-4 text-white" />
            </div>
            <div>
              <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
              <p
                id="modal-add-client-desc"
                className="text-xs text-muted-foreground"
              >
                Cadastre informações de contato e preferências do cliente
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-3 grid gap-4">
          {/* Nome Completo */}
          <div className="grid gap-1.5">
            <label
              htmlFor="client-name"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
            >
              <User className="h-3.5 w-3.5" />
              Nome completo *
            </label>
            <Input
              id="client-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ex: Mariana Souza"
              required
            />
          </div>

          {/* Grid 2 colunas: Telefone e E-mail */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label
                htmlFor="client-phone"
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
              >
                <Phone className="h-3.5 w-3.5" />
                Telefone / WhatsApp *
              </label>
              <Input
                id="client-phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Ex: 47998877665"
                type="tel"
                required
              />
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="client-email"
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
              >
                <Mail className="h-3.5 w-3.5" />
                E-mail (opcional)
              </label>
              <Input
                id="client-email"
                name="email"
                value={form.email || ""}
                onChange={handleChange}
                placeholder="Ex: mariana@email.com"
                type="email"
              />
            </div>
          </div>

          {/* Grid 2 colunas: CPF e Status */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label
                htmlFor="client-document"
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                CPF / Documento
              </label>
              <Input
                id="client-document"
                name="document"
                value={form.document || ""}
                onChange={handleChange}
                placeholder="Ex: 123.456.789-00"
              />
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="client-status"
                className="text-xs font-medium text-muted-foreground"
              >
                Status do Relacionamento
              </label>
              <select
                id="client-status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="ativo">Ativo (Em negociação)</option>
                <option value="comprador">Comprador (Cliente da casa)</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>

          {/* Grid 2 colunas: Vendedor e Preferência */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label
                htmlFor="client-sellerName"
                className="text-xs font-medium text-muted-foreground"
              >
                Vendedor Responsável
              </label>
              <select
                id="client-sellerName"
                name="sellerName"
                value={form.sellerName}
                onChange={handleChange}
                className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="Rafael Alves">Rafael Alves</option>
                <option value="Camila Dias">Camila Dias</option>
                <option value="Lucas Santana">Lucas Santana</option>
                <option value="Beatriz Rocha">Beatriz Rocha</option>
              </select>
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="client-vehiclePreference"
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
              >
                <Car className="h-3.5 w-3.5" />
                Veículo de Interesse
              </label>
              <Input
                id="client-vehiclePreference"
                name="vehiclePreference"
                value={form.vehiclePreference || ""}
                onChange={handleChange}
                placeholder="Ex: Corolla Cross XRE"
              />
            </div>
          </div>

          {/* Observações */}
          <div className="grid gap-1.5">
            <label
              htmlFor="client-notes"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
            >
              <FileText className="h-3.5 w-3.5" />
              Observações / Histórico
            </label>
            <textarea
              id="client-notes"
              name="notes"
              value={form.notes || ""}
              onChange={handleChange}
              rows={2}
              placeholder="Ex: Cliente interessado em financiamento, prefere cor branca..."
              className="w-full resize-none rounded-md border border-input bg-background p-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
            />
          </div>

          {/* Ações do Modal */}
          <div className="mt-2 flex justify-end gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              id="btn-submit-client"
              type="submit"
              size="sm"
              disabled={!isFormValid}
              className="gap-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
            >
              Cadastrar Cliente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Componente: Cartão de Métrica da Carteira
// ---------------------------------------------------------------------------

interface ClientMetricCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  trend?: string;
}

function ClientMetricCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
}: ClientMetricCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground truncate">
            {value}
          </p>
          {trend && (
            <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {trend}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm",
            iconBg
          )}
        >
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente Principal: ClientsPage
// ---------------------------------------------------------------------------

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("todos");

  // Adição de cliente reativo no topo da carteira
  const handleAddClient = useCallback((newClient: Client) => {
    setClients((prev) => [newClient, ...prev]);
  }, []);

  // Cálculos das métricas executivas da carteira
  const metrics = useMemo(() => {
    const total = clients.length;
    const active = clients.filter((c) => c.status === "ativo").length;
    const buyers = clients.filter((c) => c.purchasesCount > 0);
    const totalSalesCount = buyers.reduce((acc, c) => acc + c.purchasesCount, 0);
    const totalRevenue = buyers.reduce((acc, c) => acc + c.totalPurchased, 0);
    const averageTicket =
      totalSalesCount > 0 ? Math.round(totalRevenue / totalSalesCount) : 0;

    return {
      total,
      active,
      totalSalesCount,
      averageTicket,
    };
  }, [clients]);

  // Filtragem combinada por busca textual e abas de status
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchesTab = activeTab === "todos" ? true : c.status === activeTab;
      if (!matchesTab) return false;

      if (!search.trim()) return true;
      const term = search.toLowerCase();
      const cleanPhoneTerm = term.replace(/\D/g, "");
      const nameMatch = c.name.toLowerCase().includes(term);
      const phoneMatch =
        cleanPhoneTerm.length > 0 && c.phone.includes(cleanPhoneTerm);
      const emailMatch = c.email?.toLowerCase().includes(term) ?? false;
      const vehicleMatch =
        c.vehiclePreference?.toLowerCase().includes(term) ?? false;

      return nameMatch || phoneMatch || emailMatch || vehicleMatch;
    });
  }, [clients, activeTab, search]);

  return (
    <div className="flex h-full flex-col">
      {/* ------------------------------------------------------------------ */}
      {/* Topo / Header da Carteira                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                Carteira de Clientes
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                <Sparkles className="h-3 w-3" />
                CRM
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {clients.length} clientes cadastrados na sua base de relacionamento
            </p>
          </div>

          <AddClientModal onAdd={handleAddClient} />
        </div>

        {/* KPIs da Carteira */}
        <div className="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-4 sm:px-6">
          <ClientMetricCard
            label="Total de Clientes"
            value={metrics.total}
            icon={Users}
            iconBg="bg-blue-100 dark:bg-blue-950/60"
            iconColor="text-blue-600 dark:text-blue-400"
            trend="+2 cadastrados este mês"
          />
          <ClientMetricCard
            label="Clientes Ativos"
            value={metrics.active}
            icon={UserCheck}
            iconBg="bg-emerald-100 dark:bg-emerald-950/60"
            iconColor="text-emerald-600 dark:text-emerald-400"
            trend="Em negociação ativa"
          />
          <ClientMetricCard
            label="Vendas na Carteira"
            value={metrics.totalSalesCount}
            icon={ShoppingBag}
            iconBg="bg-amber-100 dark:bg-amber-950/60"
            iconColor="text-amber-600 dark:text-amber-400"
            trend="Veículos entregues"
          />
          <ClientMetricCard
            label="Ticket Médio da Base"
            value={formatCurrency(metrics.averageTicket)}
            icon={DollarSign}
            iconBg="bg-violet-100 dark:bg-violet-950/60"
            iconColor="text-violet-600 dark:text-violet-400"
            trend="Valor médio por compra"
          />
        </div>

        {/* Barra de Busca e Filtros por Abas */}
        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {/* Busca Instantânea */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              role="searchbox"
              aria-label="Buscar clientes"
              placeholder="Buscar por nome, telefone ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>

          {/* Abas de Status */}
          <div
            role="tablist"
            aria-label="Filtro de status do cliente"
            className="inline-flex rounded-lg border bg-muted/60 p-1 text-xs"
          >
            {TAB_OPTIONS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-md px-3 py-1 font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Listagem / Tabela de Clientes                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 p-4 sm:p-6">
        {filteredClients.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-2xl">
              🔍
            </div>
            <h2 className="mt-4 text-sm font-bold text-foreground">
              Nenhum cliente encontrado
            </h2>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {search
                ? `Nenhum resultado para "${search}". Tente buscar por outro termo ou limpe o filtro.`
                : "Não há clientes cadastrados nesta categoria."}
            </p>
            {search && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 text-xs"
                onClick={() => setSearch("")}
              >
                Limpar Busca
              </Button>
            )}
          </div>
        ) : (
          /* Grid de Cards de Clientes */
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredClients.map((client) => {
              const statusInfo = STATUS_CONFIG[client.status];
              return (
                <article
                  key={client.id}
                  className="group relative flex flex-col justify-between rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                  aria-label={`Cliente: ${client.name}`}
                >
                  <div>
                    {/* Cabeçalho do Card: Avatar + Nome + Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-xs font-bold text-white shadow">
                          {client.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {client.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            Vendedor: {client.sellerName}
                          </p>
                        </div>
                      </div>

                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0",
                          statusInfo.badgeClass
                        )}
                      >
                        <span
                          className={cn("h-1.5 w-1.5 rounded-full", statusInfo.dotClass)}
                        />
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Informações de Contato */}
                    <div className="mt-3.5 space-y-1.5 border-t pt-3 text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 text-foreground shrink-0" />
                        <span className="font-medium text-foreground">
                          {client.phone}
                        </span>
                      </div>
                      {client.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.vehiclePreference && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Car className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                          <span className="truncate font-medium text-foreground">
                            Interesse: {client.vehiclePreference}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Histórico financeiro / compras */}
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/50 p-2 text-xs">
                      <div>
                        <p className="text-[10px] text-muted-foreground">
                          Histórico de Compras
                        </p>
                        <p className="font-semibold text-foreground">
                          {client.purchasesCount > 0
                            ? `${client.purchasesCount} ${
                                client.purchasesCount === 1
                                  ? "veículo"
                                  : "veículos"
                              }`
                            : "Nenhuma compra"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">
                          Total Investido
                        </p>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(client.totalPurchased)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rodapé do Card: Última Interação + Botão WhatsApp */}
                  <div className="mt-4 border-t pt-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          Último contato: {timeAgo(client.lastInteractionAt)}
                        </span>
                      </div>
                      {client.document && (
                        <span>Doc: {client.document}</span>
                      )}
                    </div>

                    <a
                      id={`whatsapp-client-${client.id}`}
                      href={buildClientWhatsAppUrl(client)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-green-500/20 transition-all duration-200 hover:from-green-600 hover:to-green-700 hover:shadow-md hover:shadow-green-500/30 active:scale-95"
                      aria-label={`Abrir conversa no WhatsApp com ${client.name}`}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Chamar no WhatsApp
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

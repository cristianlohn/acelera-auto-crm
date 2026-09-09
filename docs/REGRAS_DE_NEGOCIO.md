# Especificação Oficial de Regras de Negócio — Acelera Auto CRM

> **Documento de Requisitos de Negócio (BRD) & Especificação Funcional Canônica**  
> **Versão:** 2.3.0  
> **Status:** Aprovado para Engenharia, Auditoria & QA  
> **Classificação:** Documento Técnico Canônico de Domínio  

---

## 1. Glossário e Domínio Automotivo

A tabela abaixo define formalmente os termos, entidades, conceitos operacionais e sinônimos utilizados no código-fonte, banco de dados e interfaces do sistema.

| Termo | Definição | Sinônimos no Código | Contexto de Uso |
|---|---|---|---|
| **Tenant / Organização** | Unidade lógica e jurídica de isolamento de dados que representa uma concessionária ou revenda de veículos. | `organization`, `organizations`, `orgId`, `tenant_id`, `hostOrg` | Isolamento relacional de todas as tabelas via RLS e chaves estrangeiras. |
| **Lead / Oportunidade** | Oportunidade de negócio gerada por pessoa física ou jurídica interessada na compra, venda ou troca de veículo. | `lead`, `leads`, `LeadRow`, `KanbanLead` | Entidade central do funil de vendas, processamento de webhooks e distribuição comercial. |
| **Roleta Comercial** | Mecanismo algorítmico determinístico de distribuição *round-robin* com desempate por menor carga entre consultores de vendas de plantão. | `roleta`, `lead-roulette`, `roundRobinCursor`, `leadRouting` | Distribuição automática de leads recebidos via webhook ou API sem corretor pré-atribuído. |
| **Plantão / In Roulette** | Estado operacional temporário que indica se o consultor de vendas está apto a receber novos leads no momento do disparo. | `in_roulette`, `is_online`, `onDuty`, `roulette_status` | Filtro booleano aplicado aos perfis antes da seleção do próximo beneficiário na roleta. |
| **Cockpit do Gestor** | Painel analítico executivo que consolida indicadores operacionais, volumetria, gargalos de atendimento e valores negociados. | `cockpit`, `manager-cockpit`, `ManagerActionCockpit` | Visualização estratégica exclusiva para papéis com permissão gerencial ou administrativa (`manager`, `admin`). |
| **Dinheiro na Mesa** | Indicador financeiro consolidado que soma o valor estimado dos veículos de interesse de todos os leads ativos no funil (desconsiderando ganhos e perdidos). | `moneyOnTable`, `dinheiroNaMesa`, `totalPipelineValue` | Métrica dinâmica calculada com base em `leads.estimated_value` ou preço do veículo associado. |
| **Horários de Atendimento & SLA** | Configuração semanal de expediente da loja para contagem adaptativa de SLA (minutos úteis de atendimento vs. contínuo 24/7). | `StoreBusinessHours`, `DaySchedule`, `business_hours`, `slaMode` | Motor de SLA em `src/lib/crm/sla-calculator.ts` e aba SLA em `/settings`. |
| **Regime de Plantão / Feirão** | Regime de expediente estendido aos fins de semana (sábados à tarde ou domingos) com contagem ativa de tempo de atendimento. | `feirão`, `plantao_fds`, `isStoreCurrentlyOpen` | Badge visual em `/settings` e ativação de jornada útil no fim de semana. |
| **FIPE de Referência** | Valor venal médio informado manualmente pelo operador como parâmetro de balizamento comercial para avaliação de veículos e trocas. | `fipe_price`, `fipePrice`, `fipe_reference` | Módulo de Estoque e Propostas. Não depende de consulta a APIs externas pagas. |
| **Margem Bruta Estimada** | Spread financeiro bruto previsto entre o preço de venda anunciado e o custo de aquisição/entrada do seminovo no pátio. | `estimatedMargin`, `gross_margin`, `spread` | Módulo de Estoque e Relatórios. Não deduz despesas de preparação, impostos ou comissões. |
| **Margem Média por Veículo** | Média aritmética da margem bruta por unidade vendida no histórico (`Margem Bruta Total ÷ Quantidade de Vendidos`). | `margemMedia`, `averageMarginPerVehicle` | Histórico de Estoque (`/vehicles?tab=vendidos`). Ex: R$ 7.933 na demo (R$ 23.800 ÷ 3). |
| **Margem Bruta Total Realizada** | Soma monetária acumulada dos spreads de lucro bruto de todas as unidades vendidas no pátio. | `margemTotal`, `totalRealizedMargin` | Card executivo em `/vehicles?tab=vendidos` e relatórios financeiros. Ex: R$ 23.800 na demo. |
| **Evolution API v2** | Gateway de mensageria externa via protocolo HTTP REST acoplado ao motor WhatsApp Web/Baileys para envio de notificações internas. | `evolution`, `evolutionApi`, `whatsapp-client` | Disparo automático de alertas para vendedores quando um novo lead entra na roleta. |
| **Link 1-Clique WhatsApp** | Ação rápida descentralizada no CRM que abre diretamente o WhatsApp Web/App (`wa.me`) no dispositivo do vendedor com mensagem pronta. | `wa.me`, `whatsapp_link`, `one_click_whatsapp` | Atendimento comercial direto do vendedor ao cliente sem custo de API por mensagem. |
| **Asaas** | Gateway de liquidação de faturamento via Pix, Boleto e Cartão de Crédito para planos de assinatura do CRM. | `asaas`, `asaas-webhook`, `subscription-service` | Gestão de assinaturas recorrentes, faturas e controle de vigência (`current_period_end`). |
| **Modo Demonstração** | Ambiente *sandbox* em memória e sem persistência em banco real, utilizado para demonstrações comerciais e testes guiados. | `isDemo`, `isDemoMode`, `DEFAULT_DEMO_ORG_ID` | Proteção absoluta de produção com renderização de 24 leads canônicos (R$ 215.800). |

---

## 2. Gestão de Tenants & Permissões (RBAC)

O Acelera Auto CRM opera com modelo estrito de Controle de Acesso Baseado em Papéis (*Role-Based Access Control* - RBAC) combinado com Políticas de Segurança a Nível de Linha (*Row Level Security* - RLS) no PostgreSQL.

### 2.1. Papéis Suportados e Normalização Canônica

O módulo `src/lib/permissions.ts` define e normaliza todos os papéis suportados no sistema para 4 papéis canônicos:

```typescript
export type UserRole =
  | "seller"
  | "manager"
  | "admin"
  | "superadmin"
  | "vendedor"
  | "gerente"
  | "owner";

export type NormalizedRole = "seller" | "manager" | "admin" | "superadmin";
```

- **`seller` (Vendedor / Consultor):** Papel operacional de atendimento comercial direto.
  - Sinônimos aceitos: `"seller"`, `"vendedor"`.
- **`manager` (Gerente / Gestor Comercial):** Papel de supervisão de equipe, plantões, parâmetros de SLA e funil.
  - Sinônimos aceitos: `"manager"`, `"gerente"`, `"gestor"`.
- **`admin` (Administrador / Titular da Loja):** Responsável institucional, dados da loja, chaves de API e faturamento.
  - Sinônimos aceitos: `"admin"`, `"owner"`, `"proprietario"`, `"dono"`.
- **`superadmin` (Administrador Global SaaS):** Suporte técnico global e auditoria multi-tenant.
  - Sinônimos aceitos: `"superadmin"`, `"super_admin"`, `"super"`.

### 2.2. Matriz Estrita de Controle de Acesso por Rota, Ação e Aba de Configurações

| Recurso / Rota / Ação | `seller` | `manager` | `admin` | `superadmin` | Helper RBAC |
|---|:---:|:---:|:---:|:---:|---|
| **Visão Geral do Cockpit (`/dashboard`)** | Visão Pessoal ("Meu Cockpit") | Visão Executiva ("Dinheiro na Mesa") | Visão Executiva ("Dinheiro na Mesa") | Visão Executiva | `canViewAllLeads` |
| **Visualização do Funil (`/dashboard/leads`)** | Apenas leads atribuídos a si | Todos os leads da concessionária | Todos os leads da concessionária | Todos os leads da loja | `canViewAllLeads` |
| **Movimentação de Cards (Kanban / Lista)** | Sim (leads próprios) | Sim (qualquer lead da loja) | Sim (qualquer lead da loja) | Sim | Permissão granular |
| **Gestão de Equipe & Roleta (`/dashboard/team`)** | Bloqueado (`403`) | Sim (alternar plantão / convidar) | Sim (total controle da equipe) | Sim | `canManageTeam` |
| **Relatórios Executivos (`/dashboard/reports`)** | Bloqueado (`403`) | Sim (visualizar / exportar CSV e PDF) | Sim (visualizar / exportar CSV e PDF) | Sim | `canViewExecutiveReports` |
| **Gestão de Estoque (`/estoque` ou `/vehicles`)** | Sim (consultar / cadastrar) | Sim (total controle) | Sim (total controle) | Sim | Livre para equipe |
| **Configurações: Aba Perfil & Preferências** | Sim (dados pessoais / tema) | Sim (dados pessoais / tema) | Sim (dados pessoais / tema) | Sim | Acesso universal |
| **Configurações: Aba Loja (`/settings?tab=loja`)** | Bloqueado (`403` / Oculto) | Bloqueado (Leitura apenas) | Sim (Editar dados / CNPJ / Endereço) | Sim | `canManageIntegrationsAndBilling` |
| **Configurações: Aba SLA & Horários (`/settings?tab=sla`)** | Bloqueado (`403` / Oculto) | Sim (Editar horários e modo de SLA) | Sim (Editar horários e modo de SLA) | Sim | `canManageTeam` |
| **Configurações: Aba Equipe (`/settings?tab=equipe`)** | Bloqueado (`403` / Oculto) | Sim (Gerenciar consultores) | Sim (Gerenciar consultores) | Sim | `canManageTeam` |
| **Configurações: Aba Integrações & WhatsApp** | Bloqueado (`403` / Oculto) | Sim (QR Code Evolution / Webhooks) | Sim (Criar/revogar API Keys) | Sim | `canManageIntegrations` |
| **Faturamento, Planos & Assinatura Asaas (`/billing`)** | Bloqueado (`403`) | Bloqueado (`403`) | Sim (Checkout, upgrade, faturas) | Sim | `canManageIntegrationsAndBilling` |
| **Console Master do SaaS (`/superadmin`)** | Bloqueado (`403`) | Bloqueado (`403`) | Bloqueado (`403`) | Sim (Irrestrito) | `isSuperAdmin` |

### 2.3. Isolamento Multi-Tenant e Políticas RLS

1. **Cláusula de Isolamento:** Todo registro nas tabelas `leads`, `vehicles`, `clients`, `api_keys`, `organization_invites`, `whatsapp_instances` e `meta_integrations` contém obrigatoriamente a coluna `organization_id UUID NOT NULL REFERENCES organizations(id)`.
2. **Resolução de Sessão (`resolveUserTenantContext` em `src/lib/auth/tenant.ts`):**
   - Usuário autenticado: Resolve estritamente a partir de `profiles.organization_id`.
   - Se o usuário não possuir vínculo com tenant: retorna `organizationId: null` e `needsOnboarding: true`. **NUNCA** faz fallback silencioso para a demo.
3. **Proteção RLS do PostgreSQL:**
   ```sql
   CREATE POLICY "tenant_isolation_leads" ON public.leads
   FOR ALL USING (
     organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
   );
   ```

### 2.4. Regras Operacionais do Modo Demonstração (Sandbox)

O Modo Demonstração é regido pelas constantes puras em `src/lib/auth/constants.ts`:
- **`DEFAULT_DEMO_ORG_ID`:** `"a0000000-0000-0000-0000-000000000001"` (UUID fixo reservado para fixtures e RLS neutro).
- **`DEMO_USER_ID`:** `"demo-sandbox-user"`.

**Regras Inegociáveis do Modo Demo:**
1. **Zero Poluição de Banco:** Nenhuma ação executada na demo (arrastar card no Kanban, cadastrar veículo, simular proposta, ajustar horários de atendimento) pode disparar inserts ou updates nas tabelas do Supabase. As mutações ocorrem exclusivamente no estado local/memória da sessão.
2. **Zero Fallback de Produção:** Organizações reais em produção sem leads cadastrados exibem zero state legítimo (`R$ 0,00`, `0 leads`, lista vazia). Jamais injetam dados fictícios da demo em contas de lojistas reais.
3. **Desacoplamento de Servidor:** Arquivos consumidos no cliente (`demo-dataset.ts`, `mock-data.ts`, `constants.ts`) **NUNCA** importam módulos restritos ao servidor (`next/headers`, `@supabase/ssr`, `tenant.ts`).

---

## 3. Ciclo de Vida do Lead & Funil de Vendas

### 3.1. Estágios Canônicos do Funil

O funil de vendas é modelado através dos tipos `LeadStatus` (`crm.ts`) e `LeadStage` (`kanban.ts`):

```
+---------------+     +---------------+     +---------------+     +---------------+     +---------------+
|   1. NOVO     | --> | 2. ATENDIMENTO| --> |   3. VISITA   | --> |  4. PROPOSTA  | --> | 5. GANHO (WON)|
| (Roleta / SLA)|     |  (Em Contato) |     |  (Test-Drive) |     | (Negociação)  |     | (Venda Concl.)|
+---------------+     +---------------+     +---------------+     +---------------+     +---------------+
        |                     |                     |                     |                     
        +---------------------+---------------------+---------------------+-----> [ PERDIDO (LOST) ]
                                                                                  (Motivo Obrigatório)
```

| Estágio no Kanban | Status no Banco | Descrição Operacional | Critério de Entrada |
|---|---|---|---|
| **Novo Lead** | `novo` (`new`) | Lead acabou de entrar na loja via webhook, portal ou site. Está na fila da roleta aguardando primeiro contato. | Ingestão via webhook ou cadastro manual inicial. |
| **Em Atendimento** | `atendimento` (`in_contact`) | Vendedor iniciou a conversa com o cliente via WhatsApp ou telefone. | Primeiro contato registrado ou clique no link do WhatsApp. |
| **Visita / Test-Drive** | `visita` (`test_drive`) | Cliente compareceu à loja física ou agendou test-drive presencial. | Confirmação de visita ou test-drive com o cliente. |
| **Proposta** | `proposta` (`proposal`) | Simulação de financiamento enviada, avaliação do veículo usado ou proposta formal emitida. | Apresentação de valores formais ou ficha bancária aberta. |
| **Venda Fechada** | `fechado` (`won`) | Negócio ganho, contrato assinado e sinal/pagamento confirmado. | Confirmação do pagamento e baixa do veículo no estoque. |
| **Perdido** | `perdido` (`lost`) | Negociação descartada ou cliente desistente. | Preenchimento obrigatório do modal com o motivo da perda. |

### 3.2. Regras da Roleta de Distribuição de Leads (`roleta.ts`)

A função `resolveAssignedSellerInfo(explicitSeller, organizationId)` executa a lógica determinística de atribuição:

1. **Bypass para Vendedor Explícito:** Se o payload recebido contiver `seller_id` ou `seller_name` com valor válido (diferente de `"roleta"`, `"fila"`, `"none"`, `""`), o lead é vinculado diretamente ao consultor informado, sem avançar o cursor da roleta.
2. **Critérios de Elegibilidade de Plantão:** Um vendedor só pode receber leads da roleta se cumprir simultaneamente:
   - Papel operacional: `role IN ('vendedor', 'gerente', 'admin')`.
   - Plantão ativo: `in_roulette === true` e `is_online !== false`.
   - Sem bloqueio manual de pausa registrado em cookies (`ROULETTE_STATUS_COOKIE`).
3. **Ordenação Determinística:** A lista de vendedores elegíveis é ordenada alfabeticamente por `full_name ASC` para garantir estabilidade da matriz.
4. **Algoritmo Round-Robin:**
   $$\text{targetIndex} = \text{roundRobinCursor} \pmod{\text{totalElegiveis}}$$
   $$\text{roundRobinCursor} = \text{roundRobinCursor} + 1$$
5. **Desempate por Menor Carga (Fair Distribution):** Em caso de empate ou rebalanceamento dinâmico (`lead-roulette.ts`), o lead é entregue ao consultor elegível com a menor contagem de leads ativos no funil.
6. **Fallback de Contingência:** Se nenhum consultor estiver elegível na loja, o lead é atribuído ao primeiro usuário com `role = 'admin'` da organização.

### 3.3. Semáforo de SLA, Horários de Atendimento & Engine Adaptativa (`sla-calculator.ts`)

O cálculo de SLA do Acelera Auto CRM opera com uma **engine adaptativa** (`src/lib/crm/sla-calculator.ts`), projetada para respeitar fielmente a jornada de trabalho comercial de cada loja e evitar falsos alertas fora do horário comercial.

#### A. Modos Operacionais de Contagem de SLA (`slaMode`):
1. **Modo Horário Comercial (`business_hours` - Padrão):**
   - Pausa a contagem de SLA fora do expediente da concessionária (períodos noturnos e dias em que a loja está fechada).
   - O contador de minutos congela no momento do fechamento e retoma exatamente no momento da abertura do próximo dia útil.
2. **Modo Contínuo 24/7 (`continuous`):**
   - Roda a contagem ininterrupta de tempo corrido (24 horas por dia, 7 dias por semana).
   - Utilizado por centrais de atendimento remotas ou concessionárias com equipes de plantão digital 24h.
   - Fórmula: $\text{minutosCorridos} = \lfloor(\text{endDate} - \text{startDate}) / 60.000\rfloor$.

#### B. Jornada Padrão Automotiva (`DEFAULT_AUTOMOTIVE_SCHEDULE`):
Quando a loja não possui configuração personalizada gravada ou opera no Modo Demo, o sistema adota a jornada oficial do setor automotivo brasileiro:
- **Segunda a Sexta-feira:** 08:30 às 18:30 (10 horas úteis = 600 min/dia).
- **Sábado:** 09:00 às 13:00 (4 horas úteis = 240 min).
- **Domingo:** Fechado (`isOpen: false`).

#### C. Algoritmo Matemático de Minutos Úteis (`calculateBusinessMinutesElapsed`):
A função pura itera dia a dia entre a data inicial (`startDate`) e a data final de avaliação (`endDate`):
1. Para cada dia do intervalo, consulta a configuração do dia da semana (`schedule[weekday]`).
2. Se `isOpen === false`, o dia adiciona $0\text{ minutos}$.
3. Se `isOpen === true`, constrói os instantes de abertura (`dayOpen`) e fechamento (`dayClose`).
4. Calcula a sobreposição temporal:
   $$\text{overlapStart} = \max(\text{startDate}, \text{dayOpen})$$
   $$\text{overlapEnd} = \min(\text{endDate}, \text{dayClose})$$
5. Se $\text{overlapEnd} > \text{overlapStart}$, adiciona:
   $$\Delta_{\text{minutos}} = \left\lfloor\frac{\text{overlapEnd} - \text{overlapStart}}{60.000}\right\rfloor$$

> **Exemplo Prático (Fim de Semana Convencional):**  
> Um lead gerado no **Domingo às 14:00** (loja fechada) e avaliado na **Segunda-feira às 08:45** terá decorrido exatamente **15 minutos úteis** (das 08:30 às 08:45 da segunda-feira), **NÃO** estourando o SLA de primeiro atendimento.

#### D. Regime de Plantão / Feirão:
- Gerentes e Administradores podem ativar o atendimento em Sábados à tarde e/ou Domingos via formulário em `/settings?tab=sla`.
- Na interface, fins de semana abertos recebem o selo comemorativo com gradiente em chamas `Regime de Plantão / Feirão`.
- Durante o Feirão ativo, o motor passa a contabilizar minutos úteis normalmente no fim de semana, permitindo cobrança legítima de tempo de resposta dos vendedores em escala.

#### E. Helpers de Suporte Operacional:
- `isStoreCurrentlyOpen(date, config)`: Retorna booleano indicando se no instante exato a loja está com as portas abertas e operando.
- `getNextStoreOpenDate(date, config)`: Determina o instante exato da próxima abertura útil da loja para fins de agendamento e exibição de contadores regressivos.

#### F. Faixas do Semáforo no Kanban & Cockpit:
- 🟢 **Excelente (Verde):** Tempo de espera útil $< 10\text{ minutos}$.
- 🟡 **Atenção (Amarelo):** Tempo de espera útil entre $10\text{ e }15\text{ minutos}$.
- 🔴 **Crítico / Estourado (Vermelho):** Tempo de espera útil $> 15\text{ minutos}$.

#### G. Critérios Exatos de Gargalos no Cockpit:
1. **"Leads acima de 15 min" / "Leads sem retorno":**
   - Condição: `status === 'novo' && firstContactAt === null && businessWaitingMinutes > 15`.
   - Na Empresa Demo: Representa exatamente **6 novos leads na roleta aguardando primeiro contato** (todos com tempo útil entre 18 e 31 minutos).
2. **"Propostas sem follow-up":**
   - Condição: `(status === 'proposta' || stage === 'proposal') && hoursSinceLastContact >= 24`.
   - Na Empresa Demo: Representa exatamente **3 propostas atribuídas a Lucas Santana há 28 horas**.
3. **"Aguardando financiamento":**
   - Condição: `lead.proposalFi === true || lead.isFinancing === true`.
4. **"Leads quentes sem ação hoje":**
   - Condição: Lead em etapa ativa (`atendimento`, `visita`, `proposta`) sem interação há mais de 8 horas úteis.

### 3.4. Regras do Cockpit "Dinheiro na Mesa" e Ações Prescritivas

- **Pipeline Total (Dinheiro na Mesa):** Soma monetária estrita dos valores estimados de todos os leads com status diferente de `won`, `lost`, `fechado` e `perdido`.
- **Valor em Risco:** Soma monetária dos leads com SLA útil de fila estourado ($> 15\text{ min}$) somada aos leads parados em etapas ativas há mais de 48 horas sem contato.
- **Ações Prescritivas com 1-Clique:** O sistema sintetiza ações automáticas para o gestor disparar cobrança via WhatsApp para o consultor responsável (ex: botão *"Cobrar no WhatsApp"* que abre o contato do consultor com mensagem formatada de resgate).

---

## 4. Estoque, FIPE & Indicadores Financeiros

### 4.1. Gestão de Veículos e Ciclo de Pátio

Entidade definida em `src/types/crm.ts`:
- **Status Permitidos:**
  - `disponivel`: Veículo no showroom pronto para venda.
  - `reservado`: Veículo com sinal ou proposta em análise de crédito bancário.
  - `vendido`: Negócio concretizado e baixa realizada no estoque com arquivamento no histórico.

### 4.2. Política da "FIPE de Referência"

1. **Conceito Operacional:** O campo `fipePrice` (`fipe_price`) representa a **FIPE de Referência (Valor Informado)** pelo operador da revenda.
2. **Autonomia da Loja:** A revenda informa livremente o valor da tabela FIPE correspondente à versão do veículo como balizador de negociação.
3. **Resiliência:** O sistema **NUNCA** bloqueia o cadastro de veículos nem depende de APIs externas de FIPE que possam introduzir custos por consulta ou falhas por indisponibilidade de rede.
4. **Aplicação Comercial:** Serve como parâmetro visual de comparação:
   $$\text{Diferença FIPE} = \text{Preço de Venda da Loja} - \text{FIPE de Referência}$$

### 4.3. Fórmulas Financeiras e Indicadores Executivos

#### A. Ticket Médio da Revenda (Estritamente Dinâmico):
Em todos os relatórios analíticos (`/dashboard/reports`), o Ticket Médio é derivado matematicamente em tempo de execução:
$$\text{Ticket Médio} = \frac{\text{Faturamento Total Realizado}}{\text{Quantidade de Vendas Concluídas}}$$
- **Dinâmico em Qualquer Janela:** Funciona de forma estrita para qualquer filtro de período selecionado (7 dias, 30 dias, Mês Atual, Trimestre ou Ano), eliminando qualquer divergência entre faturamento e volume de fechamentos.
- **Na base demo canônica:** $\text{R\$ } 215.800 / 3\text{ vendas} = \text{R\$ } 71.933,33$ (exibido como **R$ 71.933**).

#### B. Margem no Histórico de Veículos Vendidos (`/vehicles?tab=vendidos`):
Para máxima transparência de auditoria e clareza contábil para os lojistas, o sistema divide a análise de margem de fechamento em dois indicadores explícitos:

1. **Margem Bruta Total Realizada:**
   $$\text{Margem Bruta Total Realizada} = \sum_{i=1}^{N} \left(\text{Preço de Venda}_i - \text{Custo de Entrada}_i\right)$$
   - Representa o lucro bruto total acumulado em caixa pelas vendas concluídas.
   - **Na base demo canônica:** $\text{R\$ } 10.000\text{ (Corolla)} + \text{R\$ } 6.900\text{ (Compass)} + \text{R\$ } 6.900\text{ (Tracker)} = \mathbf{\text{R\$ } 23.800}$.

2. **Margem Média por Veículo:**
   $$\text{Margem Média por Veículo} = \frac{\text{Margem Bruta Total Realizada}}{\text{Total de Veículos Vendidos}}$$
   - Representa a contribuição média bruta de lucro por unidade comercializada pela concessionária.
   - **Na base demo canônica:** $\text{R\$ } 23.800 / 3\text{ veículos} = \mathbf{\text{R\$ } 7.933,33}$ (exibido como **R$ 7.933** com subtítulo `(R$ 23.800 ÷ 3 veículos)`).

> **Nota Técnica & Contábil:**  
> A margem bruta calculada reflete o *spread* bruto direto entre a venda e o custo de compra do veículo. Ela **não deduz** impostos, comissões de consultores ou despesas operacionais de oficina/preparação.

#### C. Taxa de Conversão do Funil:
$$\text{Taxa de Conversão} = \left(\frac{\text{Vendas Concluídas (Won)}}{\text{Total de Oportunidades no Período}}\right) \times 100$$
*Na base demo canônica: $(3 / 24) \times 100 = 12,5\%$.*

#### D. Desempenho por Origem / Canal de Entrada:
Mede a eficácia de cada canal de tráfego (Webmotors, Instagram, Site, WhatsApp, etc.):
$$\text{Conversão por Origem} = \left(\frac{\text{Vendas Concluídas da Origem } X}{\text{Total de Leads Recebidos da Origem } X}\right) \times 100$$

---

## 5. Comunicação, Webhooks e Integrações

### 5.1. Arquitetura Híbrida de Mensageria WhatsApp

```
                                  +-------------------------------------------------------+
                                  |                 ACELERA AUTO CRM                      |
                                  +---------------------------+---------------------------+
                                                              |
                               +------------------------------+------------------------------+
                               |                                                             |
                 [ Alertas Internos do Sistema ]                               [ Atendimento Comercial com Lead ]
                               |                                                             |
                               v                                                             v
                 +---------------------------+                                 +---------------------------+
                 |    Evolution API v2       |                                 |    Links Diretos 1-Clique |
                 | (Instância VPS Dedicada)  |                                 |    (Protocolo wa.me)      |
                 +-------------+-------------+                                 +-------------+-------------+
                               |                                                             |
                               v                                                             v
                 +---------------------------+                                 +---------------------------+
                 | WhatsApp do VENDEDOR      |                                 | WhatsApp do CLIENTE       |
                 | (Notificação de Novo Lead)|                                 | (Conversa Direta do Consult)|
                 +---------------------------+                                 +---------------------------+
```

1. **Bot de Alertas Internos (Evolution API v2):**
   - Instância pareada via QR Code pelo gestor em `/dashboard/settings`.
   - Finalidade: Despachar alerta instantâneo para o celular do consultor quando a roleta entrega um novo lead a ele.
2. **Atendimento Comercial Descentralizado (1-Clique):**
   - Botões de ação no Kanban, lista de leads e Cockpit geram URLs diretas no formato:
     `https://wa.me/{numero_cliente}?text={mensagem_formatada}`
   - O vendedor conversa com o comprador a partir de seu próprio aparelho celular ou WhatsApp Web, garantindo atendimento humanizado sem taxa por mensagem.

### 5.2. Contrato da API de Entrada de Leads & Webhooks

- **Rotas:** `POST /api/v1/webhooks/leads` e `POST /api/webhooks/leads`
- **Autenticação Obrigatória:** Header `x-api-key: <token>` ou `Authorization: Bearer <token>`, validada por hash SHA-256 contra `api_keys.key_hash`.

#### Contrato JSON de Entrada (Payload):
```json
{
  "name": "João da Silva",
  "phone": "(11) 98888-7777",
  "email": "joao.silva@email.com",
  "origin": "webmotors",
  "vehicle_interest": "Jeep Renegade Longitude 2023",
  "seller_name": "Rafael Alves",
  "notes": "Cliente possui Onix 2020 para dar na troca."
}
```

#### Regras de Sanitização de Campos:
- `name` *(obrigatório)*: String não vazia (mínimo 1 caractere).
- `phone` *(obrigatório)*: Sanitizado para conter apenas dígitos numéricos (comprimento entre 8 e 15 dígitos). Converte para padrão internacional `55` automaticamente.
- `email` *(opcional)*: Validação de formato de e-mail RFC 5322. String vazia é convertida para `null`.
- `origin` *(opcional)*: Normalizado para os enums aceitos: `whatsapp`, `instagram`, `site`, `indicacao`, `telefone`, `olx`, `icarros`, `webmotors`, `patio_balcao`, `cliente_carteira`. Fallback padrão: `site`.
- `seller_name` / `seller_id` *(opcional)*: Define atribuição direta caso preenchido com nome de vendedor válido da loja.

#### Respostas HTTP Padronizadas:
- `201 Created`: Lead cadastrado e atribuído com sucesso. Retorna `{ success: true, lead: { id, name, status, assigned_to } }`.
- `400 Bad Request`: Falha de validação no payload com descrição detalhada dos campos violados.
- `401 Unauthorized`: Chave de API ausente, inválida ou revogada.
- `500 Internal Server Error`: Falha de banco de dados ou execução no servidor.

### 5.3. Central Oficial de Contatos (`src/config/contact.ts`)

Todos os canais de contato, links de suporte e chamadas comerciais de landing pages e rodapés estão centralizados no arquivo canônico `src/config/contact.ts`:
- **Telefone Oficial Único:** `5547996348698` (Exibição: `(47) 99634-8698`).
- **E-mail de Suporte:** `contato@aceleraautocrm.com.br`.
- **Helpers de Roteamento:**
  - `getSalesWhatsAppUrl(customMessage?)`: Aponta para vendas com mensagem padrão institucional.
  - `getSupportWhatsAppUrl(customMessage?)`: Aponta para a central de suporte técnico ao lojista.

---

## 6. Dados Canônicos da Empresa Demo (`DEFAULT_DEMO_ORG_ID`)

Para fins de demonstração, homologação e consistência visual, o dataset oficial da demo (`src/lib/demo/demo-dataset.ts`) consolida:

- **Organização Demo:** Concessionária Acelera Auto (`a0000000-0000-0000-0000-000000000001`).
- **Equipe Comercial Oficial (4 Consultores):**
  1. **Rafael Alves:** Top Performer — 2 vendas concluídas, faturamento R$ 142.900, SLA médio histórico de 6 min.
  2. **Camila Dias:** 1 venda concluída, faturamento R$ 72.900, SLA médio histórico de 7 min.
  3. **Lucas Santana:** 0 vendas concluídas, 5 leads em visita/proposta (3 propostas há mais de 24h sem retorno), SLA 11 min.
  4. **Beatriz Rocha:** 0 vendas concluídas, 4 leads em atendimento inicial, SLA 9 min.
- **Volumetria do Funil (24 Oportunidades no Total):**
  - **6 Novos Leads na Roleta:** Leandro Cunha, Monica Pires, Otavio Vasques, Paula Silveira, Renato Barros, Sabrina Rezende (tempo de fila $> 15\text{ min}$, justificando o alerta de SLA).
  - **8 Em Atendimento:** Vanessa Martins, Bruno Carvalho, Clarice Fontes, Danilo Siqueira, etc.
  - **4 Visita / Test-Drive:** Gustavo Antunes, Heloisa Ramos, Igor Ferreira, Juliana Castro.
  - **3 Propostas Paradas (Lucas Santana):** Luciana Prado (T-Cross), Rodrigo Meirelles (HR-V), Mariana Albuquerque (Corolla Altis Hybrid) — todas há 28h sem follow-up.
  - **3 Vendas Concluídas (Won):** Roberto Mendes (Corolla R$ 90.000), Marcos Vinicius (Compass R$ 52.900), Fernanda Lima (Tracker R$ 72.900) — Totalizando **R$ 215.800**.
- **Carteira de Clientes (/clients):** 3 clientes ativos gerados diretamente a partir dos compradores das 3 vendas concluídas.

# CRM_CONTEXT.md - Diretrizes de Arquitetura e Regras de Negócio

Este arquivo é a fonte da verdade para o desenvolvimento do CRM. Qualquer modificação de código feita por IA ou desenvolvedores deve seguir rigorosamente as regras aqui estabelecidas.

---

## 1. Stack Tecnológica e Padrões
- Framework: Next.js (App Router) com TypeScript estrito.
- UI & Estilização: Tailwind CSS + Shadcn UI (Radix UI primitives).
- Banco de Dados & Auth: Supabase (PostgreSQL relacional com RLS e multi-tenant).
- Validação de Schemas: Zod para validação em runtime de todas as Server Actions e APIs.
- Testes: Vitest para testes unitários, segurança multi-tenant e regras de negócio.

---

## 2. Princípios de Modificação (Edição Cirúrgica)
1. Modificação Cirúrgica: Altere apenas as funções, componentes ou linhas estritamente necessárias. Nunca reescreva arquivos inteiros do zero.
2. Proibição de Mocks Silenciosos: Nunca capture exceções em catch para retornar dados sintéticos ou { success: true } com IDs temporários (lead-k-...). Erros de banco devem estourar falhas explícitas para a UI.
3. Preservação de Tipos: Toda alteração deve manter os contratos de tipos (types/) e schemas Zod (validations/).
4. Sem Efeitos Colaterais: Não altere lógica de roteamento, componentes visuais ou regras RBAC sem solicitação expressa.

---

## 3. Arquitetura Multi-Tenant e Isolamento Sandbox
- Modo Sandbox (tenantContext.isDemo === true): Mocks e dados fictícios são permitidos exclusivamente aqui.
- Organizações Reais (!tenantContext.isDemo): Devem consultar estritamente os dados persistidos no Supabase filtrados por organization_id ou exibir zero state legítimo (R$ 0,00, 0%, 0 leads, listas vazias). Nunca fazer fallback para dados demo em produção.

---

## 4. Validação com Zod e Integridade do Supabase
- Validação Fail-Fast: Toda entrada de dados deve ser validada por Zod antes de qualquer query no banco.
- Enums Canônicos de Origem (lead_origin):
  1. whatsapp
  2. instagram
  3. site
  4. indicacao
  5. telefone
  6. olx
  7. icarros
  8. webmotors
  9. indicacao_dono
  10. cliente_carteira
  11. patio_balcao
- Normalização Resiliente: Usar normalizeLeadOrigin() em lib/validations/lead.ts para mapear variações de entrada (ex: patio -> patio_balcao, meta_ads -> instagram).
- Migrations Idempotentes: Toda migration SQL deve usar cláusulas seguras (ex: ALTER TYPE ... ADD VALUE IF NOT EXISTS).

---

## 5. Motor de Distribuição de Leads e Roleta Comercial
- Lógica Pura (lib/engine/lead-routing.ts): Funções determinísticas que recebem vendedores, lead e regras e retornam o assigneeId. Sem chamadas a banco ou APIs dentro da função pura.
- Persistência Atômica (actions/lead-actions.ts): Grava a atribuição, incrementa a cota do vendedor no rodízio e registra o log de auditoria em transação atômica.
- Regras da Roleta: Apenas vendedores ativos e dentro da escala recebem leads; desempate por last_assigned_at ASC; leads diretos (carteira/indicação) ignoram a roleta.

---

## 6. Cockpit do Gestor e Motor Analítico
- Métricas Dinâmicas: Nenhum valor do dashboard pode ser fixo/hardcoded.
- Leads sem retorno: status 'novo' criados há mais de 15 minutos sem primeiro contato.
- Propostas sem follow-up: enviadas há mais de 24 horas sem atualização.
- Aguardando financiamento: propostas em análise de crédito pendentes.
- Leads quentes sem ação hoje: alta temperatura sem contato na data atual.
- Dinheiro na Mesa: Soma real da coluna value dos leads (ou 0 se não houver valor preenchido).

---

## 7. Protocolo de Qualidade
- Antes de finalizar qualquer tarefa, executar a suíte Vitest (npm test) e garantir 100% de testes aprovados.


## 🛡️ Cláusula de Proteção Absoluta: Modo de Demonstração (Demo Mode)

O **Ambiente de Demonstração (Demo Mode)** é um ativo crítico de conversão e apresentação do produto e é considerado **ESTRITAMENTE INTOCÁVEL**. Toda e qualquer alteração de código, migration, refatoração de backend ou conexão com o Supabase deve respeitar as seguintes regras inegociáveis:

1. **Dual-Engine / Compatibilidade Obrigatória:**
   - Toda e qualquer tela, hook ou Server Action conectada ao Supabase DEVE manter suporte contínuo ao modo de demonstração (`isDemoMode === true`, tenant demo ou ausência de sessão real).
   - Se a sessão for do usuário de demonstração ou se a requisição de banco falhar/não existir, a aplicação DEVE responder imediatamente com os dados de demonstração (fallback síncrono e instantâneo com 0ms de bloqueio).

2. **Proibição de Exclusão de Mocks e Fixtures de Demonstração:**
   - É terminantemente PROIBIDO deletar, renomear ou corromper arquivos de fixtures/mocks de demonstração (como `mockLeads`, `mockVehicles`, `mockClients`, dados de gráficos demo, etc.).
   - Novas tabelas e rotas reais devem coexistir em paralelo, sem quebrar os dados pré-carregados da demonstração.

3. **Zero Poluição de Banco e Isolamento em Memória:**
   - Ações executadas dentro do modo demo (criar lead, arrastar card no Kanban, simular proposta, cadastrar veículo) NÃO devem tentar gravar nas tabelas reais de produção, mantendo as alterações restritas ao estado local/memória da sessão.

4. **Experiência Visual e Interativa Íntegra:**
   - Nenhuma tela de demonstração pode exibir telas de erro (`500`, `401 Unauthorized`, `403 Forbidden` ou spinners de carregamento infinito).
   - A experiência do usuário que testa a demo deve ser 100% fluida, com cronômetros, botões e modais totalmente funcionais.

5. **Critério de Aceite em Testes:**
   - Qualquer PR, commit ou alteração que quebre ou degrade a experiência do Modo Demo será rejeitada automaticamente na suíte de testes.

## 🛑 Cláusula de Não-Regressão, Reuso Estrito e Cirurgia de Código

O Acelera Auto CRM possui arquitetura consolidada, dezenas de telas prontas e mais de 530 testes automatizados ativos. Para preservar a estabilidade e evitar retrabalho, toda IA ou desenvolvedor DEVE obedecer às seguintes diretrizes:

1. **Inspeção Prévia Obrigatória (Look Before You Leap):**
   - Antes de criar qualquer arquivo, hook, Server Action, tabela ou componente, faça uma busca no repositório (`src/hooks`, `src/app/actions`, `src/components`, `supabase/migrations`) para verificar se a funcionalidade ou estrutura similar já existe.
   - Se já existir e estiver funcional, **é terminantemente proibido recriar, renomear ou duplicar** a lógica.

2. **Extensão Cirúrgica vs Reescrita:**
   - Se uma funcionalidade existente precisar de novos parâmetros, integração com TanStack Query ou ajuste de tipagem, faça **modificações mínimas e não-destrutivas (surgical patches)** no arquivo original.
   - Jamais crie arquivos "sombras" ou variantes duplicadas (ex: `action-v2.ts`, `new-hook.ts`).

3. **Imutabilidade Visual e Estrutural:**
   - Telas, layouts, componentes visuais (Kanban, Gráficos, Modais, Cards) e fluxos de UX já homologados não devem sofrer alterações visuais ou refatorações de design, exceto se solicitado explicitamente.

4. **Inviolabilidade de Testes Existentes:**
   - Nenhum teste existente da suíte pode ser deletado ou enfraquecido para acomodar código novo. Novas implementações devem somar testes à suíte sem quebrar os 537+ testes aprovados.
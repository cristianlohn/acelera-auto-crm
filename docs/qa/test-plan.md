# Plano de Testes & Estratégia de QA — Acelera Auto CRM

> Documento de Engenharia de Qualidade, Automação de Testes e Análise de Riscos

---

## 1. Objetivos da Estratégia de Testes

Garantir que o **Acelera Auto CRM** mantenha alta confiabilidade operacional, integridade nos cálculos financeiros de estoque e leads, conformidade com padrões de acessibilidade e estabilidade em todos os fluxos críticos de atendimento comercial.

---

## 2. Pirâmide de Automação de Testes

```
           / \
          / E2E \       <-- Playwright (Fluxos Críticos e Regressão Visual)
         /-------\
        / Integração\   <-- Testing Library + Happy-DOM (Cards, Modais, Dropdowns)
       /-------------\
      /   Unitários   \ <-- Vitest (Formatadores, Regras de Tempo, URLs WhatsApp)
     /-----------------\
```

| Nível de Teste | Ferramentas | Escopo | Frequência de Execução |
|---|---|---|---|
| **Testes Unitários** | Vitest 4+, v8 | Funções puras de formatação (BRL, KM), regras de urgência de leads (BVA), higienização de telefones e geração de deep-links WhatsApp. | A cada commit / pré-push e na esteira de CI. |
| **Testes de Integração** | Testing Library + happy-dom | Renderização de cards de veículos, estados de badges de status, dropdown menus, cópia para clipboard com mocks e formulários modais. | A cada commit / PR na esteira de CI. |
| **Testes Estáticos** | TypeScript (`tsc --noEmit`) + ESLint | Tipagem estrita de contratos de dados (sem `any`), boas práticas de React 19 / Next.js 16 e acessibilidade ARIA. | A cada build e no CI. |
| **Testes E2E (Fase 2)** | Playwright | Navegação ponta-a-ponta entre funil e estoque, persistência no Supabase e fluxos em viewport mobile. | Pré-release e branches de staging/produção. |

---

## 3. Matriz de Rastreabilidade e Cobertura de Testes

### 3.1 Testes Unitários (`src/__tests__/unit/formatters-and-rules.test.ts`)

| ID | Caso de Teste | Regra / Técnica | Resultado Esperado | Status |
|---|---|---|---|---|
| **UT-01** | Formatação de moeda BRL inteira | `formatCurrency(149900)` / EP | Retorna string contendo `R$ 149.900` | ✅ Passou |
| **UT-02** | Formatação de valor zero | `formatCurrency(0)` / BVA | Retorna `R$ 0` | ✅ Passou |
| **UT-03** | Formatação de valor fracionado | `formatCurrency(89990.75)` / BVA | Arredonda para inteiro `R$ 89.991` | ✅ Passou |
| **UT-04** | Formatação de valor milionário | `formatCurrency(1750000)` / EP | Retorna `R$ 1.750.000` | ✅ Passou |
| **UT-05** | Formatação de valor negativo | `formatCurrency(-5000)` / EP | Retorna `-R$ 5.000` | ✅ Passou |
| **UT-06** | Formatação de zero km (0km) | `formatKm(0)` / BVA | Retorna `0 km` | ✅ Passou |
| **UT-07** | Formatação de KM (3 a 4 dígitos) | `formatKm(850)`, `formatKm(5300)` | Retorna `850 km` e `5.300 km` | ✅ Passou |
| **UT-08** | Formatação de KM (5 a 6 dígitos) | `formatKm(34200)`, `formatKm(125800)` | Retorna `34.200 km` e `125.800 km` | ✅ Passou |
| **UT-09** | Limite Inferior Verde (0.0h) | `urgencyLevel(0h)` / BVA | Retorna `'verde'` e `text-green-500` | ✅ Passou |
| **UT-10** | Limite Superior Verde (5.9h) | `urgencyLevel(5.9h)` / BVA | Retorna `'verde'` e `text-green-500` | ✅ Passou |
| **UT-11** | Limite de Transição Amarelo (6.0h) | `urgencyLevel(6.0h)` / BVA | Retorna `'amarelo'` e `text-orange-500` | ✅ Passou |
| **UT-12** | Limite Superior Amarelo (23.9h) | `urgencyLevel(23.9h)` / BVA | Retorna `'amarelo'` e `text-orange-500` | ✅ Passou |
| **UT-13** | Limite de Transição Vermelho (24.0h) | `urgencyLevel(24.0h)` / BVA | Retorna `'vermelho'` e `text-red-500` | ✅ Passou |
| **UT-14** | Faixa Crítica (>24h) | `urgencyLevel(48h)`, `urgencyLevel(72h)` | Retorna `'vermelho'` e `text-red-500` | ✅ Passou |
| **UT-15** | Contato Nulo (`null`) | `urgencyLevel(null)` / BVA | Retorna `'vermelho'` e `text-red-500` | ✅ Passou |
| **UT-16** | Remoção de máscara padrão de telefone | `sanitizePhone("(11) 98765-4321")` | Retorna string `'11987654321'` | ✅ Passou |
| **UT-17** | Preservação de números limpos | `sanitizePhone("21976543210")` | Retorna `'21976543210'` | ✅ Passou |
| **UT-18** | Remoção de caracteres internacionais e pontos | `sanitizePhone("+55 (41) 9.9988-7766")` | Retorna `'5541999887766'` | ✅ Passou |
| **UT-19** | Sanitização de string vazia | `sanitizePhone("")` | Retorna `""` | ✅ Passou |
| **UT-20** | Geração de URL base wa.me com DDI 55 | `whatsappUrl(lead)` | URL base `https://wa.me/5511987654321?text=` | ✅ Passou |
| **UT-21** | Safe URI Encoding com acentos e símbolos | `whatsappUrl(leadEspecial)` | Codifica sem espaços, preserva UTF-8 | ✅ Passou |
| **UT-22** | Emojis e formatação markdown no WhatsApp | `whatsappUrl(lead)` | Inclui saudações, `*carro*` e emojis | ✅ Passou |
| **UT-23** | Sanitização automática em múltiplos formatos | `whatsappUrl(leadComMascara)` | Remove pontos e traços do path | ✅ Passou |
| **UT-24** | Formatação de tempo nulo | `timeAgo(null)` | Retorna `'Sem contato'` | ✅ Passou |
| **UT-25** | Formatação de tempo imediato (< 1min) | `timeAgo(now)` | Retorna `'Agora mesmo'` | ✅ Passou |
| **UT-26** | Formatação em minutos (< 1h) | `timeAgo(45min)` | Retorna `'45min atrás'` | ✅ Passou |
| **UT-27** | Formatação em horas (< 24h) | `timeAgo(4h)` | Retorna `'4h atrás'` | ✅ Passou |
| **UT-28** | Formatação em dias (>= 24h) | `timeAgo(5d)` | Retorna `'5d atrás'` | ✅ Passou |

### 3.2 Testes de Integração (`src/__tests__/integration/vehicle-card.test.tsx`)

| ID | Caso de Teste | Componente / Integração | Verificação | Status |
|---|---|---|---|---|
| **IT-01.1** | Título do Veículo | `VehicleCard` -> DOM | Renderiza `<h3>` com Marca e Modelo | ✅ Passou |
| **IT-01.2** | Versão / Motorização | `VehicleCard` -> DOM | Exibe texto da versão | ✅ Passou |
| **IT-01.3** | Preço Formatado | `VehicleCard` -> DOM | Exibe valor formatado `R$ 149.900` | ✅ Passou |
| **IT-01.4** | Quilometragem | `VehicleCard` -> DOM | Exibe `18.500 km` | ✅ Passou |
| **IT-01.5** | Final da Placa | `VehicleCard` -> DOM | Exibe `...E22` | ✅ Passou |
| **IT-01.6** | Anos Fab/Mod | `VehicleCard` -> DOM | Exibe `2022/2023` | ✅ Passou |
| **IT-01.7** | Semântica ARIA | `VehicleCard` -> Acessibilidade | `<article aria-label="Honda Civic 2022">` | ✅ Passou |
| **IT-02.1** | Badge 'Disponível' | `VehicleCard` -> Badges | Exibe texto e classe `bg-green-500/90` | ✅ Passou |
| **IT-02.2** | Badge 'Reservado' | `VehicleCard` -> Badges | Exibe texto e classe `bg-amber-500/90` | ✅ Passou |
| **IT-02.3** | Badge 'Vendido' | `VehicleCard` -> Badges | Exibe texto e classe `bg-slate-500/90` | ✅ Passou |
| **IT-03.1** | Disparo de Cópia | `VehicleCard` -> Clipboard API | `navigator.clipboard.writeText` chamado 1x | ✅ Passou |
| **IT-03.2** | Payload da Ficha Técnica | `VehicleCard` -> Clipboard API | Payload com emojis, preço, KM e placa | ✅ Passou |
| **IT-04.1** | Feedback Visual de Confirmação | `VehicleCard` -> React State | Exibe `'Copiado! ✓'` após o clique | ✅ Passou |
| **IT-05.1** | Dropdown: Status Reservado | `VehicleCard` -> Radix Menu | Chama `onStatusChange` com `'reservado'` | ✅ Passou |
| **IT-05.2** | Dropdown: Status Vendido | `VehicleCard` -> Radix Menu | Chama `onStatusChange` com `'vendido'` | ✅ Passou |
| **IT-06.1-10** | Modal de Cadastro de Veículo | `NewVehicleModal` -> Lifecycle/Form | Valida abertura, campos obrigatórios, fotos mock, preview e `onAdd` | ✅ Passou |
| **IT-07.1-8** | Gestão de Estoque Completa | `VehiclesPage` -> Full Page | Métricas dinâmicas, busca instantânea, abas de status, empty state e inserção | ✅ Passou |
| **IT-08.1-7** | Relatórios e Indicadores | `ReportsPage` -> Analytics/KPIs | KPIs executivos, filtros por período, funil 5 etapas, canais, ranking e exportação | ✅ Passou |
| **IT-09.1-8** | Gestão de Clientes | `ClientsPage` -> Carteira/CRM | KPIs da carteira, busca instantânea, abas de status, empty state, modal e WhatsApp | ✅ Passou |
| **IT-10.1-6** | Configurações do Sistema | `SettingsPage` -> Sistema/Perfil | 4 abas organizacionais, edição de perfil com salvamento, dados da loja, metas/SLA e tema | ✅ Passou |
| **IT-11.1-6** | Portal Institucional & Vendas | `MarketingPage` -> Landing/SaaS | Header/Nav, Hero duplo CTA, bento grid, calculadora ROI interativa, preços e links | ✅ Passou |
| **IT-12.1-5** | Login e Modo Demonstração | `LoginPage` -> Auth/Sandbox | Renderização, validação de campos, autenticação, modo demo e links de retorno | ✅ Passou |
| **IT-13.1-6** | Cadastro de Concessionária | `RegisterPage` -> Onboarding/Tenant | Trial 14 dias, validação de e-mail/senha, Server Action de provisionamento e links | ✅ Passou |
| **IT-14.1-7** | Backoffice Super Admin & B2B | `SuperAdminPage` -> Backoffice/SaaS | KPIs de MRR/Trials, busca, filtros de status, ativação manual Pix, trial +7d e WhatsApp | ✅ Passou |
| **IT-15.1-7** | Gestão de Equipe & Vagas | `SettingsPage` -> Equipe/Capacidade | Barra de ocupação, lista de membros, convite, trava de limite, modal upgrade e proteção admin | ✅ Passou |
| **IT-16.1-7** | Simulador RBAC & Perfis Demo | `RoleSimulatorBar` -> RBAC/Permissões | Ocultação de Super Admin, seletor de papéis, filtragem no Kanban, relatórios e bloqueio de abas | ✅ Passou |
| **CT-E2E-01** | Fluxo de Leads no Funil | `leads-kanban.spec.ts` | Abertura do modal, preenchimento, criação e renderização na coluna "Novo Lead" | ✅ Passou |
| **CT-E2E-02** | Consulta e Filtros de Estoque | `inventory-filter.spec.ts` | Busca instantânea reativa por modelo e validação do grid de veículos | ✅ Passou |
| **CT-E2E-RESP** | Responsividade e Zero Overflow | `responsive-overflow.spec.ts` | Auditoria de 9 rotas e 3 modais em 3 viewports móveis (375px, 390px, 412px) | ✅ Passou |

---

## 4. Matriz de Análise e Mitigação de Riscos

| Risco Identificado | Severidade | Probabilidade | Impacto no Negócio | Estratégia de Mitigação Implementada |
|---|---|---|---|---|
| **Vazamento de dados entre lojas (Multi-tenant)** | 🔴 Crítica | Baixa | Violação de privacidade e LGPD | Isolamento via PostgreSQL Row Level Security (RLS) no Supabase baseado no `organization_id` do token JWT. |
| **Envio de mensagem para número inválido no WhatsApp** | 🟡 Média | Média | Frustração do vendedor e lead perdido | Higienização estrita com `sanitizePhone` (`\D` regex) e validação de campo obrigatório no modal. |
| **Quebra de build por tipos incompatíveis** | 🟡 Média | Baixa | Interrupção do pipeline de deploy | Execução de `npx tsc --noEmit` como etapa obrigatória e bloqueante no GitHub Actions. |
| **Crash por URLs de imagens inválidas** | 🟢 Baixa | Média | Quebra visual de cards no estoque | Validação com construtor `new URL()` antes de renderizar e fallback visual com ícone de veículo. |
| **Lentidão em dispositivos móveis 4G/3G** | 🟡 Média | Média | Abandono do CRM pelo vendedor em campo | Abordagem mobile-first, zero dependências pesadas, Tailwind CSS com CSS atômico e componentes leves. |

---

## 5. Critérios de Aceite para Releases em Produção

1. **100% de aprovação** nos testes automatizados (`npm test` = 0 falhas).
2. **0 erros no TypeScript estrito** (`npx tsc --noEmit`).
3. **0 erros no ESLint** (`npm run lint`).
4. **Build de produção concluído com sucesso** (`npm run build`).
5. **Aprovação no pipeline do GitHub Actions**.

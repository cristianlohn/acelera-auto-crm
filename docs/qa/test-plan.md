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
        / Integração\   <-- Testing Library + Vitest (Cards, Modais, Dropdowns)
       /-------------\
      /   Unitários   \ <-- Vitest (Formatadores, Regras de Tempo, URLs WhatsApp)
     /-----------------\
```

| Nível de Teste | Ferramentas | Escopo | Frequência de Execução |
|---|---|---|---|
| **Testes Unitários** | Vitest 4+, v8 | Funções puras de formatação (BRL, KM), regras de urgência de leads, higienização de telefones e geração de deep-links WhatsApp. | A cada commit / pré-push e na esteira de CI. |
| **Testes de Integração** | Testing Library + jsdom | Renderização de cards de veículos, estados de badges de status, dropdown menus, cópia para clipboard com mocks e formulários modais. | A cada commit / PR na esteira de CI. |
| **Testes Estáticos** | TypeScript (`tsc --noEmit`) + ESLint | Tipagem estrita de contratos de dados (sem `any`), boas práticas de React 19 / Next.js 16 e acessibilidade ARIA. | A cada build e no CI. |
| **Testes E2E (Fase 2)** | Playwright | Navegação ponta-a-ponta entre funil e estoque, persistência no Supabase e fluxos em viewport mobile. | Pré-release e branches de staging/produção. |

---

## 3. Matriz de Rastreabilidade e Cobertura de Testes

### 3.1 Testes Unitários (`src/__tests__/unit/formatters-and-rules.test.ts`)

| ID | Caso de Teste | Regra / Função | Resultado Esperado | Status |
|---|---|---|---|---|
| **UT-01** | Formatação de moeda BRL inteira | `formatCurrency(149900)` | Retorna string contendo `R$ 149.900` | ✅ Passou |
| **UT-02** | Formatação de moeda valor zero | `formatCurrency(0)` | Retorna `R$ 0` | ✅ Passou |
| **UT-03** | Formatação de valor milionário | `formatCurrency(1500000)` | Retorna `R$ 1.500.000` | ✅ Passou |
| **UT-04** | Formatação de KM com milhar | `formatKm(18500)` | Retorna `18.500 km` | ✅ Passou |
| **UT-05** | Formatação de KM zero | `formatKm(0)` | Retorna `0 km` | ✅ Passou |
| **UT-06** | Lead recente (< 6h) | `urgencyLevel(2h)` | Retorna status `'verde'` e classe `text-green-500` | ✅ Passou |
| **UT-07** | Lead em atenção (6h a 24h) | `urgencyLevel(12h)` | Retorna status `'amarelo'` e classe `text-orange-500` | ✅ Passou |
| **UT-08** | Lead crítico (> 24h) | `urgencyLevel(48h)` | Retorna status `'vermelho'` e classe `text-red-500` | ✅ Passou |
| **UT-09** | Lead sem contato (`null`) | `urgencyLevel(null)` | Retorna status `'vermelho'` e classe `text-red-500` | ✅ Passou |
| **UT-10** | Higienização de telefone com máscara | `sanitizePhone("(11) 98765-4321")` | Retorna string limpa `'11987654321'` | ✅ Passou |
| **UT-11** | Geração de URL WhatsApp com DDI | `whatsappUrl(lead)` | Gera URL `https://wa.me/55...` codificada com nome e veículo | ✅ Passou |

### 3.2 Testes de Integração (`src/__tests__/integration/vehicle-card.test.tsx`)

| ID | Caso de Teste | Componente | Verificação | Status |
|---|---|---|---|---|
| **IT-01** | Renderização de atributos do veículo | `VehicleCard` | Verifica exibição de Marca, Modelo, Preço BRL, KM, Placa e Anos | ✅ Passou |
| **IT-02** | Badge flutuante de status | `VehicleCard` | Renderiza `'Disponível'`, `'Reservado'` ou `'Vendido'` conforme prop | ✅ Passou |
| **IT-03** | Cópia de Ficha Técnica | `VehicleCard` | Aciona `navigator.clipboard.writeText` com texto formatado | ✅ Passou |
| **IT-04** | Feedback visual de cópia | `VehicleCard` | Exibe `'Copiado! ✓'` no botão após o clique | ✅ Passou |
| **IT-05** | Alteração de status via Dropdown | `VehicleCard` | Dispara callback `onStatusChange` com o ID e o novo status selecionado | ✅ Passou |

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

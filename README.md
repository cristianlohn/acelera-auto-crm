# 🚗 Acelera Auto CRM

[![CI Quality Pipeline](https://github.com/cristianlohn/acelera-auto-crm/actions/workflows/ci.yml/badge.svg)](https://github.com/cristianlohn/acelera-auto-crm/actions/workflows/ci.yml)

> Sistema SaaS *mobile-first* de CRM e Gestão de Pátio para revendas e concessionárias de veículos.

![CI Status](https://img.shields.io/github/actions/workflow/status/cristianlohn/acelera-auto-crm/ci.yml?branch=main&label=CI%20Pipeline&logo=github)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0%20Strict-blue?logo=typescript)
![Next.js](https://img.shields.io/badge/Next.js-16.3%20App%20Router-black?logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwind-css)
![Vitest](https://img.shields.io/badge/Vitest-4.1-6e9f18?logo=vitest)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20RLS-3ecf8e?logo=supabase)

---

## 🌟 Principais Funcionalidades

- 📊 **Funil Kanban de Vendas (`/leads`)**:
  - 5 colunas de negociação: *Novo Lead*, *Em Atendimento*, *Visita/Test-Drive*, *Proposta/Financiamento* e *Venda Concluída*.
  - Indicador de urgência do contato (🟢 < 6h, 🟠 6-24h, 🔴 > 24h sem contato).
  - Disparo de mensagem no WhatsApp com 1 clique (`wa.me`) contendo mensagem personalizada com o carro de interesse do cliente.
  - Cadastro ágil de leads com modal responsivo.

- 🚗 **Gestão de Estoque de Veículos (`/vehicles`)**:
  - Métricas de topo em tempo real: Total em Estoque, Valor do Pátio (R$), Veículos Reservados e Ticket Médio.
  - Busca instantânea por marca, modelo e placa.
  - Filtros rápidos por status (*Todos*, *Disponíveis*, *Reservados*, *Vendidos*).
  - Ação rápida de **"Copiar Ficha Técnica"** pronta para WhatsApp com formatação e emojis.
  - Alteração de status com dropdown interativo diretamente no card.
  - Modal de cadastro de novos veículos com preview de foto e sugestões rápidas.

- 📱 **Experiência Mobile-First**:
  - Menu retrátil gaveta (*Sheet*) para smartphones.
  - Sidebar fixa para visualização em desktops e tablets.
  - Layouts fluidos e touch-friendly.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Framework Web** | [Next.js 16 (App Router)](https://nextjs.org/) |
| **Linguagem** | [TypeScript 5 (Strict Mode)](https://www.typescriptlang.org/) |
| **Estilização** | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| **Componentes Acessíveis** | [Radix UI](https://www.radix-ui.com/) |
| **Ícones** | [Lucide React](https://lucide.dev/) |
| **Banco de Dados & Auth** | [Supabase (PostgreSQL 15+ com RLS)](https://supabase.com/) |
| **Testes Automatizados** | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) |
| **CI/CD** | [GitHub Actions](https://github.com/features/actions) |

---
## 🎯 Garantia da Qualidade & Automação de Testes

O projeto segue padrões formais de Engenharia de Qualidade de Software:
* **Matriz de Rastreabilidade (RTM):** [Consulte a RTM completa aqui](./docs/qa/traceability-matrix.md).
* **Plano de Testes:** [Consulte o plano de testes aqui](./docs/qa/test-plan.md).
* **Técnicas Aplicadas:** Análise de Valor Limite (BVA), Partição de Equivalência (EP) e Testes de Transição de Estado.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js 20 LTS ou superior
- npm 10+

### Instalação e Execução Local

```bash
# 1. Clone o repositório
git clone https://github.com/cristianlohn/acelera-auto-crm.git
cd acelera-auto-crm

# 2. Instale as dependências
npm install --legacy-peer-deps

# 3. Configure as variáveis de ambiente
cp .env.example .env.local  # (se aplicável)

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador para acessar o CRM.

---

## 🧪 Testes e Qualidade de Código

O projeto conta com uma suíte de testes unitários e de integração com cobertura de código:

```bash
# Executar todos os testes uma vez
npm test

# Executar testes em modo interativo (watch)
npm run test:watch

# Executar testes com relatório de cobertura (v8)
npm run test:coverage

# Verificar tipagem TypeScript estrita
npm run type-check

# Executar o linter (ESLint)
npm run lint

# Gerar build de produção
npm run build
```

---

## 📚 Documentação Técnica Completa

Consulte a documentação detalhada na pasta `docs/`:

- 🏗️ [**Arquitetura Técnica & Schema Supabase**](docs/technical-architecture.md) — Design do sistema, modelo relacional, isolamento multi-tenant e segurança RLS.
- 📖 [**Manual do Usuário**](docs/user-manual.md) — Guia operacional para vendedores e gerentes de pátio.
- 🎯 [**Plano de Testes & Matriz de Risco**](docs/qa/test-plan.md) — Pirâmide de testes, matriz de rastreabilidade e critérios de release.

---

## 📄 Licença

Este projeto é desenvolvido para uso comercial e proprietário sob as diretrizes do **Acelera Auto CRM**.

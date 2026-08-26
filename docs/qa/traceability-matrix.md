# Matriz de Rastreabilidade de Testes (RTM)

**Projeto:** Acelera Auto CRM  
**Padrão:** ISTQB / IEEE 829  
**Cobertura Atual:** 100% das Regras de Negócio e Componentes Críticos  
**Última Atualização:** Agosto de 2026  

---

### Visão Geral dos Requisitos de Negócio

| ID Requisito | Nome do Requisito | Descrição Resumida |
| :--- | :--- | :--- |
| **REQ-CRM-01** | Gestão de Leads via Funil Kanban | Visualização por colunas, métricas reativas e adição de novos leads em tempo real. |
| **REQ-CRM-02** | SLA e Urgência de Atendimento | Identificação visual do tempo sem contato para evitar perda de oportunidades. |
| **REQ-CRM-03** | Integração e Deep-Link WhatsApp | Formatação e higienização de contatos para disparar mensagens pré-formatadas. |
| **REQ-CRM-04** | Gestão de Estoque e Ficha Rápida | Consulta de veículos, alteração de status e cópia rápida de ficha técnica com emojis. |
| **REQ-CRM-05** | Formatação e Métricas Financeiras | Exibição correta de moeda BRL (R$), cálculo de pátio, ticket médio e quilometragem. |
| **REQ-CRM-06** | Cadastro Ágil de Veículos | Modal de cadastro com validação de campos obrigatórios, fotos mock e preview de URL. |
| **REQ-CRM-07** | Relatórios e Indicadores Comerciais | KPIs executivos, filtros por período, funil comercial, eficiência de canais e ranking de vendedores. |
| **REQ-CRM-08** | Gestão de Clientes e Carteira | Métricas de carteira, busca reativa, abas de status, deep link WhatsApp e cadastro de clientes. |
| **REQ-CRM-09** | Configurações do Sistema e Perfil | Abas de perfil, dados da concessionária, parâmetros de SLA/metas, tema e preferências de aviso. |
| **REQ-CRM-10** | Portal Institucional e Demonstração | Landing page de vendas, hero com duplo CTA, bento grid de recursos, calculadora ROI e planos. |
| **REQ-CRM-11** | Responsividade e Zero Overflow Mobile | Garantia de zero scroll horizontal em viewports móveis (375px, 390px, 412px) e modais compatíveis. |
| **REQ-CRM-12** | Autenticação e Modo Demonstração Sandbox | Login tradicional por e-mail/senha, acesso rápido ao tenant demo em 1 clique e proteção de rotas via middleware. |
| **REQ-CRM-13** | Cadastro Self-Service e Provisionamento de Tenant | Cadastro de concessionária com trial de 14 dias, provisionamento de organização, perfil admin e validação. |
| **REQ-CRM-14** | Painel Backoffice Super Admin e Gestão de Assinaturas B2B | Métricas de MRR/SaaS, filtros de lojas, ativação manual de planos, extensão de trial e contatos WhatsApp. |
| **REQ-CRM-15** | Gestão de Equipe e Controle de Capacidade Multi-Tenant | Cota de vendedores por plano, convite de colaboradores, trava de vagas, modal de upgrade e proteção de admin. |
| **REQ-CRM-16** | Controle de Acesso RBAC e Simulador de Papéis Demo | Ocultação de Super Admin da sidebar, alternador de papéis (Vendedor, Gerente, Admin) e filtros por perfil em tempo real. |
| **REQ-CRM-17** | SEO Técnico, OpenGraph e Metadados de Indexação | Metadados globais, OpenGraph pt_BR, imagem OG dinâmica, sitemap.xml, robots.txt seguro e manifest PWA. |

---

### Matriz de Rastreabilidade Completa (RTM)

| ID Req | ID Cenário | Cenário de Teste (Comportamento Esperado) | Nível | Técnica de Teste | Arquivo de Teste | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-CRM-05** | **CT-UT-01** | Formatar valores numéricos inteiros para o padrão monetário brasileiro BRL (`R$`). | Unitário | Partição de Equivalência | `formatters-and-rules.test.ts` | **PASS** |
| **REQ-CRM-05** | **CT-UT-02** | Formatar valores numéricos decimais ou com zero para o padrão BRL (`R$ 0`). | Unitário | Análise de Valor Limite (BVA) | `formatters-and-rules.test.ts` | **PASS** |
| **REQ-CRM-05** | **CT-UT-03** | Formatar números inteiros de KM com separador de milhar e sufixo `km`. | Unitário | Partição de Equivalência | `formatters-and-rules.test.ts` | **PASS** |
| **REQ-CRM-02** | **CT-UT-04** | Classificar lead como **OK (🟢)** quando o tempo sem contato for estritamente menor que 6 horas (limite 5.9h). | Unitário | Análise de Valor Limite (BVA) | `formatters-and-rules.test.ts` | **PASS** |
| **REQ-CRM-02** | **CT-UT-05** | Classificar lead como **Warning (🟠)** quando o tempo sem contato estiver entre 6h e 23.9h (limites 6.0h e 23.9h). | Unitário | Análise de Valor Limite (BVA) | `formatters-and-rules.test.ts` | **PASS** |
| **REQ-CRM-02** | **CT-UT-06** | Classificar lead como **Urgent (🔴)** quando o tempo sem contato for >= 24 horas (limite 24.0h) ou nulo. | Unitário | Análise de Valor Limite (BVA) | `formatters-and-rules.test.ts` | **PASS** |
| **REQ-CRM-03** | **CT-UT-07** | Higienizar telefone removendo caracteres especiais e garantindo o prefixo DDI `55`. | Unitário | Partição de Equivalência | `formatters-and-rules.test.ts` | **PASS** |
| **REQ-CRM-03** | **CT-UT-08** | Gerar URL codificada (`encodeURIComponent`) preservando acentuação do cliente e modelo do carro. | Unitário | Teste de Robustez de Strings | `formatters-and-rules.test.ts` | **PASS** |
| **REQ-CRM-04** | **CT-IT-01** | Renderizar card de veículo com dados de preço, versão, KM, ano e placa corretamente. | Integração | Validação de Renderização DOM | `vehicle-card.test.tsx` | **PASS** |
| **REQ-CRM-04** | **CT-IT-02** | Exibir classes visuais e badges corretas para status *Disponível*, *Reservado* e *Vendido*. | Integração | Transição de Estados | `vehicle-card.test.tsx` | **PASS** |
| **REQ-CRM-04** | **CT-IT-03** | Acionar Clipboard API com a ficha técnica estruturada ao clicar no botão "Copiar Ficha Técnica". | Integração | Simulação de Eventos de Usuário | `vehicle-card.test.tsx` | **PASS** |
| **REQ-CRM-04** | **CT-IT-04** | Exibir feedback visual temporário "Copiado! ✓" durante o intervalo de 2 segundos. | Integração | Validação de Estado Efêmero | `vehicle-card.test.tsx` | **PASS** |
| **REQ-CRM-04** | **CT-IT-05** | Disparar callback `onStatusChange` com os parâmetros corretos ao trocar o status no dropdown. | Integração | Teste de Comunicação de Props | `vehicle-card.test.tsx` | **PASS** |
| **REQ-CRM-06** | **CT-IT-06** | Validar abertura do modal, campos obrigatórios, seleção de fotos mock, preview de URL e submissão com `onAdd`. | Integração | Teste de Formulários e Estados | `new-vehicle-modal.test.tsx` | **PASS** |
| **REQ-CRM-04** | **CT-IT-07** | Renderizar grid de veículos, métricas de pátio dinâmicas, busca instantânea, abas de status e empty state. | Integração | Integração de Página Completa | `vehicles-page.test.tsx` | **PASS** |
| **REQ-CRM-07** | **CT-IT-08** | Renderizar KPIs executivos em BRL, alternância de períodos, funil de conversão, canais, ranking de vendedores e exportação. | Integração | Validação de Analytics e Métricas | `reports-page.test.tsx` | **PASS** |
| **REQ-CRM-08** | **CT-IT-09** | Renderizar KPIs da carteira, busca reativa (nome/telefone), empty state, abas de status, modal de cliente e WhatsApp URL. | Integração | Gestão de Carteira e Clientes | `clients-page.test.tsx` | **PASS** |
| **REQ-CRM-09** | **CT-IT-10** | Renderizar 4 abas de configurações, edição de perfil com salvamento, dados da loja, metas/SLA e preferências de tema. | Integração | Configurações e Parâmetros | `settings-page.test.tsx` | **PASS** |
| **REQ-CRM-10** | **CT-IT-11** | Renderizar Header/Nav institucional, Hero de alta conversão, bento grid, calculadora ROI interativa, preços e links demo. | Integração | Portal Institucional e Vendas | `marketing-page.test.tsx` | **PASS** |
| **REQ-CRM-12** | **CT-IT-12** | Renderizar tela de login, validação de campos obrigatórios, autenticação por credenciais e acesso instantâneo ao modo demonstração. | Integração | Autenticação e Gestão de Sessão | `login-page.test.tsx` | **PASS** |
| **REQ-CRM-13** | **CT-IT-13** | Renderizar tela de cadastro com trial 14 dias, validação de e-mail/senha, provisionamento de novo tenant e tratamento de duplicidade. | Integração | Onboarding e Provisionamento de Tenant | `register-page.test.tsx` | **PASS** |
| **REQ-CRM-14** | **CT-IT-14** | Renderizar KPIs B2B (MRR, Trials), busca/filtros por status, ativação manual Pix/Boleto, extensão de trial (+7d) e WhatsApp. | Integração | Backoffice Super Admin & Faturamento B2B | `superadmin-page.test.tsx` | **PASS** |
| **REQ-CRM-15** | **CT-IT-15** | Renderizar barra de vagas, listagem com cargos/status, convite de vendedores, trava de limite, modal upgrade e proteção admin. | Integração | Gestão de Equipe & Capacidade | `team-settings.test.tsx` | **PASS** |
| **REQ-CRM-16** | **CT-IT-16** | Ocultar Super Admin da sidebar, renderizar simulador RBAC, alternar visões (Vendedor/Gerente/Admin), filtrar leads e bloquear abas. | Integração | RBAC & Simulador Demo | `rbac-demo-simulator.test.tsx` | **PASS** |
| **REQ-CRM-17** | **CT-IT-17** | Validar metadados globais, OpenGraph pt_BR, geração de imagem OG (1200x630), sitemap.xml, robots.txt e manifest PWA. | Integração | SEO Técnico & Indexação | `seo-metadata.test.ts` | **PASS** |
| **REQ-CRM-01** | **CT-E2E-01** | Preencher formulário no modal de novo lead e verificar se o card entra no topo da coluna "Novo Lead". | E2E | Jornada de Usuário Ponta a Ponta | `e2e/leads-kanban.spec.ts` | **PASS** |
| **REQ-CRM-04** | **CT-E2E-02** | Filtrar estoque por termo de busca instantânea e validar atualização dos cards exibidos. | E2E | Jornada de Usuário Ponta a Ponta | `e2e/inventory-filter.spec.ts` | **PASS** |
| **REQ-CRM-11** | **CT-E2E-RESP** | Auditar todas as 9 rotas em 3 viewports móveis (375px, 390px, 412px) garantindo zero scroll horizontal e modais responsivos. | E2E | Responsividade e Viewport Regression | `e2e/responsive-overflow.spec.ts` | **PASS** |
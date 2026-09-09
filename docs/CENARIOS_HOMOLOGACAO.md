# Manual Oficial de Cenários de Homologação (UAT) — Acelera Auto CRM

> **Plano de Testes de Aceitação de Usuário (User Acceptance Testing - UAT)**  
> **Versão:** 0.1.0  
> **Status:** Homologado para Operação Comercial  
> **Ambiente Alvo:** Pré-Produção (Staging) e Demonstração Executiva  
> **Cobertura:** 100% das Jornadas Críticas do Sistema  

---

## Sumário de Cenários de Teste

1. [Seção 1: Entrada na Demo e Isolamento de Sessão](#1-entrada-na-demo-e-isolamento-de-sessão)
2. [Seção 2: Operação do Funil de Vendas (Kanban & Lista)](#2-operação-do-funil-de-vendas-kanban--lista)
3. [Seção 3: Ações Rápidas de WhatsApp (1-Clique)](#3-ações-rápidas-de-whatsapp-1-clique)
4. [Seção 4: Roleta Comercial & Ingestão de Leads via Webhook](#4-roleta-comercial--ingestão-de-leads-via-webhook)
5. [Seção 5: Engine Adaptativa de SLA & Horários de Atendimento (Feirão / Plantão)](#5-engine-adaptativa-de-sla--horários-de-atendimento-feirão--plantão)
6. [Seção 6: Cockpit Executivo do Gestor ("Dinheiro na Mesa")](#6-cockpit-executivo-do-gestor-dinheiro-na-mesa)
7. [Seção 7: Módulo de Relatórios Executivos & Carteira de Clientes](#7-módulo-de-relatórios-executivos--carteira-de-clientes)
8. [Seção 8: Gestão de Estoque, Margens & FIPE de Referência](#8-gestão-de-estoque-margens--fipe-de-referência)
9. [Seção 9: Protocolo de Encerramento e Aprovação](#9-protocolo-de-encerramento-e-aprovação)

---

## 1. Entrada na Demo e Isolamento de Sessão

### UAT-DEMO-01: Acesso Inicial pelo Botão "Experimentar Demo"
- **Perfil do Usuário:** Anônimo (Visitante / Lojista Prospect).
- **Pré-condições:** Navegador em modo anônimo ou sem cookies prévios de autenticação.
- **Passo a Passo de Ação:**
  1. Acessar a página inicial (`/`).
  2. Clicar no botão de CTA primário `"Experimentar Demonstração"` no cabeçalho ou Hero.
  3. Observar a navegação e a gravação do cookie de sessão `acelera_demo_mode=true`.
- **Resultado Esperado Exato:**
  - Redirecionamento instantâneo (< 500ms) para a rota canônica `/dashboard/leads`.
  - Banner superior no topo da tela exibindo: badge `[ MODO DEMONSTRAÇÃO ]` com opção de alternar entre os papéis de demonstração: *Gestor (Admin)* e *Vendedor (Rafael Alves)*.
  - Zero spinners de carregamento infinito ou telas de erro 401/403/500.
- **Critério de Falha Crítica:** Redirecionar para `/login`, exigir credenciais de e-mail/senha ou falhar com erro de servidor.

---

### UAT-DEMO-02: Consistência Canônica do Dataset Demo (24 Oportunidades / R$ 215.800)
- **Perfil do Usuário:** Gestor (Modo Demo).
- **Pré-condições:** Sessão demo ativa na rota `/dashboard/leads`.
- **Passo a Passo de Ação:**
  1. No cabeçalho do funil Kanban, inspecionar o contador de leads.
  2. Contar a distribuição visual de cards entre as 5 colunas do funil.
  3. Abrir a coluna `"Venda Fechada"` e somar os valores das 3 vendas concluídas.
- **Resultado Esperado Exato:**
  - O cabeçalho exibe exatamente: `21 leads ativos (3 fechados)` e valor em negociação consolidado.
  - Distribuição exata das 24 oportunidades:
    - Coluna 1 (Novo Lead): exatamente 6 cards (com semáforo vermelho > 15 min na roleta).
    - Coluna 2 (Em Atendimento): exatamente 8 cards.
    - Coluna 3 (Visita / Test-Drive): exatamente 4 cards.
    - Coluna 4 (Proposta): exatamente 3 cards (atribuídos a Lucas Santana com alerta de > 24h).
    - Coluna 5 (Venda Fechada): exatamente 3 cards:
      - Roberto Mendes: Toyota Corolla Altis 2022 — **R$ 90.000**.
      - Marcos Vinicius: Jeep Compass Longitude 2021 — **R$ 52.900**.
      - Fernanda Lima: Chevrolet Tracker Premier 2022 — **R$ 72.900**.
      - Soma total das vendas ganhas: exatamente **R$ 215.800**.
- **Critério de Falha Crítica:** Contagem total divergente de 24 oportunidades ou soma de vendas ganhas divergente de R$ 215.800.

---

### UAT-DEMO-03: Bloqueio Transacional de Faturamento e Billing no Modo Demo
- **Perfil do Usuário:** Gestor (Modo Demo).
- **Pré-condições:** Sessão demo ativa.
- **Passo a Passo de Ação:**
  1. Clicar no menu lateral em `"Faturamento"` ou navegar para `/billing`.
  2. Clicar em qualquer botão de contratação ou upgrade de plano (ex: *"Assinar Plano Pro"*).
- **Resultado Esperado Exato:**
  - A tela exibe o estado demonstrativo do faturamento com selo de simulação.
  - Nenhuma cobrança real é gerada no gateway Asaas.
  - Toast informativo ou modal amigável: `"Ação indisponível no Modo Demonstração. Crie sua conta gratuita para assinar um plano."`
- **Critério de Falha Crítica:** Redirecionar para tela de checkout real com cobrança de cartão de crédito no Asaas sob a conta demo.

---

### UAT-DEMO-04: Operação em Modo de Demonstração e Isolamento Estrito de Memória (Zero Poluição do Supabase)
- **Perfil do Usuário:** Visitante / Gestor Comercial (Modo Demonstração).
- **Pré-condições:** Sessão demo ativa iniciada pelo botão `"Experimentar Demonstração"` em `/`.
- **Passo a Passo de Ação:**
  1. Na rota `/dashboard/leads`, clicar em `"+ Novo Lead"`. Preencher: Nome: `"Cliente Homologação Demo"`, Telefone: `"(11) 99999-0001"`, Veículo: `"Fiat Pulse 2023"`, e salvar.
  2. Arrastar o card recém-criado de `"Novo Lead"` para `"Em Atendimento"` e em seguida para `"Visita / Test-Drive"`.
  3. No menu lateral, navegar para `/vehicles` e cadastrar um novo veículo: `"Chevrolet Onix RS 2024"`, Preço: `R$ 95.000`, Custo: `R$ 82.000`.
  4. Navegar para `/settings?tab=sla` e alterar o horário de sábado para `"08:00 às 16:00"` com regime de plantão.
  5. Clicar em salvar horários e observar a resposta da Server Action.
  6. Consultar a base PostgreSQL do Supabase (tabelas `public.leads`, `public.vehicles`, `public.organizations`).
  7. Pressionar `F5` (recarregar página) no navegador.
- **Resultado Esperado Exato:**
  - Todas as operações na UI ocorrem instantaneamente (< 100ms) com feedback tátil de sucesso (toasts informativos).
  - Nenhuma linha ou mutação (INSERT / UPDATE / DELETE) é registrada nas tabelas de produção do Supabase.
  - A conta do tenant ativo na demo (`DEFAULT_DEMO_ORG_ID`: `a0000000-0000-0000-0000-000000000001`) mantém isolamento total.
  - Ao recarregar a página, a aplicação restaura o dataset canônico oficial de 24 leads (R$ 215.800 fechados) sem degradação ou estado corrompido.
- **Critério de Falha Crítica:** Disparar requisições SQL que gravem registros no banco Supabase ou exibir telas de erro 401/403/500 durante qualquer ação da jornada demo.

---

## 2. Operação do Funil de Vendas (Kanban & Lista)

### UAT-FUNIL-01: Movimentação Otimista de Estágio (Drag-and-Drop)
- **Perfil do Usuário:** Gestor ou Vendedor.
- **Pré-condições:** Tela `/dashboard/leads` carregada com o quadro Kanban visível.
- **Passo a Passo de Ação:**
  1. Localizar o card de `"Vanessa Martins"` na coluna `"Em Atendimento"`.
  2. Arrastar o card e soltar na coluna `"Visita / Test-Drive"`.
- **Resultado Esperado Exato:**
  - O card move-se instantaneamente (< 50ms) para a nova coluna.
  - Toast de sucesso emitido no canto superior direito:  
    `"Vanessa Martins movido para \"Visita / Test-Drive\""` com descrição: `"Veículo: Fiat Pulse Audace 2023"`.
  - O contador da coluna `"Em Atendimento"` decrementa em 1 e o de `"Visita / Test-Drive"` incrementa em 1.
- **Critério de Falha Crítica:** Card retornar à coluna original (snap back), congelamento de tela ou spinner sem resposta.

---

### UAT-FUNIL-02: Alternância de Visualização [ Kanban | Lista ]
- **Perfil do Usuário:** Gestor ou Vendedor.
- **Pré-condições:** Na tela `/dashboard/leads`.
- **Passo a Passo de Ação:**
  1. No canto superior direito da barra de filtros, localizar o alternador `[ Kanban | Lista ]`.
  2. Clicar no botão `"Lista"`.
  3. Observar a transição de visualização.
  4. Clicar no botão `"Kanban"`.
- **Resultado Esperado Exato:**
  - Ao clicar em `"Lista"`, o grid de 5 colunas dá lugar a uma tabela executiva com colunas: Nome, Telefone/WhatsApp, Veículo de Interesse, Estágio, Vendedor e SLA.
  - O totalizador de oportunidades `21 leads ativos (3 fechados)` permanece idêntico e consistente.
  - Ao clicar em `"Kanban"`, o quadro original é restaurado com todas as posições preservadas.
- **Critério de Falha Crítica:** Tabela lista vazia, quebra de layout responsivo ou perda dos filtros ativos.

---

### UAT-FUNIL-03: Filtro de Leads por Consultor Comercial
- **Perfil do Usuário:** Gestor.
- **Pré-condições:** Visão panorâmica de gestor com múltiplos vendedores.
- **Passo a Passo de Ação:**
  1. Clicar no dropdown de filtro `"Todos os vendedores"`.
  2. Selecionar o vendedor `"Lucas Santana"`.
- **Resultado Esperado Exato:**
  - O quadro filtra imediatamente exibindo apenas os leads sob responsabilidade de Lucas Santana:
    - 1 lead na coluna Novo (`Renato Barros`).
    - 2 leads na coluna Visita (`Gustavo Antunes`, `Heloisa Ramos`).
    - 3 leads na coluna Proposta (`Luciana Prado`, `Rodrigo Meirelles`, `Mariana Albuquerque`).
    - 0 leads em Venda Fechada.
  - Total exibido: 6 oportunidades atribuídas a Lucas.
- **Critério de Falha Crítica:** Exibir leads de outros vendedores (ex: Rafael Alves) enquanto o filtro de Lucas estiver selecionado.

---

### UAT-FUNIL-04: Descarte de Oportunidade com Motivo Obrigatório (Perdido / Lost)
- **Perfil do Usuário:** Vendedor ou Gestor.
- **Pré-condições:** Card de lead ativo em qualquer coluna do Kanban.
- **Passo a Passo de Ação:**
  1. Arrastar um lead para o rodapé ou clicar no menu de opções do card `[...]` e escolher `"Marcar como Perdido"`.
  2. Observar a abertura do modal de confirmação de perda.
  3. Tentar submeter sem preencher o motivo.
  4. Selecionar o motivo `"Comprou na concorrência"` e confirmar.
- **Resultado Esperado Exato:**
  - O sistema impede o descarte com campo vazio (validação obrigatória).
  - Após selecionar o motivo válido, o card é removido das colunas ativas.
  - Toast de alerta: `"{Nome} marcado como Perdido"` com descrição: `"Motivo: Comprou na concorrência"`.
  - O contador de leads ativos decrementa, preservando a contagem histórica nos relatórios.
- **Critério de Falha Crítica:** Permitir marcar como perdido sem motivo ou manter o card como lead ativo no topo do funil.

---

## 3. Ações Rápidas de WhatsApp (1-Clique)

### UAT-WPP-01: Disparo de Ação Rápida via 1-Clique no Card
- **Perfil do Usuário:** Vendedor.
- **Pré-condições:** Card de lead visível no Kanban com número de telefone válido.
- **Passo a Passo de Ação:**
  1. No card de `"Leandro Cunha"`, clicar no botão verde de WhatsApp `"Chamar"`.
  2. Inspecionar a URL da nova aba aberta no navegador.
- **Resultado Esperado Exato:**
  - Abertura de nova aba sem bloquear a tela do CRM direcionando para:
    `https://wa.me/5511988882222?text=...`
  - Mensagem codificada no parâmetro `text`:
    `"Olá Leandro Cunha, sou o Rafael Alves da Concessionária Acelera Auto. Vi seu interesse no Jeep Renegade Longitude 2023. Como posso te ajudar hoje?"`
- **Critério de Falha Crítica:** Link com telefone sem o DDI `55`, caracteres malformados ou bloqueio de pop-up agressivo.

---

### UAT-WPP-02: Resgate de Proposta Parada pelo Cockpit do Gestor
- **Perfil do Usuário:** Gestor.
- **Pré-condições:** No Cockpit do Gestor (`/dashboard`), card de ação prescritiva de Lucas Santana visível.
- **Passo a Passo de Ação:**
  1. Localizar a recomendação: `"Lucas Santana - 3 propostas de clientes com mais de 24h sem retorno"`.
  2. Clicar no botão `"Cobrar no WhatsApp"`.
- **Resultado Esperado Exato:**
  - Abertura do link `https://wa.me/5511966665555?text=...` direcionado ao celular de Lucas Santana.
  - Mensagem pré-formatada:  
    `"Oi Lucas, temos 3 propostas de clientes com mais de 24h sem retorno no funil. Consegue fazer um follow-up com eles hoje?"`
  - O botão no CRM atualiza visualmente para badge `[ Notificado ]`.
- **Critério de Falha Crítica:** Disparar mensagem para o cliente final em vez do consultor responsável ou abrir link sem mensagem.

---

## 4. Roleta Comercial & Ingestão de Leads via Webhook

### UAT-ROL-01: Ingestão de Lead Externo via cURL e Atribuição Round-Robin
- **Perfil do Usuário:** Sistema Externo / Webhook de Portal (Webmotors / Meta Ads).
- **Pré-condições:** Chave de API ativa `ak_live_test_123` e roleta com 4 vendedores ativos (Rafael Alves, Camila Dias, Lucas Santana, Beatriz Rocha).
- **Passo a Passo de Ação:**
  1. Executar o comando cURL no terminal:
     ```bash
     curl -X POST "http://localhost:3000/api/v1/webhooks/leads" \
       -H "Content-Type: application/json" \
       -H "x-api-key: ak_live_test_123" \
       -d '{
         "name": "Carlos Eduardo Teste",
         "phone": "(11) 98765-4321",
         "origin": "webmotors",
         "vehicle_interest": "Toyota Yaris XLS 2023"
       }'
     ```
  2. Inspecionar a resposta HTTP do endpoint.
  3. Atualizar o Kanban e verificar na coluna `"Novo Lead"`.
- **Resultado Esperado Exato:**
  - Resposta HTTP com status `201 Created` contendo:
    ```json
    {
      "success": true,
      "lead": {
        "name": "Carlos Eduardo Teste",
        "status": "novo",
        "assigned_to_name": "Rafael Alves",
        "origin": "webmotors"
      }
    }
    ```
  - Disparar um segundo cURL imediatamente: o segundo lead é atribuído a `"Camila Dias"` (avanço do cursor round-robin).
  - Telefone sanitizado no banco para `5511987654321`.
- **Critério de Falha Crítica:** Retornar status 401 para chave válida, status 500 ou atribuir ambos os leads ao mesmo vendedor consecutivamente.

---

### UAT-ROL-02: Exclusão de Vendedor Ausente do Plantão (`in_roulette = false`)
- **Perfil do Usuário:** Gestor.
- **Pré-condições:** Gestor autenticado na tela de equipe (`/dashboard/team`).
- **Passo a Passo de Ação:**
  1. Localizar o consultor `"Lucas Santana"` na tabela de colaboradores.
  2. Desativar o toggle de plantão (alterando status de `"Ativo no Plantão"` para `"Pausado"`).
  3. Ingerir 4 leads consecutivos via webhook.
- **Resultado Esperado Exato:**
  - Os leads são distribuídos estritamente entre os 3 consultores restantes (Rafael Alves, Camila Dias e Beatriz Rocha).
  - Zero leads novos são atribuídos a Lucas Santana enquanto o plantão estiver pausado.
- **Critério de Falha Crítica:** A roleta entregar lead para consultor com plantão desativado.

---

---

## 5. Engine Adaptativa de SLA & Horários de Atendimento (Feirão / Plantão)

### UAT-SLA-01: Recebimento de Lead no Domingo à Tarde em Loja Convencional (Congelamento de SLA até Segunda-feira 08:30)
- **Perfil do Usuário:** Gestor Comercial / Vendedor de Plantão.
- **Pré-condições:** Concessionária operando com a jornada padrão automotiva (`DEFAULT_AUTOMOTIVE_SCHEDULE`: Seg-Sex 08:30 às 18:30, Sáb 09:00 às 13:00, Dom Fechado).
- **Passo a Passo de Ação:**
  1. Simular a entrada de um lead no **Domingo às 14:00** via webhook ou formulário público.
  2. Verificar o lead na coluna `"Novo Lead"` no Domingo às 18:00 (4 horas após a criação).
  3. Acessar o sistema na **Segunda-feira às 08:40** (10 minutos após a abertura da loja).
  4. Inspecionar o tempo decorrido no card às **08:45** (15 minutos após a abertura da loja).
  5. Inspecionar o tempo decorrido no card às **08:50** (20 minutos após a abertura da loja).
- **Resultado Esperado Exato:**
  - **No Domingo às 18:00:** O tempo útil decorrido (`calculateBusinessMinutesElapsed`) é exatamente **0 minutos**. O cronômetro de SLA está congelado e o card não apresenta sinal de alerta.
  - **Na Segunda-feira às 08:40:** Tempo útil decorrido = **10 minutos**. O semáforo permanece **Verde** (Dentro da meta).
  - **Na Segunda-feira às 08:45:** Tempo útil decorrido = exatamente **15 minutos** (limite tolerado). O semáforo transita para **Amarelo** (Atenção).
  - **Na Segunda-feira às 08:50:** Tempo útil decorrido = **20 minutos**. O semáforo transita para **Vermelho** (Crítico / Estourado). O Cockpit passa a contabilizar o lead em `"Leads sem retorno (> 15 min)"` e a computar seu valor em `"Valor em Risco"`.
  - As 18 horas e 30 minutos em que a loja esteve fechada (domingo tarde/noite e madrugada de segunda) foram **100% ignoradas**.
- **Critério de Falha Crítica:** Acusar estouro de SLA (> 15 min) antes das 08:45 de segunda-feira ou somar os minutos em que a revenda esteve com as portas fechadas.

---

### UAT-SLA-02: Ativação de Regime de Feirão no Fim de Semana (Contagem de Minutos Úteis e Alerta Operacional)
- **Perfil do Usuário:** Gestor Comercial / Administrador da Loja.
- **Pré-condições:** Gestor autenticado na aba de parâmetros de SLA (`/settings?tab=sla`).
- **Passo a Passo de Ação:**
  1. Localizar o dia **Domingo** na grade semanal de horários de funcionamento.
  2. Ativar o switch para `"Aberto"` e configurar o horário de expediente das **09:00 às 17:00**.
  3. Observar a renderização do badge comemorativo `Regime de Plantão / Feirão` no card do Domingo.
  4. Clicar em `"Salvar Horários de Atendimento"`.
  5. Ingerir um novo lead no **Domingo às 09:15** atribuído à roleta comercial.
  6. Avaliar o card e o Cockpit no **Domingo às 10:00** (45 minutos após a criação do lead durante o Feirão).
- **Resultado Esperado Exato:**
  - Como a loja declarou regime de plantão no domingo, o motor calcula exatamente **45 minutos úteis decorridos** (`10:00 - 09:15 = 45 min`).
  - Como $45\text{ min} > 15\text{ min}$, o semáforo do card torna-se imediatamente **Vermelho** no Kanban.
  - O Cockpit do Gestor (`/dashboard`) incrementa o cartão de gargalo `"Leads sem retorno"` em 1 unidade e exibe recomendação prescritiva de cobrança do consultor de plantão.
- **Critério de Falha Crítica:** O cronômetro de SLA permanecer congelado em 0 minutos durante o horário comercial ativo do Feirão.

---

### UAT-SLA-03: Alternância para Modo 24/7 Contínuo (Central de Atendimento Digital)
- **Perfil do Usuário:** Gestor Comercial de Central Digital / Call Center.
- **Pré-condições:** Gestor acessando a aba `/settings?tab=sla`.
- **Passo a Passo de Ação:**
  1. No topo da configuração de horários, alternar o seletor Master para:  
     `"Modo 24/7 Contínuo"` (Ícone de Raio / Semáforo ininterrupto).
  2. Salvar as configurações da organização.
  3. Avaliar um lead recebido no Domingo às 14:00 na Segunda-feira às 08:45.
- **Resultado Esperado Exato:**
  - O motor analítico computa o tempo corrido integral tradicional:  
    $\Delta_{\text{tempo}} = 18\text{ horas e } 45\text{ minutos} = \mathbf{1125\text{ minutos}}$.
  - O card acusa estouro massivo de SLA e entra em alerta crítico imediato.
- **Critério de Falha Crítica:** O sistema pausar o tempo noturno quando a loja estiver configurada explicitamente em modo contínuo 24/7.

---

## 6. Cockpit Executivo do Gestor ("Dinheiro na Mesa")

### UAT-COCKPIT-01: Coerência Matemática dos Indicadores de Topo
- **Perfil do Usuário:** Gestor Comercial.
- **Pré-condições:** Tela `/dashboard` carregada na Visão do Gestor.
- **Passo a Passo de Ação:**
  1. Observar os 3 cards de topo:
     - Card 1: `Dinheiro na Mesa (Pipeline Total)`.
     - Card 2: `SLA de Primeiro Atendimento`.
     - Card 3: `Conversão do Funil`.
- **Resultado Esperado Exato:**
  - Card 1: Exibe a soma monetária exata das oportunidades em negociação ativa e a tag de alerta: `⚠️ R$ [Valor] em risco por estouro de SLA`.
  - Card 2: Exibe a taxa de conformidade e o subtítulo explicativo:  
    `"6 novos leads na roleta aguardando primeiro contato"`.
  - Card 3: Exibe a taxa de conversão correspondente às 3 vendas concluídas.
- **Critério de Falha Crítica:** Card de SLA indicar "0 leads aguardando" enquanto existirem 6 leads na coluna Novo sem atendimento.

---

### UAT-COCKPIT-02: Alerta dos 4 Cartões de Gargalo Operacional
- **Perfil do Usuário:** Gestor Comercial.
- **Pré-condições:** Na tela `/dashboard`.
- **Passo a Passo de Ação:**
  1. Analisar o grid de 4 cartões de gargalo no centro da tela:
     - Cartão 1: `Leads sem retorno`.
     - Cartão 2: `Propostas sem follow-up`.
     - Cartão 3: `Aguardando financiamento`.
     - Cartão 4: `Leads quentes sem ação hoje`.
- **Resultado Esperado Exato:**
  - Cartão 1: Contagem = exatamente `6`. Subtítulo e Tooltip: `"6 novos leads na roleta aguardando primeiro contato"`.
  - Cartão 2: Contagem = exatamente `3`. Subtítulo: `"3 propostas há mais de 24h sem novo contato"`.
  - A contagem de `3` propostas combina perfeitamente com a recomendação prescritiva para Lucas Santana de 3 propostas paradas há mais de 24h.
- **Critério de Falha Crítica:** Cartão 2 acusar `0` propostas enquanto houver ação prescritiva solicitando cobrança de 3 propostas.

---

## 7. Módulo de Relatórios Executivos & Carteira de Clientes

### UAT-REP-01: Filtro Temporal de Desempenho e Faturamento
- **Perfil do Usuário:** Gestor ou Administrador.
- **Pré-condições:** Na tela de relatórios (`/dashboard/reports` ou `/reports`).
- **Passo a Passo de Ação:**
  1. Observar o seletor de período no topo: `[ 7 dias | 30 dias | Mês Atual ]`.
  2. Selecionar `"Mês Atual"`.
  3. Verificar o faturamento realizado e o ticket médio exibido.
- **Resultado Esperado Exato:**
  - Faturamento Realizado: **R$ 215.800**.
  - Quantidade de Vendas: **3 vendas fechadas**.
  - Ticket Médio calculado: **R$ 71.933**.
  - Taxa de Conversão: **12,5%** (3 vendas em 24 oportunidades).
- **Critério de Falha Crítica:** Faturamento divergente da soma das 3 vendas ganhas do dataset demo.

---

### UAT-REP-02: Ranking Individual de Consultores e SLA Médio
- **Perfil do Usuário:** Gestor.
- **Pré-condições:** Na tela de relatórios (`/reports`).
- **Passo a Passo de Ação:**
  1. Rolar até a tabela `"Desempenho da Equipe Comercial"`.
  2. Inspecionar as linhas dos 4 vendedores.
- **Resultado Esperado Exato:**
  - **1º Rafael Alves:** 2 vendas concluídas (R$ 142.900), SLA médio de **6 min** (Badge Verde).
  - **2º Camila Dias:** 1 venda concluída (R$ 72.900), SLA médio de **7 min** (Badge Verde).
  - **3º Lucas Santana:** 0 vendas concluídas (R$ 0), SLA médio de **11 min** (Badge Amarelo).
  - **4º Beatriz Rocha:** 0 vendas concluídas (R$ 0), SLA médio de **9 min** (Badge Verde).
- **Critério de Falha Crítica:** Exibir nomes divergentes da equipe canônica ou SLA médio superior a 15 min com badge verde.

---

### UAT-REP-03: Carteira de Clientes (/clients)
- **Perfil do Usuário:** Gestor ou Vendedor.
- **Pré-condições:** Navegar para a rota `/clients`.
- **Passo a Passo de Ação:**
  1. Observar a listagem de clientes na carteira.
  2. Inspecionar os compradores e veículos adquiridos.
- **Resultado Esperado Exato:**
  - Exibição dos 3 compradores oficiais derivados das vendas da demo:
    1. **Roberto Mendes:** Compra de Toyota Corolla Altis 2022 (R$ 90.000) — Consultor: Rafael Alves.
    2. **Marcos Vinicius:** Compra de Jeep Compass Longitude 2021 (R$ 52.900) — Consultor: Rafael Alves.
    3. **Fernanda Lima:** Compra de Chevrolet Tracker Premier 2022 (R$ 72.900) — Consultora: Camila Dias.
  - Total de faturamento da carteira: **R$ 215.800**.
- **Critério de Falha Crítica:** Carteira vazia na demo ou exibição de compradores com valores não correlacionados ao funil.

---

### UAT-REP-04: Cálculo Estritamente Dinâmico de Ticket Médio (Faturamento Total ÷ Vendas Concluídas)
- **Perfil do Usuário:** Gestor Comercial / Diretor Financeiro.
- **Pré-condições:** Acesso ao módulo de relatórios executivos (`/dashboard/reports`).
- **Passo a Passo de Ação:**
  1. No seletor de filtros temporais, alternar sequencialmente entre: `7 dias`, `30 dias`, `Mês Atual`, `Trimestre` e `Ano`.
  2. Para cada período, anotar o valor exibido no card `"Faturamento Total"` e no card `"Vendas Fechadas"`.
  3. Observar o valor exibido no card `"Ticket Médio por Veículo"`.
- **Resultado Esperado Exato:**
  - Em todos os períodos, o Ticket Médio é rigorosamente calculado em tempo real via:
    $$\text{averageTicket} = \frac{\text{totalRevenue}}{\text{totalSalesCount}}$$
  - No filtro de Mês Atual / Base Demo: $\text{R\$ } 215.800 / 3 = \mathbf{\text{R\$ } 71.933}$.
  - Caso um filtro selecionado não possua vendas registradas ($0$ vendas), o card exibe com segurança `R$ 0,00` (sem erros de `NaN` ou quebras de renderização).
- **Critério de Falha Crítica:** Exibir valores estáticos divergentes do resultado matemático da divisão de faturamento por vendas.

---

## 8. Gestão de Estoque, Margens & FIPE de Referência

### UAT-EST-01: Cadastro de Veículo com "FIPE de Referência"
- **Perfil do Usuário:** Gestor ou Vendedor.
- **Pré-condições:** Na tela de estoque (`/estoque` ou `/vehicles`).
- **Passo a Passo de Ação:**
  1. Clicar no botão `"+ Cadastrar Veículo"`.
  2. Preencher os dados:
     - Marca: `"Honda"`
     - Modelo: `"HR-V"`
     - Versão: `"Advance 1.5 Turbo"`
     - Ano Fab/Modelo: `2023 / 2023`
     - Preço Anunciado: `R$ 159.900`
     - FIPE de Referência (Valor Informado): `R$ 155.000`
     - Custo de Aquisição: `R$ 142.000`
     - Placa Final: `4E55`
  3. Clicar em `"Salvar Veículo"`.
- **Resultado Esperado Exato:**
  - Veículo cadastrado instantaneamente com status `Disponível`.
  - Card ou linha no grid exibindo:
     - Preço da Loja: `R$ 159.900`.
     - FIPE de Referência: `R$ 155.000`.
     - Margem Bruta Estimada calculada: `R$ 17.900` (`159.900 - 142.000`).
  - Zero bloqueios por validação de serviço externo de FIPE.
- **Critério de Falha Crítica:** Exigir consulta obrigatória a API de terceiros ou calcular margem bruta negativa incorretamente.

---

### UAT-EST-02: Baixa de Veículo Vendido com Bloqueio de Duplicidade
- **Perfil do Usuário:** Gestor.
- **Pré-condições:** Veículo ativo no estoque com status `Disponível`.
- **Passo a Passo de Ação:**
  1. No card do veículo, clicar no dropdown de status e alterar para `"Vendido"`.
  2. Observar a atualização de listagem e tentar associá-lo a uma nova proposta ativa.
- **Resultado Esperado Exato:**
  - O veículo é movido para a aba `"Histórico de Vendidos"`.
  - O veículo deixa de ser listado como disponível para novas propostas.
  - Toast de confirmação: `"Status do veículo atualizado para Vendido"`.
- **Critério de Falha Crítica:** O veículo permanecer visível no pátio ativo após confirmação de venda.

---

### UAT-EST-03: Auditoria dos Cards de Margem no Histórico de Veículos Vendidos (Margem Média vs Margem Total)
- **Perfil do Usuário:** Gestor Comercial / Auditor de Estoque.
- **Pré-condições:** Acessar a rota de estoque e selecionar a aba `"Histórico de Vendidos"` (`/vehicles?tab=vendidos`).
- **Passo a Passo de Ação:**
  1. Inspecionar o grid de 4 MetricCards de consolidação no topo da tela.
  2. Verificar o card `"Margem Média por Veículo"` (Card Violeta):
     - Valor exibido: **R$ 7.933**.
     - Subtítulo: `(R$ 23.800 ÷ 3 veículos)`.
     - Tooltip: `"Média de lucro bruto estimada por unidade vendida (R$ 23.800 ÷ 3 veículos)."`.
  3. Verificar o card `"Margem Bruta Total Realizada"` (Card Esmeralda):
     - Valor exibido: **R$ 23.800**.
     - Subtítulo: `"lucro bruto acumulado"`.
     - Tooltip: `"Soma total das margens brutas de todos os veículos vendidos no histórico (R$ 23.800)."`.
  4. Rolar para os 3 cards individuais de veículos vendidos na grade e verificar suas margens calculadas:
     - **Toyota Corolla Altis 2022:** Venda R$ 90.000 / Custo R$ 80.000 $\rightarrow$ Margem Bruta = **R$ 10.000**.
     - **Jeep Compass Longitude 2021:** Venda R$ 52.900 / Custo R$ 46.000 $\rightarrow$ Margem Bruta = **R$ 6.900**.
     - **Chevrolet Tracker Premier 2022:** Venda R$ 72.900 / Custo R$ 66.000 $\rightarrow$ Margem Bruta = **R$ 6.900**.
  5. Somar as margens: $\text{R\$ } 10.000 + 6.900 + 6.900 = \mathbf{\text{R\$ } 23.800}$.
  6. Dividir por 3: $\text{R\$ } 23.800 / 3 = \mathbf{\text{R\$ } 7.933,33}$.
- **Resultado Esperado Exato:**
  - Coerência matemática absoluta entre os cards consolidadores de topo e as unidades vendidas na listagem.
  - Distinção semântica clara e sem ambiguidades entre margem média unitária e margem total em caixa.
- **Critério de Falha Crítica:** Exibir apenas um card genérico de margem sem especificar se é média ou total, ou apresentar divergência na soma das margens individuais.

---

## 9. Protocolo de Encerramento e Aprovação

| Papel | Responsável | Data da Homologação | Status |
|---|---|:---:|:---:|
| **Engenharia de Software** | Antigravity AI Pair Programming | 09/09/2026 | **APROVADO** |
| **Garantia da Qualidade (QA)** | Suíte Automatizada Vitest (770 Testes) | 09/09/2026 | **APROVADO** |
| **Product Owner (PO)** | Equipe Acelera Auto CRM | 09/09/2026 | **APROVADO** |

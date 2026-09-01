/**
 * @file api.ts
 * @description Tipagens TypeScript geradas automaticamente a partir da especificação OpenAPI 3.0.
 * ATENÇÃO: Não edite este arquivo manualmente. Execute 'npm run generate:api-types:local' para atualizar.
 */

export interface paths {
    "/api/v1/webhooks/webmotors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Ingestão de Propostas e Leads da Webmotors
         * @description Recebe eventos de propostas comerciais e leads diretos do portal Webmotors, mapeia os dados do veículo e da proposta e distribui via Roleta Comercial.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @example WM-9812739 */
                        leadId?: string;
                        /** @example Rodrigo Mendonça */
                        nome: string;
                        /** @example 11977776666 */
                        telefone: string;
                        /**
                         * Format: email
                         * @example rodrigo.mendonca@uol.com.br
                         */
                        email?: string;
                        veiculo?: {
                            /** @example Toyota */
                            marca?: string;
                            /** @example Corolla */
                            modelo?: string;
                            /** @example 2.0 XEi Flex Direct Shift */
                            versao?: string;
                            /** @example 2023 */
                            anoModelo?: number;
                            /** @example 139900 */
                            preco?: number;
                        };
                        proposta?: {
                            /** @example 135000 */
                            valor?: number;
                            /** @example Tenho interesse à vista ou com troca em um Onix 2021. */
                            mensagem?: string;
                            /** @example true */
                            possuiTroca?: boolean;
                        };
                    };
                };
            };
            responses: {
                /** @description Proposta da Webmotors recebida e processada com sucesso. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @example true */
                            success?: boolean;
                            /** @example 00000000-0000-0000-0000-000000000000 */
                            lead_id?: string;
                            /** @example Rafael Alves */
                            assigned_to?: string;
                            /** @example webmotors */
                            portal?: string;
                        };
                    };
                };
                /** @description Dados da proposta inválidos. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Chave de API ausente ou inválida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Erro interno no servidor. */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/webhooks/meta": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Verificação de Webhook do Meta (Facebook/Instagram Lead Ads)
         * @description Endpoint chamado pelos servidores do Meta durante a configuração do Webhook para validação do token de verificação e handshake de segurança.
         */
        get: {
            parameters: {
                query: {
                    "hub.mode": string;
                    "hub.verify_token": string;
                    "hub.challenge": string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Handshake confirmado, retorna o valor de hub.challenge. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": string;
                    };
                };
                /** @description Token de verificação inválido ou modo incorreto. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /**
         * Recepção de Leads do Meta Lead Ads
         * @description Recebe eventos de novos formulários instantâneos preenchidos no Facebook e Instagram Ads, vinculando-os à loja e distribuindo via Roleta Comercial.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @example page */
                        object?: string;
                        entry?: Record<string, never>[];
                    };
                };
            };
            responses: {
                /** @description Evento de Lead do Meta processado com sucesso. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Payload do Meta malformado. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Erro interno no processamento do evento. */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/webhooks/leads": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Ingestão genérica de leads via Webhook
         * @description Recebe leads externos de plataformas como Zapier, n8n, formulários web e Landing Pages. Valida os dados, distribui via Roleta Comercial (se não houver vendedor explícito) e insere no CRM.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @example Carlos Eduardo Silva */
                        name: string;
                        /** @example 11987654321 */
                        phone: string;
                        /**
                         * Format: email
                         * @example carlos.silva@email.com
                         */
                        email?: string;
                        /** @example Jeep Compass Longitude 2024 */
                        vehicle_interest?: string;
                        /** @example landing_page */
                        origin?: string;
                        /** @description Nome do vendedor para atribuição explícita (ignora a roleta se informado). */
                        seller_name?: string;
                        /** @example Cliente solicitou contato urgente no WhatsApp. */
                        notes?: string;
                        custom_fields?: Record<string, never>;
                    };
                };
            };
            responses: {
                /** @description Lead recebido e processado com sucesso. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @example true */
                            success?: boolean;
                            /** @example 00000000-0000-0000-0000-000000000000 */
                            lead_id?: string;
                            /** @example received */
                            status?: string;
                            /** @example Rafael Alves */
                            assigned_to?: string;
                            /** @example Lead recebido e processado com sucesso */
                            message?: string;
                        };
                    };
                };
                /** @description Dados do lead inválidos ou incompletos. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Chave de API ausente ou inválida no cabeçalho x-api-key. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Erro interno no processamento. */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/vehicles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Catálogo e estoque de veículos
         * @description Lista os veículos cadastrados no pátio da concessionária com filtros por marca, modelo, status e faixa de preço.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Filtrar por marca (ex: Toyota, Jeep, Honda). */
                    make?: string;
                    status?: "disponivel" | "reservado" | "vendido" | "all";
                    max_price?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Lista de veículos retornada com sucesso. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Não autorizado. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Erro interno no servidor. */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /**
         * Cadastro de veículo no estoque
         * @description Insere um novo veículo no catálogo da concessionária autenticada.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @example Toyota */
                        make: string;
                        /** @example Corolla Cross */
                        model: string;
                        /** @example XRE 2.0 Flex */
                        version?: string;
                        /** @example 2023 */
                        year_fab: number;
                        /** @example 2024 */
                        year_model: number;
                        /** @example 149900 */
                        price: number;
                        /** @example 18500 */
                        mileage: number;
                        /** @example ABC1D23 */
                        plate_last_digits: string;
                        /** @example Branco Perolizado */
                        color?: string;
                        /**
                         * @default flex
                         * @enum {string}
                         */
                        fuel?: "flex" | "gasolina" | "etanol" | "diesel" | "hibrido" | "eletrico";
                        /**
                         * @default automatico
                         * @enum {string}
                         */
                        transmission?: "automatico" | "manual" | "cvt";
                        /**
                         * @default disponivel
                         * @enum {string}
                         */
                        status?: "disponivel" | "reservado" | "vendido";
                    };
                };
            };
            responses: {
                /** @description Veículo cadastrado com sucesso. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Dados do veículo inválidos. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Não autorizado. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Erro interno no servidor. */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/settings/api-keys": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Lista as chaves de API e integrações do tenant autenticado
         * @description Retorna as chaves de integração geradas para o tenant da concessionária autenticada (com os tokens brutos mascarados).
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Lista de chaves recuperada com sucesso. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Não autorizado (token ausente ou inválido). */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Proibido (usuário não pertence a nenhum tenant). */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /**
         * Criação de nova Chave de API criptográfica para o Tenant
         * @description Gera uma nova chave de integração associada estritamente ao tenant_id e criada por created_by do usuário autenticado (requer perfil admin ou owner). Armazena o Hash SHA-256 no banco e devolve o token bruto em texto claro uma única vez.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @example Integração Meta Ads */
                        name: string;
                        /** @example 90 */
                        expires_in_days?: number;
                    };
                };
            };
            responses: {
                /** @description Chave de API gerada e vinculada ao tenant com sucesso. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            success?: boolean;
                            message?: string;
                            data?: {
                                id?: string;
                                name?: string;
                                /**
                                 * @description Copie esta chave agora; ela não será exibida novamente.
                                 * @example acelera_live_00000000000000000000000000000000
                                 */
                                api_key?: string;
                                /** @example acelera_live_0000... */
                                key_prefix?: string;
                                tenant_id?: string;
                                expires_at?: string | null;
                                created_at?: string;
                            };
                        };
                    };
                };
                /** @description Dados de entrada inválidos. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Token de autenticação não fornecido ou inválido. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Usuário não vinculado a uma organização ou sem permissão. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Erro ao criar chave de API. */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/settings/api-keys/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Revogação de Chave de API do Tenant
         * @description Inativa e revoga imediatamente uma Chave de API da concessionária, bloqueando novos acessos via Webhook ou REST.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description ID da chave de API a ser revogada. */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Chave revogada com sucesso. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Não autorizado. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Proibido (usuário sem tenant). */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Chave não encontrada para este tenant. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Erro interno no servidor. */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leads": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listagem paginada de leads com filtros
         * @description Retorna a lista paginada de leads pertencentes à concessionária autenticada, com suporte a busca textual e filtros de funil e origem.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Número da página. */
                    page?: number;
                    /** @description Quantidade de itens por página (máx 100). */
                    limit?: number;
                    /** @description Filtrar por etapa do funil. */
                    status?: "novo" | "atendimento" | "visita" | "proposta" | "fechado" | "all";
                    /** @description Filtrar pelo canal de origem (webmotors, meta_ads, site, etc). */
                    origin?: string;
                    /** @description Busca por nome, telefone ou e-mail do lead. */
                    search?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Lista de leads recuperada com sucesso. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: Record<string, never>[];
                            page?: number;
                            limit?: number;
                            total?: number;
                            total_pages?: number;
                        };
                    };
                };
                /** @description Token de autenticação ausente ou inválido. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Erro interno no servidor. */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /**
         * Cadastro manual de lead
         * @description Cadastra um novo lead diretamente no CRM, vinculando-o à concessionária autenticada e aplicando atribuição por vendedor ou roleta.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @example Carlos Alberto */
                        name: string;
                        /** @example 11988887777 */
                        phone: string;
                        /**
                         * Format: email
                         * @example carlos.alberto@email.com
                         */
                        email?: string;
                        /** @example Toyota Corolla Cross 2024 */
                        vehicle_interest?: string;
                        /** @example patio_balcao */
                        origin?: string;
                        /**
                         * @default novo
                         * @enum {string}
                         */
                        status?: "novo" | "atendimento" | "visita" | "proposta" | "fechado";
                        /** @example Rafael Alves */
                        seller_name?: string;
                        /** @example Cliente esteve na loja física buscando opções de financiamento. */
                        notes?: string;
                    };
                };
            };
            responses: {
                /** @description Lead cadastrado com sucesso. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Dados do lead inválidos. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Não autorizado. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Erro interno no servidor. */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/leads/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consulta de lead por ID
         * @description Recupera os detalhes completos de um lead específico da concessionária autenticada.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Identificador único do lead. */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Lead encontrado. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Não autorizado. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Lead não encontrado ou não pertence à organização. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Atualização cadastral e movimentação de funil do lead
         * @description Atualiza os dados cadastrais, move a etapa do funil Kanban ou altera o vendedor responsável pelo lead.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        name?: string;
                        phone?: string;
                        email?: string;
                        vehicle_interest?: string;
                        /** @enum {string} */
                        status?: "novo" | "atendimento" | "visita" | "proposta" | "fechado";
                        seller_name?: string;
                        notes?: string;
                    };
                };
            };
            responses: {
                /** @description Lead atualizado com sucesso. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Dados de atualização inválidos. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Lead não encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        trace?: never;
    };
    "/api/v1/distribution/queue": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consulta da fila ativa de vendedores e status do plantão da roleta
         * @description Retorna a lista ordenada de consultores comerciais da concessionária que estão elegíveis e ativos no plantão da Roleta Comercial (in_roulette = true).
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Fila de distribuição retornada com sucesso. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            total_sellers?: number;
                            active_in_roulette?: number;
                            queue?: {
                                id?: string;
                                name?: string;
                                role?: string;
                                segment?: string;
                                in_roulette?: boolean;
                            }[];
                        };
                    };
                };
                /** @description Não autorizado. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Erro interno no servidor. */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/distribution/assign": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Atribuição manual ou redistribuição de lead por roleta
         * @description Permite ao gestor transferir a responsabilidade de um lead para um consultor específico ou acionar o motor de Roleta Comercial para redistribuição automática.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @example 00000000-0000-0000-0000-000000000000 */
                        lead_id: string;
                        /** @example 00000000-0000-0000-0000-000000000000 */
                        seller_id?: string;
                        /** @example Rafael Alves */
                        seller_name?: string;
                        /**
                         * @description Se verdadeiro, ignora o vendedor fornecido e calcula o próximo da fila.
                         * @default false
                         */
                        trigger_roleta?: boolean;
                    };
                };
            };
            responses: {
                /** @description Lead atribuído com sucesso. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Parâmetros de atribuição inválidos. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Não autorizado. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Lead não encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Renovação de sessão de autenticação (Refresh Token)
         * @description Emite um novo par de tokens JWT (access_token e refresh_token) utilizando um refresh_token válido.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * @description Token de renovação de sessão previamente obtido no login.
                         * @example refresh_token_example_0000000000000000
                         */
                        refresh_token: string;
                    };
                };
            };
            responses: {
                /** @description Sessão renovada com sucesso. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @example sample_jwt_access_token_example */
                            access_token?: string;
                            /** @example refresh_token_example_0000000000000000 */
                            refresh_token?: string;
                            /** @example Bearer */
                            token_type?: string;
                            /** @example 3600 */
                            expires_in?: number;
                            user?: {
                                /**
                                 * Format: uuid
                                 * @example 00000000-0000-0000-0000-000000000000
                                 */
                                id?: string;
                                /** @example usuario@concessionaria.com.br */
                                email?: string;
                            };
                        };
                    };
                };
                /** @description Parâmetro refresh_token ausente ou malformatado. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Refresh token expirado ou inválido. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Erro interno no servidor. */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Encerramento de sessão (Logout)
         * @description Invalida o token JWT de acesso e encerra a sessão ativa do usuário no Supabase Auth.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Sessão encerrada com sucesso. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @example Sessão encerrada com sucesso */
                            message?: string;
                        };
                    };
                };
                /** @description Token de autorização JWT ausente ou malformatado. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Erro interno no servidor. */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Autenticação de usuário por e-mail e senha
         * @description Realiza o login do usuário no Acelera Auto CRM e retorna os tokens JWT de acesso (access_token) e renovação (refresh_token).
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * Format: email
                         * @example usuario@concessionaria.com.br
                         */
                        email: string;
                        /**
                         * Format: password
                         * @example senha_exemplo_123
                         */
                        password: string;
                    };
                };
            };
            responses: {
                /** @description Autenticação realizada com sucesso. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description Token JWT de autenticação para o cabeçalho Authorization Bearer.
                             * @example sample_jwt_access_token_example
                             */
                            access_token?: string;
                            /**
                             * @description Token utilizado para renovação da sessão.
                             * @example refresh_token_example_0000000000000000
                             */
                            refresh_token?: string;
                            /** @example Bearer */
                            token_type?: string;
                            /** @example 3600 */
                            expires_in?: number;
                            user?: {
                                /**
                                 * Format: uuid
                                 * @example 00000000-0000-0000-0000-000000000000
                                 */
                                id?: string;
                                /** @example usuario@concessionaria.com.br */
                                email?: string;
                            };
                        };
                    };
                };
                /** @description Payload incompleto ou formato de dados inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Credenciais incorretas ou usuário não autorizado. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Erro interno no servidor. */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: never;
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;

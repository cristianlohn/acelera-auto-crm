/**
 * @file client.ts
 * @description Wrapper HTTP tipado para a API v3 do Asaas utilizando fetch nativo.
 *
 * Funcionalidades:
 * - Resolução segura de credenciais exclusivamente em ambiente de servidor (ASAAS_API_URL, ASAAS_API_KEY).
 * - Fallback padrão para a URL oficial da API v3 do Asaas ('https://api.asaas.com/v3').
 * - Injeção do header de autorização `access_token`.
 * - Timeout configurável com AbortController.
 * - Tratamento padronizado de erros retornados pela API v3 do Asaas (errors[].description).
 */

export interface AsaasApiErrorItem {
  code?: string;
  description: string;
}

export interface AsaasApiErrorResponse {
  errors?: AsaasApiErrorItem[];
  error?: string;
  message?: string;
}

export class AsaasApiError extends Error {
  public readonly status: number;
  public readonly errors: AsaasApiErrorItem[];

  constructor(status: number, message: string, errors: AsaasApiErrorItem[] = []) {
    super(message);
    this.name = "AsaasApiError";
    this.status = status;
    this.errors = errors;
  }
}

export interface AsaasRequestOptions extends Omit<RequestInit, "body"> {
  timeoutMs?: number;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Retorna as credenciais e endpoint base da API do Asaas.
 */
export function getAsaasClientConfig(): { apiUrl: string; apiKey: string } {
  const rawUrl =
    process.env.ASAAS_API_URL ||
    process.env.NEXT_PUBLIC_ASAAS_API_URL ||
    "https://api.asaas.com/v3";

  // Garante que não haja barra no final
  const apiUrl = rawUrl.replace(/\/$/, "");

  const apiKey = (
    process.env.ASAAS_API_KEY ||
    process.env.ASAAS_ACCESS_TOKEN ||
    ""
  ).trim();

  return { apiUrl, apiKey };
}

/**
 * Executa uma requisição HTTP tipada contra a API v3 do Asaas.
 */
export async function asaasRequest<T>(
  endpoint: string,
  options: AsaasRequestOptions = {}
): Promise<T> {
  const { apiUrl, apiKey } = getAsaasClientConfig();

  if (!apiKey) {
    throw new AsaasApiError(
      401,
      "Chave de API do Asaas (ASAAS_API_KEY) não configurada no ambiente."
    );
  }

  const { timeoutMs = 15000, params, body, headers: customHeaders, ...fetchOptions } = options;

  // Montagem de Query Params
  let path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      path += (path.includes("?") ? "&" : "?") + queryString;
    }
  }

  const url = `${apiUrl}${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    access_token: apiKey,
    ...(customHeaders as Record<string, string> | undefined),
  };

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (!response.ok) {
      let errorMessage = `Erro na requisição para a API do Asaas (${response.status} ${response.statusText})`;
      let errorsList: AsaasApiErrorItem[] = [];

      if (isJson) {
        try {
          const errorData = (await response.json()) as AsaasApiErrorResponse;
          if (Array.isArray(errorData.errors) && errorData.errors.length > 0) {
            errorsList = errorData.errors;
            errorMessage = errorData.errors.map((e) => e.description).join("; ");
          } else if (errorData.message || errorData.error) {
            errorMessage = errorData.message || errorData.error || errorMessage;
          }
        } catch {
          // Mantém mensagem padrão de status
        }
      } else {
        const text = await response.text();
        if (text) {
          errorMessage = `${errorMessage}: ${text.slice(0, 300)}`;
        }
      }

      throw new AsaasApiError(response.status, errorMessage, errorsList);
    }

    if (response.status === 204) {
      return {} as T;
    }

    if (isJson) {
      return (await response.json()) as T;
    }

    return (await response.text()) as unknown as T;
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof AsaasApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new AsaasApiError(
        408,
        `Timeout ao comunicar com a API do Asaas (${timeoutMs}ms expirados).`
      );
    }

    const message = error instanceof Error ? error.message : "Erro desconhecido de rede";
    throw new AsaasApiError(500, `Falha de conexão com Asaas: ${message}`);
  }
}

/**
 * Funções utilitárias REST tipadas
 */
export async function asaasGet<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined | null>,
  options?: Omit<AsaasRequestOptions, "params" | "method">
): Promise<T> {
  return asaasRequest<T>(endpoint, { ...options, method: "GET", params });
}

export async function asaasPost<T>(
  endpoint: string,
  body?: unknown,
  options?: Omit<AsaasRequestOptions, "body" | "method">
): Promise<T> {
  return asaasRequest<T>(endpoint, { ...options, method: "POST", body });
}

export async function asaasPut<T>(
  endpoint: string,
  body?: unknown,
  options?: Omit<AsaasRequestOptions, "body" | "method">
): Promise<T> {
  return asaasRequest<T>(endpoint, { ...options, method: "PUT", body });
}

export async function asaasDelete<T>(
  endpoint: string,
  options?: Omit<AsaasRequestOptions, "method">
): Promise<T> {
  return asaasRequest<T>(endpoint, { ...options, method: "DELETE" });
}

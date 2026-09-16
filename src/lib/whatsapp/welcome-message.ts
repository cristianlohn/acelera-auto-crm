/**
 * @file welcome-message.ts
 * @description Construtor unificado e agnóstico de ambiente (Client e Server) de mensagens e URLs de WhatsApp.
 * 
 * ZERO dependências de Node.js (fs, path, crypto, etc.).
 * Seguro para importação direta em componentes React ("use client") e rotas de API ("server-only" ou edge/node).
 */

export interface WelcomeCustomerMessageParams {
  customerName?: string | null;
  sellerName?: string | null;
  organizationName?: string | null;
  vehicle?: string | null;
}

/**
 * Constrói a mensagem de boas-vindas personalizada enviada ao cliente via WhatsApp.
 * Garante:
 * - Uso do nome real da organização ("da {organizationName}") ou fallback "da nossa loja".
 * - Saudação pessoal com o primeiro nome do cliente e vendedor responsável.
 * - Copies refinadas:
 *   a) Com carro: "Vi que você se interessou pelo *{veiculo}*. Ele está disponível aqui no pátio! Quer ver fotos ou simular entrada?"
 *   b) Sem carro: "Recebi seu contato por aqui! Já tem algum modelo em mente ou gostaria de conhecer os destaques do nosso estoque?"
 * - Higienização estrita: NUNCA exibe "Interesse Geral", "Interesse Geral via WhatsApp", nem "concessionária".
 */
export function buildWelcomeCustomerMessage(
  params: WelcomeCustomerMessageParams
): string;
export function buildWelcomeCustomerMessage(
  customerName?: string | null,
  sellerName?: string | null,
  organizationName?: string | null,
  vehicle?: string | null
): string;
export function buildWelcomeCustomerMessage(
  paramsOrCustomerName?: WelcomeCustomerMessageParams | string | null,
  sellerNameParam?: string | null,
  organizationNameParam?: string | null,
  vehicleParam?: string | null
): string {
  let customerName: string | null | undefined;
  let sellerName: string | null | undefined;
  let organizationName: string | null | undefined;
  let vehicle: string | null | undefined;

  if (typeof paramsOrCustomerName === "object" && paramsOrCustomerName !== null) {
    customerName = paramsOrCustomerName.customerName;
    sellerName = paramsOrCustomerName.sellerName;
    organizationName = paramsOrCustomerName.organizationName;
    vehicle = paramsOrCustomerName.vehicle;
  } else {
    customerName = paramsOrCustomerName;
    sellerName = sellerNameParam;
    organizationName = organizationNameParam;
    vehicle = vehicleParam;
  }

  // 1. Extração do primeiro nome do cliente (fallback seguro: "Cliente")
  const rawCustomer = customerName ? customerName.trim() : "";
  const customerFirstName = rawCustomer ? rawCustomer.split(/\s+/)[0] : "Cliente";

  // 2. Extração do primeiro nome do vendedor responsável
  const rawSeller = sellerName ? sellerName.trim() : "";
  const firstSellerName = rawSeller ? rawSeller.split(/\s+/)[0] : "";
  const isValidSeller =
    Boolean(firstSellerName) &&
    firstSellerName.toLowerCase() !== "consultor" &&
    firstSellerName.toLowerCase() !== "roleta" &&
    firstSellerName.toLowerCase() !== "null" &&
    firstSellerName.toLowerCase() !== "undefined" &&
    firstSellerName.toLowerCase() !== "vendedor" &&
    firstSellerName.toLowerCase() !== "desconhecido";

  // 3. Referência à organização ("da {organizationName}" ou fallback gracioso "da nossa loja")
  const storeRef =
    organizationName && organizationName.trim()
      ? `da ${organizationName.trim()}`
      : "da nossa loja";

  const sellerGreeting = isValidSeller
    ? `Sou ${firstSellerName} ${storeRef}`
    : `Sou o consultor ${storeRef}`;

  // 4. Detecção e higienização do veículo (rejeita strings genéricas)
  const rawV = vehicle ? vehicle.trim() : "";
  const lowerV = rawV.toLowerCase();
  const isSpecificVehicle =
    Boolean(rawV) &&
    !lowerV.includes("interesse geral") &&
    !lowerV.includes("veículo de interesse") &&
    !lowerV.includes("veiculo de interesse") &&
    lowerV !== "geral" &&
    lowerV !== "em aberto" &&
    !lowerV.includes("não informado") &&
    !lowerV.includes("nao informado") &&
    !lowerV.includes("sem veículo") &&
    !lowerV.includes("sem veiculo") &&
    lowerV !== "null" &&
    lowerV !== "undefined";

  // 5. Cenários de copy:
  // a) Com carro: "Vi que você se interessou pelo *{veiculo}*. Ele está disponível aqui no pátio! Quer ver fotos ou simular entrada?"
  // b) Sem carro: "Recebi seu contato por aqui! Já tem algum modelo em mente ou gostaria de conhecer os destaques do nosso estoque?"
  const vehicleCopy = isSpecificVehicle
    ? `Vi que você se interessou pelo *${rawV}*. Ele está disponível aqui no pátio! Quer ver fotos ou simular entrada?`
    : `Recebi seu contato por aqui! Já tem algum modelo em mente ou gostaria de conhecer os destaques do nosso estoque?`;

  return `Olá, ${customerFirstName}! Seja bem-vindo(a)! ${sellerGreeting}. 👋\n\n${vehicleCopy}\n\nEstou à disposição para tirar dúvidas e te atender por aqui em instantes. 🚗💨`;
}

/**
 * Gera a URL direta do WhatsApp (wa.me) higienizando o telefone e codificando a mensagem.
 */
export function buildWhatsAppDirectUrl(
  phone: string,
  paramsOrMessage: WelcomeCustomerMessageParams | string
): string {
  if (!phone) return "#";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "#";

  const fullPhone = digits.startsWith("55") ? digits : `55${digits}`;
  const messageText =
    typeof paramsOrMessage === "string"
      ? paramsOrMessage
      : buildWelcomeCustomerMessage(paramsOrMessage);

  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(messageText)}`;
}

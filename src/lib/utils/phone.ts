/**
 * @file phone.ts
 * @description Funções utilitárias para sanitização, formatação e validação de números de telefone e WhatsApp (Brasil).
 */

/**
 * Higieniza strings de telefone removendo pontuações, espaços, parênteses e traços.
 *
 * @param phone - Telefone em formato arbitrário (ex: "(11) 98765-4321").
 * @returns String contendo apenas caracteres numéricos.
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Aplica máscara dinâmica de telefone brasileiro:
 * - Fixos: (XX) XXXX-XXXX (10 dígitos)
 * - Celulares/WhatsApp: (XX) XXXXX-XXXX (11 dígitos)
 *
 * @param value - Valor de entrada digitado pelo usuário.
 * @returns String formatada com máscara progressiva.
 */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Validação estrita de número brasileiro (DDD válido + 10 ou 11 dígitos).
 *
 * Regras:
 * 1. Deve ter exatamente 10 dígitos (fixo) ou 11 dígitos (celular).
 * 2. O DDD (primeiros 2 dígitos) deve ser válido no Brasil (entre 11 e 99 e sem iniciar com 0).
 * 3. Celulares (11 dígitos) no Brasil devem obrigatoriamente iniciar com o dígito 9 após o DDD (ex: [11] 9xxxx-xxxx).
 *
 * @param phone - Número de telefone formatado ou apenas dígitos.
 * @returns Booleano indicando validade.
 */
export function isValidBRPhone(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  // Deve ter 10 ou 11 dígitos
  if (digits.length !== 10 && digits.length !== 11) return false;
  // DDD não pode iniciar com 0 e deve estar no intervalo válido (11 a 99)
  const ddd = parseInt(digits.slice(0, 2), 10);
  if (Number.isNaN(ddd) || ddd < 11 || ddd > 99) return false;
  // Celulares (11 dígitos) no Brasil começam com 9
  if (digits.length === 11 && digits[2] !== "9") return false;
  return true;
}

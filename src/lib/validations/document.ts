/**
 * @file document.ts
 * @description Utilitários de validação matemática estrita (Módulo 11), máscaras e sanitização para CPF, CNPJ e Telefone.
 */

/**
 * Remove todos os caracteres não numéricos.
 */
export function sanitizeDigits(value?: string | null): string {
  if (!value) return "";
  return value.replace(/\D/g, "");
}

/**
 * Validação matemática estrita de CPF (Módulo 11).
 * Rejeita strings com menos de 11 dígitos, caracteres inválidos ou sequências repetidas ("11111111111").
 */
export function validateCPF(cpf: string): boolean {
  const clean = sanitizeDigits(cpf);

  if (clean.length !== 11) return false;

  // Rejeita sequências de dígitos repetidos conhecidas
  if (/^(\d)\1{10}$/.test(clean)) return false;

  // Cálculo do 1º Dígito Verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(clean.charAt(9), 10)) return false;

  // Cálculo do 2º Dígito Verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

/**
 * Validação matemática estrita de CNPJ (Módulo 11).
 * Rejeita strings com menos de 14 dígitos ou sequências repetidas ("00000000000000").
 */
export function validateCNPJ(cnpj: string): boolean {
  const clean = sanitizeDigits(cnpj);

  if (clean.length !== 14) return false;

  // Rejeita sequências repetidas
  if (/^(\d)\1{13}$/.test(clean)) return false;

  // Cálculo do 1º Dígito Verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean.charAt(i), 10) * weights1[i];
  }
  let rest = sum % 11;
  const d1 = rest < 2 ? 0 : 11 - rest;
  if (d1 !== parseInt(clean.charAt(12), 10)) return false;

  // Cálculo do 2º Dígito Verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(clean.charAt(i), 10) * weights2[i];
  }
  rest = sum % 11;
  const d2 = rest < 2 ? 0 : 11 - rest;
  if (d2 !== parseInt(clean.charAt(13), 10)) return false;

  return true;
}

/**
 * Invoca a validação correspondente ao tipo de documento fiscal.
 */
export function isValidDocument(doc: string, type: "CPF" | "CNPJ"): boolean {
  if (!doc) return false;
  return type === "CPF" ? validateCPF(doc) : validateCNPJ(doc);
}

/**
 * Formata o CPF ou CNPJ em tempo real de forma progressiva conforme digitação.
 */
export function formatDocument(value: string, type: "CPF" | "CNPJ"): string {
  const digits = sanitizeDigits(value);

  if (type === "CPF") {
    const limited = digits.slice(0, 11);
    if (limited.length <= 3) return limited;
    if (limited.length <= 6) return `${limited.slice(0, 3)}.${limited.slice(3)}`;
    if (limited.length <= 9) return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`;
    return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}-${limited.slice(9)}`;
  }

  // CNPJ
  const limited = digits.slice(0, 14);
  if (limited.length <= 2) return limited;
  if (limited.length <= 5) return `${limited.slice(0, 2)}.${limited.slice(2)}`;
  if (limited.length <= 8) return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5)}`;
  if (limited.length <= 12) return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8)}`;
  return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8, 12)}-${limited.slice(12)}`;
}

/**
 * Formata telefone ou celular brasileiro com DDD em tempo real.
 */
export function formatPhone(value: string): string {
  const digits = sanitizeDigits(value).slice(0, 11);

  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

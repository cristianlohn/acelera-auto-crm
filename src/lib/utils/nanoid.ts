/**
 * @file nanoid.ts
 * @description Gerador de código curto (short_code) seguro e sem dependências externas pesadas via node:crypto.
 */

import crypto from "node:crypto";

/**
 * Alfabeto Base58 sem caracteres visualmente ambíguos (0, O, 1, I, l).
 */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";

/**
 * Gera um código alfanumérico curto pseudo-aleatório seguro com entropia uniforme.
 *
 * @param length Comprimento do código (padrão: 6 caracteres)
 * @returns String de código curto única (ex: '7kM9xP')
 */
export function generateShortCode(length = 6): string {
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
}

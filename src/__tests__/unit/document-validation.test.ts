/**
 * @file document-validation.test.ts
 * @description Testes unitários para validações de CPF, CNPJ, formatações e sanitização.
 */

import { describe, it, expect } from "vitest";
import {
  validateCPF,
  validateCNPJ,
  isValidDocument,
  formatDocument,
  formatPhone,
  sanitizeDigits,
} from "@/lib/validations/document";

describe("[UNIT-DOC-VALIDATION] Validação e Formatação de Documentos Fiscais & Telefones", () => {
  describe("Validação de CPF", () => {
    it("deve validar CPFs matematicamente válidos", () => {
      // CPFs válidos conhecidos
      expect(validateCPF("52998224725")).toBe(true);
      expect(validateCPF("529.982.247-25")).toBe(true);
      expect(validateCPF("11144477735")).toBe(true);
      expect(validateCPF("111.444.777-35")).toBe(true);
    });

    it("deve rejeitar CPFs com dígitos repetidos", () => {
      expect(validateCPF("11111111111")).toBe(false);
      expect(validateCPF("00000000000")).toBe(false);
      expect(validateCPF("999.999.999-99")).toBe(false);
    });

    it("deve rejeitar CPFs com tamanho incorreto ou caracteres inválidos", () => {
      expect(validateCPF("123")).toBe(false);
      expect(validateCPF("123456789012")).toBe(false);
      expect(validateCPF("")).toBe(false);
    });

    it("deve rejeitar CPFs com dígito verificador incorreto", () => {
      expect(validateCPF("52998224720")).toBe(false);
      expect(validateCPF("11144477730")).toBe(false);
    });
  });

  describe("Validação de CNPJ", () => {
    it("deve validar CNPJs matematicamente válidos", () => {
      expect(validateCNPJ("00000000000191")).toBe(true);
      expect(validateCNPJ("00.000.000/0001-91")).toBe(true);
      expect(validateCNPJ("33000167000101")).toBe(true);
      expect(validateCNPJ("33.000.167/0001-01")).toBe(true);
    });

    it("deve rejeitar CNPJs com dígitos repetidos", () => {
      expect(validateCNPJ("00000000000000")).toBe(false);
      expect(validateCNPJ("11111111111111")).toBe(false);
    });

    it("deve rejeitar CNPJs com tamanho incorreto", () => {
      expect(validateCNPJ("123")).toBe(false);
      expect(validateCNPJ("123456789012345")).toBe(false);
    });

    it("deve rejeitar CNPJs com dígitos verificadores incorretos", () => {
      expect(validateCNPJ("00000000000190")).toBe(false);
      expect(validateCNPJ("33000167000100")).toBe(false);
    });
  });

  describe("isValidDocument Helper", () => {
    it("deve validar CPF e CNPJ conforme o tipo informado", () => {
      expect(isValidDocument("52998224725", "CPF")).toBe(true);
      expect(isValidDocument("52998224725", "CNPJ")).toBe(false);
      expect(isValidDocument("00000000000191", "CNPJ")).toBe(true);
      expect(isValidDocument("00000000000191", "CPF")).toBe(false);
    });
  });

  describe("Formatação em Tempo Real", () => {
    it("deve formatar CPF progressivamente", () => {
      expect(formatDocument("529", "CPF")).toBe("529");
      expect(formatDocument("529982", "CPF")).toBe("529.982");
      expect(formatDocument("529982247", "CPF")).toBe("529.982.247");
      expect(formatDocument("52998224725", "CPF")).toBe("529.982.247-25");
    });

    it("deve formatar CNPJ progressivamente", () => {
      expect(formatDocument("00", "CNPJ")).toBe("00");
      expect(formatDocument("00000", "CNPJ")).toBe("00.000");
      expect(formatDocument("00000000", "CNPJ")).toBe("00.000.000");
      expect(formatDocument("000000000001", "CNPJ")).toBe("00.000.000/0001");
      expect(formatDocument("00000000000191", "CNPJ")).toBe("00.000.000/0001-91");
    });

    it("deve formatar telefones fixos e celulares com DDD", () => {
      expect(formatPhone("11")).toBe("(11");
      expect(formatPhone("119888")).toBe("(11) 9888");
      expect(formatPhone("1133334444")).toBe("(11) 3333-4444");
      expect(formatPhone("11988887777")).toBe("(11) 98888-7777");
    });

    it("sanitizeDigits deve extrair apenas números", () => {
      expect(sanitizeDigits("(11) 98888-7777")).toBe("11988887777");
      expect(sanitizeDigits("24.991.428/0001-88")).toBe("24991428000188");
      expect(sanitizeDigits(null)).toBe("");
    });
  });
});

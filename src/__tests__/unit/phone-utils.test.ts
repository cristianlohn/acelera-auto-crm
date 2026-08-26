/**
 * @file phone-utils.test.ts
 * @description Suíte de Testes Unitários para Utilitários de Telefone BR (maskPhone, isValidBRPhone e sanitizePhone).
 */

import { describe, it, expect } from "vitest";
import { maskPhone, isValidBRPhone, sanitizePhone } from "@/lib/utils/phone";

describe("[UNIT-PHONE] Utilitários de Formatação e Validação de Telefone BR", () => {
  describe("maskPhone()", () => {
    it("deve retornar string vazia para entrada vazia", () => {
      expect(maskPhone("")).toBe("");
    });

    it("deve aplicar máscara progressiva para DDD", () => {
      expect(maskPhone("1")).toBe("(1");
      expect(maskPhone("11")).toBe("(11");
    });

    it("deve aplicar máscara para números intermediários", () => {
      expect(maskPhone("119")).toBe("(11) 9");
      expect(maskPhone("119876")).toBe("(11) 9876");
    });

    it("deve formatar número fixo de 10 dígitos com traço no 4º dígito", () => {
      expect(maskPhone("1133334444")).toBe("(11) 3333-4444");
      expect(maskPhone("4734567890")).toBe("(47) 3456-7890");
    });

    it("deve formatar celular/WhatsApp de 11 dígitos com 9 dígitos e traço no 5º dígito", () => {
      expect(maskPhone("11988887777")).toBe("(11) 98888-7777");
      expect(maskPhone("47991234567")).toBe("(47) 99123-4567");
    });

    it("deve ignorar caracteres não numéricos e limitar a 11 dígitos", () => {
      expect(maskPhone("(11) 9.8888-7777")).toBe("(11) 98888-7777");
      expect(maskPhone("1198888777799999")).toBe("(11) 98888-7777");
    });
  });

  describe("isValidBRPhone()", () => {
    it("deve validar celular de 11 dígitos com nono dígito obrigatório", () => {
      expect(isValidBRPhone("11988887777")).toBe(true);
      expect(isValidBRPhone("(11) 98888-7777")).toBe(true);
      expect(isValidBRPhone("(47) 99123-4567")).toBe(true);
      expect(isValidBRPhone("(21) 97654-3210")).toBe(true);
    });

    it("deve validar telefone fixo de 10 dígitos com DDD válido", () => {
      expect(isValidBRPhone("1133334444")).toBe(true);
      expect(isValidBRPhone("(11) 3333-4444")).toBe(true);
      expect(isValidBRPhone("(47) 3456-7890")).toBe(true);
    });

    it("deve rejeitar números com comprimento inválido", () => {
      expect(isValidBRPhone("")).toBe(false);
      expect(isValidBRPhone("119999")).toBe(false);
      expect(isValidBRPhone("119888877771")).toBe(false); // 12 dígitos
    });

    it("deve rejeitar números com DDD inválido (iniciando com 0 ou fora de 11-99)", () => {
      expect(isValidBRPhone("01988887777")).toBe(false);
      expect(isValidBRPhone("00988887777")).toBe(false);
      expect(isValidBRPhone("09988887777")).toBe(false);
      expect(isValidBRPhone("(05) 98888-7777")).toBe(false);
    });

    it("deve rejeitar celular de 11 dígitos que não inicia com 9", () => {
      expect(isValidBRPhone("11888887777")).toBe(false);
      expect(isValidBRPhone("(11) 78888-7777")).toBe(false);
      expect(isValidBRPhone("(47) 59123-4567")).toBe(false);
    });
  });

  describe("sanitizePhone()", () => {
    it("deve remover caracteres especiais, espaços e pontuações", () => {
      expect(sanitizePhone("(11) 98888-7777")).toBe("11988887777");
      expect(sanitizePhone("+55 (47) 99123-4567")).toBe("5547991234567");
      expect(sanitizePhone("11 9 8888 7777")).toBe("11988887777");
    });
  });
});

/**
 * @file contact-config.test.ts
 * @description Testes unitários para o módulo centralizado de configurações de contato oficial (src/config/contact.ts).
 */

import { describe, it, expect } from "vitest";
import {
  CONTACT_CONFIG,
  getSalesWhatsAppUrl,
  getSupportWhatsAppUrl,
} from "@/config/contact";

describe("[UNIT-CONTACT-CONFIG] Configurações e Helpers Oficiais de Contato", () => {
  it("deve conter o telefone oficial único 5547996348698 e formato (47) 99634-8698", () => {
    expect(CONTACT_CONFIG.phone).toBe("5547996348698");
    expect(CONTACT_CONFIG.displayPhone).toBe("(47) 99634-8698");
    expect(CONTACT_CONFIG.sales.phone).toBe("5547996348698");
    expect(CONTACT_CONFIG.sales.displayPhone).toBe("(47) 99634-8698");
    expect(CONTACT_CONFIG.support.phone).toBe("5547996348698");
    expect(CONTACT_CONFIG.support.displayPhone).toBe("(47) 99634-8698");
  });

  it("getSalesWhatsAppUrl deve retornar wa.me com o número oficial e mensagem padrão", () => {
    const url = getSalesWhatsAppUrl();
    expect(url).toContain("https://wa.me/5547996348698?text=");
    expect(url).toContain(encodeURIComponent(CONTACT_CONFIG.sales.defaultMessage));
  });

  it("getSalesWhatsAppUrl deve aceitar mensagem customizada codificada", () => {
    const custom = "Quero contratar o Enterprise";
    const url = getSalesWhatsAppUrl(custom);
    expect(url).toBe(`https://wa.me/5547996348698?text=${encodeURIComponent(custom)}`);
  });

  it("getSupportWhatsAppUrl deve retornar wa.me com o número oficial e mensagem padrão de suporte", () => {
    const url = getSupportWhatsAppUrl();
    expect(url).toContain("https://wa.me/5547996348698?text=");
    expect(url).toContain(encodeURIComponent(CONTACT_CONFIG.support.defaultMessage));
  });

  it("getSupportWhatsAppUrl deve aceitar mensagem customizada codificada", () => {
    const custom = "Dúvida sobre webhook";
    const url = getSupportWhatsAppUrl(custom);
    expect(url).toBe(`https://wa.me/5547996348698?text=${encodeURIComponent(custom)}`);
  });
});

# DIRETRIZ OBRIGATÓRIA DE DADOS E MOCKS (DATA INTEGRITY RULE)

## 1. PROIBIDO OMITIR DADOS
- Nunca utilize comentários do tipo `// TODO: adicione seus dados`, `// adicione mais itens aqui` ou arrays vazios `[]` ao criar ou alterar telas, stores ou tabelas.
- Sempre forneça os dados concretos, completos e prontos para renderização visual imediata.

## 2. PADRÃO FACTUAL E DOMÍNIO REALISTA
- **Contexto:** Revenda/Concessionária de veículos brasileira (Auto Prime Veículos).
- **Personas Oficiais:** Roberto Silva (Diretor), Juliana Costa (Gerente), Rafael Martins (Vendedor), Amanda Souza (Vendedora), Lucas Ferreira (Vendedor).
- **Formatos:** Moeda em Real (`R$ XX.XXX`), placas no padrão Mercosul/Brasil, telefones válidos com DDD brasileiro (`(11) 9XXXX-XXXX`), datas coerentes com o ciclo de vendas (2026).
- **Origens Válidas:** Meta Ads, Google Ads, Webmotors, OLX, Showroom / Pátio, Indicação.

## 3. TIPAGEM E RELACIONAMENTOS
- Todo dado adicionado deve respeitar estritamente as interfaces TypeScript do projeto (`Lead`, `Vehicle`, `TeamMember`, etc.).
- Relacionamentos devem ser coerentes (ex: se o lead comprou um veículo, o veículo correspondente deve existir no mock com status `"Vendido"` vinculado ao mesmo vendedor).

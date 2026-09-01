/**
 * @file generate-api-types.ts
 * @description Script para gerar automaticamente as tipagens TypeScript (src/types/api.ts) a partir da spec OpenAPI.
 */

import openapiTS, { astToString } from "openapi-typescript";
import { getApiDocs } from "../src/lib/swagger";
import fs from "node:fs/promises";
import path from "node:path";

async function generateApiTypes() {
  console.log("[OpenAPI Types Generator] Carregando especificação OpenAPI 3.0 do projeto...");
  const spec = getApiDocs();

  console.log("[OpenAPI Types Generator] Gerando AST e inferência TypeScript via openapi-typescript...");
  const ast = await openapiTS(spec as unknown as Parameters<typeof openapiTS>[0]);
  const contents = astToString(ast);

  const header = `/**
 * @file api.ts
 * @description Tipagens TypeScript geradas automaticamente a partir da especificação OpenAPI 3.0.
 * ATENÇÃO: Não edite este arquivo manualmente. Execute 'npm run generate:api-types:local' para atualizar.
 */\n\n`;

  const targetPath = path.resolve(process.cwd(), "src/types/api.ts");
  await fs.writeFile(targetPath, header + contents, "utf-8");

  console.log(`[OpenAPI Types Generator] Tipagens salvas com sucesso em: ${targetPath}`);
}

generateApiTypes().catch((error) => {
  console.error("[OpenAPI Types Generator Error]", error);
  process.exit(1);
});

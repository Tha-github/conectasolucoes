// Valida um arquivo de conteúdo contra o schema.
// Uso: node scripts/validate-content.mjs [caminho]   (padrão: content/content.json)

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatErrors, parseContent } from '../src/lib/validate.js';

const target = resolve(process.argv[2] ?? fileURLToPath(new URL('../content/content.json', import.meta.url)));

try {
  const result = parseContent(await readFile(target, 'utf8'));
  if (result.ok) {
    console.log(`Conteúdo válido: ${target}`);
  } else {
    console.error(`Conteúdo inválido: ${target}\n${formatErrors(result.errors)}`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`Não foi possível ler ${target}: ${error.message}`);
  process.exitCode = 1;
}

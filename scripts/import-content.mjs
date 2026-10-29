// Integra um JSON exportado pelo painel ao repositório.
// Uso: npm run content:import -- caminho/arquivo.json [--dry-run]
//
// Valida (com migração explícita), confere as imagens referenciadas, lista os
// campos alterados e só então grava content/content.json. Não faz commit nem
// deploy: revise o diff, rode `npm run check` e publique (docs/CONTENT_SCHEMA.md §5).

import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { formatErrors } from '../src/lib/validate.js';
import { exportContent, importContent } from '../src/lib/transfer.js';
import { ROOT, checkContentImages } from './build.mjs';

const CONTENT_PATH = join(ROOT, 'content', 'content.json');

/** Achata o conteúdo em { "caminho.do.campo": valor }. */
function flatten(value, path = '', out = {}) {
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) flatten(child, path ? `${path}.${key}` : key, out);
  } else {
    out[path] = value;
  }
  return out;
}

function changedFields(before, after) {
  const a = flatten(before);
  const b = flatten(after);
  return Object.keys(b).filter((key) => a[key] !== b[key]);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const file = args.find((arg) => !arg.startsWith('--'));

if (!file) {
  console.error('Uso: npm run content:import -- caminho/arquivo.json [--dry-run]');
  process.exit(1);
}

const text = await readFile(resolve(file), 'utf8').catch((error) => {
  console.error(`Não foi possível ler ${file}: ${error.message}`);
  process.exit(1);
});
const result = importContent(text);
if (!result.ok) {
  console.error(`Arquivo recusado: ${file}\n${formatErrors(result.errors)}`);
  process.exit(1);
}
const imageErrors = await checkContentImages(result.value);
if (imageErrors.length > 0) {
  console.error(`Arquivo recusado: imagens inválidas ou ausentes em src/\n${imageErrors.join('\n')}`);
  process.exit(1);
}

const current = JSON.parse(await readFile(CONTENT_PATH, 'utf8'));
const changes = changedFields(current, result.value);
if (result.migratedFrom) console.log(`Migrado da versão ${result.migratedFrom} do schema.`);
console.log(
  changes.length
    ? `Campos alterados (${changes.length}):\n${changes.map((c) => `- ${c}`).join('\n')}`
    : 'Nenhuma alteração.',
);

if (dryRun) {
  console.log('Simulação (--dry-run): nada foi gravado.');
} else if (changes.length > 0 || result.migratedFrom) {
  await writeFile(CONTENT_PATH, exportContent(result.value));
  console.log(
    `Gravado em ${CONTENT_PATH}.\nPróximos passos: revise o diff, rode "npm run check" e publique (commit + push).`,
  );
}

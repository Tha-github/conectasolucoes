// Gera o inventário de campos editáveis em docs/CONTENT_SCHEMA.md a partir do
// schema e do conteúdo atual. Uso: npm run docs:schema  (--check só verifica).

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { contentSchema, walkSchema } from '../src/lib/schema.js';
import { ROOT } from './build.mjs';

export const DOC_PATH = join(ROOT, 'docs', 'CONTENT_SCHEMA.md');
export const START = '<!-- inventario:inicio (gerado por npm run docs:schema; não edite à mão) -->';
export const END = '<!-- inventario:fim -->';

const cell = (value) => String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');

function labelPath(path) {
  const labels = [];
  let field = contentSchema;
  for (const key of path.split('.')) {
    field = field.fields[key];
    labels.push(field.label);
  }
  return labels.join(' › ');
}

function rule(field) {
  switch (field.kind) {
    case 'text':
      return `texto, ${field.minLength}–${field.maxLength} caracteres, uma linha`;
    case 'color':
      return 'cor `#RRGGBB` + contraste';
    case 'image':
      return (
        `imagem: ${field.formats.join('/')}, até ${Math.round(field.maxBytes / 1000)} KB, ` +
        `${field.minWidth}×${field.minHeight} a ${field.maxWidth}×${field.maxHeight} px; alt até ${field.altMaxLength}`
      );
    case 'literal':
      return `fixo: \`${JSON.stringify(field.value)}\``;
    default:
      return field.kind;
  }
}

/**
 * Inventário derivado só do schema: os valores atuais ficam em content/content.json.
 * (Incluí-los aqui faria toda edição de conteúdo exigir regenerar a documentação.)
 */
export function renderInventory() {
  const groups = new Map();
  walkSchema((field, path) => {
    const group = path.includes('.') ? path.slice(0, path.indexOf('.')) : '(raiz)';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push([path, field]);
  });
  let count = 0;
  const parts = [];
  for (const [group, fields] of groups) {
    const title = group === '(raiz)' ? 'Controle' : contentSchema.fields[group].label;
    parts.push(`#### \`${group}\` — ${title}\n`);
    parts.push('| Caminho | Campo | Regra |');
    parts.push('| ------- | ----- | ----- |');
    for (const [path, field] of fields) {
      if (field.kind !== 'literal') count++;
      parts.push(`| \`${path}\` | ${cell(labelPath(path))} | ${cell(rule(field))} |`);
    }
    parts.push('');
  }
  return [`Total de campos editáveis: **${count}**.\n`, ...parts].join('\n').trimEnd();
}

export async function inventoryState() {
  const doc = await readFile(DOC_PATH, 'utf8');
  const start = doc.indexOf(START);
  const end = doc.indexOf(END);
  if (start < 0 || end < start) throw new Error(`Marcadores do inventário ausentes em ${DOC_PATH}`);
  const expected = renderInventory();
  const actual = doc.slice(start + START.length, end).trim();
  return { doc, start, end, expected, upToDate: actual === expected };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { doc, start, end, expected, upToDate } = await inventoryState();
  if (process.argv.includes('--check')) {
    console.log(upToDate ? 'Inventário em dia.' : 'Inventário desatualizado: rode "npm run docs:schema".');
    process.exitCode = upToDate ? 0 : 1;
  } else {
    await writeFile(DOC_PATH, `${doc.slice(0, start + START.length)}\n\n${expected}\n\n${doc.slice(end)}`);
    console.log(`Inventário atualizado em ${DOC_PATH}`);
  }
}

// Escopo de um Pull Request de conteúdo (branch conteudo/*).
// Uso: node scripts/check-content-scope.mjs <ref-base> [ref-head=HEAD]
//
// Um PR de conteúdo só pode:
//   - modificar content/content.json;
//   - adicionar ou substituir imagens em src/assets/img/<nome-válido> que o
//     content.json da branch referencie.
// Qualquer outro arquivo, exclusão, renomeação, cópia, mudança de tipo ou link
// simbólico é recusado. Alterações de código seguem o fluxo normal de revisão.

import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { IMAGE_PATH_PATTERN, contentSchema } from '../src/lib/schema.js';
import { ROOT, collectImages } from './build.mjs';

export const CONTENT_FILE = 'content/content.json';
const SYMLINK_MODE = '120000';

/**
 * @typedef {{ status: string, path: string, mode: string }} Change
 * @param {Change[]} changes  saída de `git diff --raw`
 * @param {Set<string>} referencedImages  caminhos assets/img/… usados pelo content.json da branch
 * @returns {string[]} problemas (vazio = escopo permitido)
 */
export function checkContentScope(changes, referencedImages) {
  const problems = [];
  for (const { status, path, mode } of changes) {
    if (mode === SYMLINK_MODE) {
      problems.push(`${path}: links simbólicos não são permitidos`);
      continue;
    }
    if (!['A', 'M'].includes(status)) {
      problems.push(`${path}: operação "${status}" não permitida (só adicionar ou modificar)`);
      continue;
    }
    if (path === CONTENT_FILE) {
      if (status !== 'M') problems.push(`${path}: deve ser modificado, não criado`);
      continue;
    }
    const asset = path.startsWith('src/') ? path.slice('src/'.length) : null;
    if (asset && IMAGE_PATH_PATTERN.test(asset)) {
      if (!referencedImages.has(asset)) problems.push(`${path}: imagem não referenciada por ${CONTENT_FILE}`);
      continue;
    }
    problems.push(`${path}: fora do escopo de conteúdo (só ${CONTENT_FILE} e src/assets/img/)`);
  }
  return problems;
}

/** Lê as mudanças entre base e head com `git diff --raw` (inclui o modo do arquivo). */
export function gitChanges(base, head = 'HEAD', cwd = ROOT) {
  const out = execFileSync('git', ['diff', '--raw', '--no-renames', '-z', `${base}...${head}`], {
    cwd,
    encoding: 'utf8',
  });
  const parts = out.split('\0').filter(Boolean);
  const changes = [];
  for (let i = 0; i < parts.length; i += 2) {
    const [, newMode, , , status] = parts[i].replace(/^:/, '').split(' ');
    changes.push({ status: status[0], path: parts[i + 1], mode: newMode });
  }
  return changes;
}

export async function referencedImagesIn(contentPath) {
  try {
    const content = JSON.parse(await readFile(contentPath, 'utf8'));
    return new Set(
      collectImages(contentSchema, content)
        .map((image) => image.src)
        .filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [base, head = 'HEAD'] = process.argv.slice(2);
  if (!base) {
    console.error('Uso: node scripts/check-content-scope.mjs <ref-base> [ref-head]');
    process.exit(1);
  }
  const changes = gitChanges(base, head);
  const problems = checkContentScope(changes, await referencedImagesIn(join(ROOT, CONTENT_FILE)));
  if (problems.length > 0) {
    console.error(`PR de conteúdo fora do escopo permitido:\n${problems.map((p) => `- ${p}`).join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log(`Escopo de conteúdo OK (${changes.length} arquivo(s)).`);
  }
}

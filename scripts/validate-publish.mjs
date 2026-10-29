// Validação do pipeline de publicação (CI e local).
// Uso: npm run validate:publish [-- --base origin/main] [--content arquivo.json] [--src pasta]
//
// Recusa (código de saída 1) qualquer content/content.json que não passe em:
//   1. schema estrito da versão atual (sem migração: o repositório guarda só a versão vigente);
//   2. arquivos de imagem referenciados (existência, formato real, KB, dimensões, SVG seguro);
//   3. política editorial (src/lib/policy.js).
// Com --base, lista os campos alterados em relação à branch de destino.
// No GitHub Actions, escreve o resumo em $GITHUB_STEP_SUMMARY.

import { execFileSync } from 'node:child_process';
import { appendFile, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { changedPaths, labelForPath } from '../src/lib/admin-model.js';
import { checkPolicy } from '../src/lib/policy.js';
import { parseContent } from '../src/lib/validate.js';
import { ROOT, checkContentImages } from './build.mjs';

/**
 * @param {{ contentText: string, srcDir?: string }} input
 * @returns {Promise<{ ok: boolean, errors: string[], content: import('../src/lib/schema.js').Content | null }>}
 */
export async function validatePublish({ contentText, srcDir = join(ROOT, 'src') }) {
  const parsed = parseContent(contentText);
  if (!parsed.ok) {
    return { ok: false, content: null, errors: parsed.errors.map((e) => `${e.path || '(raiz)'}: ${e.message}`) };
  }
  const errors = [
    ...(await checkContentImages(parsed.value, srcDir)).map((line) => line.replace(/^- /, '')),
    ...checkPolicy(parsed.value).map((e) => `${e.path}: ${e.message}`),
  ];
  return { ok: errors.length === 0, errors, content: parsed.value };
}

function readAtRef(ref, path) {
  try {
    return execFileSync('git', ['show', `${ref}:${path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const contentPath = resolve(option('--content') ?? join(ROOT, 'content', 'content.json'));
  const base = option('--base');

  const report = [];
  const result = await validatePublish({
    contentText: await readFile(contentPath, 'utf8'),
    srcDir: option('--src') ? resolve(option('--src')) : undefined,
  });

  if (result.ok) {
    report.push('### Conteúdo aprovado na validação', '', 'Schema, imagens e política editorial: sem problemas.');
  } else {
    report.push('### Conteúdo recusado', '', ...result.errors.map((e) => `- ${e}`));
  }

  if (base && result.content) {
    const previous = readAtRef(base, 'content/content.json');
    const before = previous && parseContent(previous);
    if (before?.ok) {
      const changes = changedPaths(before.value, result.content);
      report.push(
        '',
        `### Campos alterados em relação a \`${base}\` (${changes.length})`,
        '',
        ...(changes.length ? changes.map((p) => `- ${labelForPath(p)} (\`${p}\`)`) : ['Nenhum.']),
      );
    }
  }

  const text = report.join('\n');
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  process.exitCode = result.ok ? 0 : 1;
}

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ROOT } from './helpers.mjs';

const sourceFiles = (dir) =>
  readdirSync(join(ROOT, dir), { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && /\.(?:js|mjs|html|css|json)$/.test(e.name))
    .map((e) => join(e.parentPath, e.name));

const FILES = [...sourceFiles('src'), ...sourceFiles('scripts'), ...sourceFiles('content')];

test('nenhuma API de injeção de HTML ou execução dinâmica no código', () => {
  const forbidden = /\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write|\beval\(|new Function\(/;
  for (const file of FILES.filter((f) => /\.m?js$/.test(f))) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), forbidden, file);
  }
});

test('nenhum handler inline, javascript: ou script externo nas páginas', () => {
  for (const file of FILES.filter((f) => f.endsWith('.html'))) {
    const html = readFileSync(file, 'utf8');
    assert.doesNotMatch(html, /\son[a-z]+=/i, `handler inline em ${file}`);
    assert.doesNotMatch(html, /javascript:/i, file);
    assert.doesNotMatch(html, /<script(?![^>]*src="\{\{build\.root\}\})/, `script inline ou externo em ${file}`);
  }
});

test('nenhum token, chave ou credencial aparente (o token do painel só existe cifrado)', () => {
  const secret =
    /gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY|AKIA[0-9A-Z]{16}/;
  for (const file of FILES) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), secret, file);
  }
});

test('nenhum serviço de terceiros (analytics, CDNs, fontes externas); painel só fala com a API do GitHub', () => {
  const external = /https?:\/\/(?!www\.w3\.org)/;
  for (const file of FILES.filter((f) => /\.(?:html|css)$/.test(f))) {
    const text = readFileSync(file, 'utf8');
    // Exceção do CLAUDE.md §7: a CSP do painel libera só api.github.com em connect-src.
    const allowed = file.endsWith(join('pages', 'admin', 'index.html'))
      ? text.replace("connect-src 'self' https://api.github.com;", '')
      : text;
    assert.doesNotMatch(allowed, external, file);
  }
  const jsFiles = FILES.filter((f) => /\.m?js$/.test(f) && f.startsWith(join(ROOT, 'src')));
  for (const file of jsFiles) {
    const urls = readFileSync(file, 'utf8').match(/https?:\/\/[^\s'"`)]+/g) ?? [];
    for (const url of urls) {
      // API do GitHub (painel), links de envio/WhatsApp, namespaces e exemplos em comentários.
      assert.match(
        url,
        /^(?:https:\/\/(?:api\.github\.com|github\.com\/|wa\.me\/|schema\.org|usuario\.github\.io\/|www\.dominio\.com\.br)|http:\/\/www\.sitemaps\.org\/schemas\/)/,
        `${file}: ${url}`,
      );
    }
  }
});

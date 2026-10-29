import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { build, normalizeBasePath, themeCss } from '../scripts/build.mjs';
import { escapeHtml } from '../src/lib/template.js';
import { whatsappUrl } from '../src/lib/site.js';
import { loadDefaultContent } from './helpers.mjs';

/** href do WhatsApp como aparece no HTML (com & escapado). */
const WHATSAPP_HREF = escapeHtml(whatsappUrl());

const tmp = mkdtempSync(join(tmpdir(), 'conecta-build-'));
const outDir = join(tmp, 'dist');

const listFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));

/** Extrai URLs de href/src em HTML (exceto <base>, verificado à parte) e url() em CSS. */
function references(file) {
  const text = readFileSync(file, 'utf8');
  const pattern = file.endsWith('.css') ? /url\(\s*['"]?([^'")]+)['"]?\s*\)/g : /(?<!<base)\s(?:href|src)="([^"]*)"/g;
  return [...text.matchAll(pattern)].map((m) => m[1]);
}

describe('build de produção (site de projeto em /conecta-site)', () => {
  before(async () => {
    await build({ outDir, basePath: '/conecta-site/', year: '2026' });
  });

  after(() => rmSync(tmp, { recursive: true, force: true }));

  test('gera páginas, CSS de tema, fontes e .nojekyll', () => {
    for (const file of [
      'index.html',
      '404.html',
      '.nojekyll',
      'css/theme.css',
      'css/tokens.css',
      'js/main.js',
      'js/header.js',
      'assets/fonts/outfit-latin-wght-normal.woff2',
      'assets/fonts/manrope-latin-wght-normal.woff2',
      'assets/fonts/LICENSE-Outfit.txt',
      'assets/fonts/LICENSE-Manrope.txt',
    ]) {
      assert.ok(existsSync(join(outDir, file)), `ausente: ${file}`);
    }
  });

  test('não publica arquivos auxiliares (.gitkeep, .md)', () => {
    const extras = listFiles(outDir).filter((f) => f.endsWith('.gitkeep') || f.endsWith('.md'));
    assert.deepEqual(extras, []);
  });

  test('HTML em pt-BR, UTF-8 e sem marcações remanescentes', () => {
    for (const page of ['index.html', '404.html']) {
      const html = readFileSync(join(outDir, page), 'utf8');
      assert.match(html, /<html lang="pt-BR">/);
      assert.match(html, /<meta charset="utf-8">/);
      // O JSON-LD termina legitimamente em "}}"; fora dele não pode sobrar marcação.
      assert.doesNotMatch(html.replace(/<script type="application\/ld\+json">.*?<\/script>/s, ''), /\{\{|\}\}/);
      assert.match(html, /Conecta Soluções/);
    }
  });

  test('nenhum link com destino falso "#"', () => {
    for (const file of listFiles(outDir).filter((f) => f.endsWith('.html'))) {
      assert.ok(!references(file).includes('#'), `href="#" em ${file}`);
    }
  });

  test('somente caminhos relativos ou o link oficial do WhatsApp (exceto o <base> da 404)', () => {
    for (const file of listFiles(outDir).filter((f) => /\.(html|css)$/.test(f))) {
      for (const ref of references(file).filter((r) => r !== WHATSAPP_HREF)) {
        assert.doesNotMatch(ref, /^(?:\/|[a-z]+:)/i, `caminho não relativo "${ref}" em ${file}`);
      }
    }
    assert.match(readFileSync(join(outDir, '404.html'), 'utf8'), /<base href="\/conecta-site\/">/);
  });

  test('toda referência local aponta para um arquivo existente (com a grafia exata)', () => {
    for (const file of listFiles(outDir).filter((f) => /\.(html|css)$/.test(f))) {
      // A 404 usa <base> apontando para a raiz do site.
      const baseDir = file.endsWith('404.html') ? outDir : dirname(file);
      for (const ref of references(file)) {
        if (ref.startsWith('#') || ref === WHATSAPP_HREF) continue;
        const path = ref.split(/[?#]/)[0];
        const target = path === './' || path === '' ? join(baseDir, 'index.html') : join(baseDir, path);
        const rel = relative(outDir, target);
        assert.ok(!rel.startsWith('..'), `"${ref}" sai de dist/ em ${file}`);
        const parent = dirname(target);
        assert.ok(
          existsSync(parent) && readdirSync(parent).includes(target.slice(parent.length + 1)),
          `"${ref}" não encontrado (ou grafia diferente) em ${file}`,
        );
      }
    }
  });

  test('âncoras internas apontam para IDs existentes', () => {
    const index = readFileSync(join(outDir, 'index.html'), 'utf8');
    for (const page of ['index.html', '404.html']) {
      const html = readFileSync(join(outDir, page), 'utf8');
      for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) {
        // Na 404, o <base> faz "#secao" apontar para a página inicial.
        const target = page === '404.html' && id !== 'conteudo' ? index : html;
        assert.match(target, new RegExp(`id="${id}"`), `âncora #${id} sem destino em ${page}`);
      }
    }
  });

  test('cores do tema vêm do content.json', () => {
    const css = readFileSync(join(outDir, 'css', 'theme.css'), 'utf8');
    const { colors } = loadDefaultContent().theme;
    assert.match(css, new RegExp(`--color-text-muted: ${colors.textMuted};`));
    assert.match(css, new RegExp(`--color-on-primary: ${colors.onPrimary};`));
  });

  test('cabeçalho: símbolo oficial decorativo ao lado do nome da marca em texto', () => {
    const html = readFileSync(join(outDir, 'index.html'), 'utf8');
    assert.match(
      html,
      /<a class="brand" href="[^"]*">\s*<img src="[^"]*assets\/img\/simbolo\.png" alt=""[^>]*class="brand__logo"[^>]*>\s*<span class="brand__name">Conecta Soluções<\/span>/,
    );
    assert.match(html, /<link rel="icon" href="[^"]*assets\/favicon\.png"/);
    assert.ok(existsSync(join(outDir, 'assets', 'favicon.png')));
  });
});

describe('falhas de build', () => {
  const workDir = mkdtempSync(join(tmpdir(), 'conecta-build-err-'));
  after(() => rmSync(workDir, { recursive: true, force: true }));

  const writeContent = (content) => {
    const path = join(workDir, 'content.json');
    writeFileSync(path, typeof content === 'string' ? content : JSON.stringify(content));
    return path;
  };

  test('interrompe com conteúdo inválido e lista os erros', async () => {
    const content = loadDefaultContent();
    content.brand.name = '';
    await assert.rejects(
      build({ outDir: join(workDir, 'out'), contentPath: writeContent(content) }),
      /Conteúdo inválido[\s\S]*brand\.name/,
    );
  });

  test('interrompe com JSON malformado', async () => {
    await assert.rejects(build({ outDir: join(workDir, 'out'), contentPath: writeContent('{') }), /JSON inválido/);
  });

  test('interrompe quando a imagem referenciada não existe', async () => {
    const content = loadDefaultContent();
    content.brand.logo.src = 'assets/img/nao-existe.png';
    await assert.rejects(
      build({ outDir: join(workDir, 'out'), contentPath: writeContent(content) }),
      /Imagens inválidas ou não encontradas[\s\S]*arquivo não encontrado \(assets\/img\/nao-existe\.png\)/,
    );
  });

  test('não apaga um dist/ anterior quando o conteúdo é inválido', async () => {
    const out = join(workDir, 'kept');
    await build({ outDir: out });
    const content = loadDefaultContent();
    content.extra = true;
    await assert.rejects(build({ outDir: out, contentPath: writeContent(content) }));
    assert.ok(existsSync(join(out, 'index.html')));
  });
});

test('normalizeBasePath', () => {
  assert.equal(normalizeBasePath(''), '');
  assert.equal(normalizeBasePath('/'), '');
  assert.equal(normalizeBasePath('/repo/'), '/repo');
  assert.throws(() => normalizeBasePath('repo'), /inválido/);
  assert.throws(() => normalizeBasePath('/repo"><script>'), /inválido/);
});

test('themeCss converte nomes para kebab-case', () => {
  assert.equal(themeCss({ onPrimary: '#FFFFFF' }).includes('--color-on-primary: #FFFFFF;'), true);
});

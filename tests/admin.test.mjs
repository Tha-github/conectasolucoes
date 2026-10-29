import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { build } from '../scripts/build.mjs';
import {
  MIME_BY_FORMAT,
  changedPaths,
  editablePaths,
  labelForPath,
  setValue,
  statusMessages,
  uploadedImagePath,
  checkOriginalUpload,
  chooseOutput,
  normalizeHex,
  planResize,
  uploadFormats,
} from '../src/lib/admin-model.js';
import { renderPreview } from '../src/lib/preview.js';
import { seoHead } from '../src/lib/seo.js';
import { IMAGE_PATH_PATTERN, walkSchema } from '../src/lib/schema.js';
import { fieldAt } from '../src/lib/validate.js';
import { ROOT, loadDefaultContent } from './helpers.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'conecta-admin-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const bytes = (...parts) =>
  Uint8Array.from(parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)));
const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const png = (w, h) => bytes([0x89], 'PNG\r\n', [0x1a, 0x0a], be32(13), 'IHDR', be32(w), be32(h), [8, 2, 0, 0, 0]);

describe('modelo de edição', () => {
  test('85 campos editáveis, todos folhas do schema', () => {
    const paths = editablePaths();
    assert.equal(paths.length, 85);
    for (const path of paths) assert.ok(['text', 'color', 'image'].includes(fieldAt(path).kind), path);
  });

  test('setValue altera só o campo, numa cópia', () => {
    const content = loadDefaultContent();
    const next = setValue(content, 'hero.title', 'Novo título');
    assert.equal(next.hero.title, 'Novo título');
    assert.equal(content.hero.title, loadDefaultContent().hero.title, 'original intacto');
    assert.deepEqual(changedPaths(content, next), ['hero.title']);
  });

  test('setValue recusa criar, remover ou trocar estrutura', () => {
    const content = loadDefaultContent();
    for (const path of [
      'services.items.servico-novo.title',
      'services.items',
      'services',
      'hero.image.src',
      'schemaVersion',
      'hero.link',
      '__proto__.x',
      'theme.colors.novaCor',
    ]) {
      assert.throws(() => setValue(content, path, 'x'), /Campo não editável|inexistente/, path);
    }
  });

  test('rótulos legíveis para mensagens', () => {
    assert.equal(labelForPath('hero.title'), 'Destaque principal › Título principal');
    assert.equal(labelForPath('hero.image.alt'), 'Destaque principal › Imagem do destaque › texto alternativo');
    assert.equal(
      labelForPath('services.items.rebobinagem-motores.title'),
      'Serviços › Lista de serviços (fixa: 21 itens) › Serviço 21 › Nome do serviço',
    );
    assert.equal(labelForPath('services.items.novo'), 'services.items.novo');
  });
});

describe('status do painel', () => {
  const published = loadDefaultContent();
  const edited = setValue(published, 'hero.title', 'Outro');
  const texts = (s) => statusMessages(s).map((m) => m.text);

  test('sem alterações: igual ao publicado', () => {
    assert.deepEqual(texts({ draft: published, published }), ['Igual ao conteúdo publicado']);
  });

  test('editado e não salvo', () => {
    assert.deepEqual(texts({ draft: edited, published }), [
      'Alterações não salvas neste navegador',
      'Alterações ainda não publicadas',
    ]);
  });

  test('salvo e exportado mostram os textos exigidos, sem afirmar publicação', () => {
    const at = '2026-10-28T13:05:00.000Z';
    const all = texts({ draft: edited, published, saved: { content: edited, at }, exported: { content: edited, at } });
    assert.match(all[0], /^Rascunho salvo neste navegador \(/);
    assert.match(all[1], /^Arquivo exportado \(/);
    assert.equal(all[2], 'Alterações ainda não publicadas');
    assert.ok(all.every((t) => !/publicad[oa] com sucesso|foi publicad/i.test(t)));
  });

  test('editar depois de salvar/exportar volta a "não salvo"', () => {
    const at = '2026-10-28T13:05:00.000Z';
    const later = setValue(edited, 'hero.text', 'Mudou de novo');
    assert.deepEqual(
      texts({ draft: later, published, saved: { content: edited, at }, exported: { content: edited, at } }),
      ['Alterações não salvas neste navegador', 'Alterações ainda não publicadas'],
    );
  });
});

describe('envio de imagens', () => {
  test('nome gerado é válido para todo campo de imagem', () => {
    walkSchema((field, path) => {
      if (field.kind !== 'image') return;
      for (const format of field.formats) {
        const src = uploadedImagePath(path, format, new Date(2026, 9, 28, 14, 30, 5));
        assert.match(src, IMAGE_PATH_PATTERN);
        assert.ok(src.endsWith(`-20261028-143005.${format}`), src);
      }
    });
  });

  const hero = () => fieldAt('hero.image');
  const logo = () => fieldAt('brand.logo');

  const avif = (w, h) =>
    Uint8Array.from([
      ...be32(28),
      ...[...'ftypavif'].map((c) => c.charCodeAt(0)),
      0,
      0,
      0,
      0,
      ...[...'avifmif1miaf'].map((c) => c.charCodeAt(0)),
      ...be32(20),
      ...[...'ispe'].map((c) => c.charCodeAt(0)),
      0,
      0,
      0,
      0,
      ...be32(w),
      ...be32(h),
    ]);

  test('aceita imagem raster correta (PNG e AVIF), lendo o tipo pelos bytes', () => {
    assert.deepEqual(checkOriginalUpload({ size: 2000, type: 'image/png' }, png(1600, 1200), hero()), {
      ok: true,
      format: 'png',
      width: 1600,
      height: 1200,
    });
    assert.deepEqual(checkOriginalUpload({ size: 2000, type: 'image/avif' }, avif(2000, 1500), hero()), {
      ok: true,
      format: 'avif',
      width: 2000,
      height: 1500,
    });
  });

  test('imagem grande (até 15 MB) é aceita para otimização; acima disso é recusada antes de ler', () => {
    assert.equal(checkOriginalUpload({ size: 9_000_000, type: 'image/jpeg' }, null, hero()).ok, true);
    const result = checkOriginalUpload({ size: 16_000_000, type: 'image/png' }, null, hero());
    assert.equal(result.ok, false);
    assert.match(result.errors[0], /16\.0 MB; o máximo para envio é 15 MB/);
    assert.match(checkOriginalUpload({ size: 0, type: 'image/png' }, null, hero()).errors.join(), /vazio/);
  });

  test('dimensões gigantes são recusadas antes de decodificar', () => {
    assert.match(
      checkOriginalUpload({ size: 100, type: 'image/png' }, png(9000, 9000), hero()).errors.join(),
      /grande demais para processar; máximo 8000 px/,
    );
  });

  test('SVG, executáveis e tipos não-imagem são recusados no envio (inclusive no logotipo)', () => {
    for (const type of [
      'image/svg+xml',
      'image/gif',
      'text/html',
      'application/javascript',
      'application/x-msdownload',
      '',
    ]) {
      assert.equal(checkOriginalUpload({ size: 10, type }, null, hero()).ok, false, type);
      assert.equal(checkOriginalUpload({ size: 10, type }, null, logo()).ok, false, type);
    }
    assert.deepEqual(uploadFormats(logo()), ['png', 'webp', 'avif']);
  });

  test('recusa bytes que não correspondem ao MIME declarado (extensão não é confiável)', () => {
    const result = checkOriginalUpload({ size: 100, type: MIME_BY_FORMAT.webp }, png(1600, 1200), hero());
    assert.equal(result.ok, false);
    assert.match(result.errors.join(), /conteúdo do arquivo é PNG, mas ele se apresenta como WEBP/);
    // Executável renomeado para .png ("MZ…") e texto qualquer.
    const exe = Uint8Array.from([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0, 4, 0, 0, 0, 0xff, 0xff, 0, 0]);
    assert.match(
      checkOriginalUpload({ size: 16, type: 'image/png' }, exe, hero()).errors.join(),
      /inválido ou corrompido/,
    );
    const txt = new TextEncoder().encode('isto não é uma imagem');
    assert.match(
      checkOriginalUpload({ size: 21, type: 'image/jpeg' }, txt, hero()).errors.join(),
      /inválido ou corrompido/,
    );
  });

  test('recusa cabeçalho malformado e imagem pequena demais', () => {
    const truncated = png(1600, 1200).slice(0, 18);
    assert.match(checkOriginalUpload({ size: 18, type: 'image/png' }, truncated, hero()).errors.join(), /corrompido/);
    assert.match(
      checkOriginalUpload({ size: 100, type: 'image/png' }, png(300, 200), hero()).errors.join(),
      /mínimo 1200×1000/,
    );
  });

  test('redimensionamento preserva a proporção e nunca amplia', () => {
    assert.deepEqual(planResize(4800, 3200, hero()), { width: 2400, height: 1600, resize: true });
    assert.deepEqual(planResize(3000, 6000, hero()), { width: 1200, height: 2400, resize: true });
    assert.deepEqual(planResize(1600, 1200, hero()), { width: 1600, height: 1200, resize: false });
    const { width, height } = planResize(4032, 3024, fieldAt('about.image'));
    assert.ok(Math.abs(width / height - 4032 / 3024) < 0.002, 'mesma proporção');
    assert.ok(width <= 1800 && height <= 1800);
  });

  test('saída: prefere a otimizada; original só se couber sem redimensionar', () => {
    const field = hero();
    const okPng = { bytes: png(1600, 1200), format: 'png' };
    const okWebp = {
      bytes: Uint8Array.from([
        ...[...'RIFF'].map((c) => c.charCodeAt(0)),
        0,
        0,
        0,
        0,
        ...[...'WEBPVP8X'].map((c) => c.charCodeAt(0)),
        10,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0x3f,
        0x06,
        0,
        0xaf,
        0x04,
        0,
      ]),
      format: 'webp',
    };
    assert.deepEqual(chooseOutput(okPng, okWebp, false, field), { ok: true, choice: 'optimized' });
    assert.deepEqual(chooseOutput(okPng, null, false, field), { ok: true, choice: 'original' });
    const result = chooseOutput(okPng, null, true, field);
    assert.equal(result.ok, false);
    assert.match(result.errors.join(), /não conseguiu otimizar/);
  });
});

describe('cores', () => {
  test('normaliza #RGB, sem "#", minúsculas; recusa o resto', () => {
    assert.equal(normalizeHex('#173b4c'), '#173B4C');
    assert.equal(normalizeHex('173B4C'), '#173B4C');
    assert.equal(normalizeHex(' #abc '), '#AABBCC');
    for (const bad of ['', '#12', '#1234', '#12345G', 'red', 'rgb(0,0,0)', '#123456;x', 'var(--a)', null]) {
      assert.equal(normalizeHex(bad), null, String(bad));
    }
  });

  test('só as 14 chaves de cor existentes são editáveis', () => {
    const content = loadDefaultContent();
    assert.throws(() => setValue(content, 'theme.colors.novaCor', '#000000'), /não editável/);
    assert.throws(() => setValue(content, 'theme.background', '#000000'), /não editável/);
    assert.throws(() => setValue(content, 'theme', {}), /não editável/);
    assert.equal(setValue(content, 'theme.colors.accent', '#000000').theme.colors.accent, '#000000');
  });
});

describe('prévia e página do painel', () => {
  const outDir = join(tmp, 'dist');
  let templates;
  before(async () => {
    await build({ outDir, basePath: '', year: '2026' });
    templates = JSON.parse(readFileSync(join(outDir, 'admin', 'preview-templates.json'), 'utf8'));
  });

  test('prévia com o conteúdo publicado é idêntica à página pública (exceto img-src blob:, script e bloco de SEO)', () => {
    const preview = renderPreview(templates, loadDefaultContent(), { root: './', year: '2026' });
    const seo = seoHead(loadDefaultContent());
    const built = readFileSync(join(outDir, 'index.html'), 'utf8');
    assert.ok(built.includes(seo), 'bloco de SEO inserido pelo build');
    const page = built.replace(seo, '');
    const script = '<script type="module" src="./js/main.js"></script>';
    assert.ok(page.includes(script));
    assert.equal(preview, page.replace("img-src 'self'", "img-src 'self' blob:").replace(script, ''));
  });

  test('prévia escapa texto e usa blob: só para imagens enviadas', () => {
    let content = setValue(loadDefaultContent(), 'hero.title', '<img src=x onerror=alert(1)>');
    content = setValue(content, 'hero.image', { src: 'assets/img/hero-image-20261028-143005.webp', alt: 'Foto' });
    const html = renderPreview(templates, content, {
      imageUrls: new Map([['assets/img/hero-image-20261028-143005.webp', 'blob:http://localhost/abc']]),
    });
    assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
    assert.ok(!html.includes('<img src=x'));
    assert.match(html, /<img src="blob:http:\/\/localhost\/abc" alt="Foto"/);
    assert.match(html, /href="\.\.\/css\/site\.css"/, 'caminhos relativos a /admin/');
  });

  test('prévia aplica as cores do rascunho via stylesheet blob: (e só blob:)', () => {
    const html = renderPreview(templates, loadDefaultContent(), { themeUrl: 'blob:http://localhost/tema' });
    assert.match(html, /<link rel="stylesheet" href="blob:http:\/\/localhost\/tema">/);
    assert.doesNotMatch(html, /href="\.\.\/css\/theme\.css"/);
    assert.match(html, /style-src 'self' blob:/);
    assert.throws(
      () => renderPreview(templates, loadDefaultContent(), { themeUrl: 'https://exemplo.com/x.css' }),
      /blob:/,
    );
  });

  test('página do painel: noindex, CSP restrita, sem senha, sem recursos externos', () => {
    const html = readFileSync(join(outDir, 'admin', 'index.html'), 'utf8');
    assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
    const csp = html.match(/Content-Security-Policy" content="([^"]+)"/)[1];
    assert.doesNotMatch(csp, /unsafe-|\*|https?:/);
    assert.match(csp, /script-src 'self'/);
    assert.match(csp, /connect-src 'self'/);
    // Sem campo de senha nem credenciais (padrões de token do GitHub, Authorization etc.).
    assert.doesNotMatch(
      html,
      /type="password"|\bsenha\s*[:=]|access[_-]?token|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_|authorization/i,
    );
    assert.doesNotMatch(html, /https?:\/\//);
    assert.match(html, /sandbox="allow-same-origin"/, 'prévia sem scripts');
    assert.doesNotMatch(html, /sandbox="[^"]*allow-scripts/);
  });

  test('todo botão do painel tem type e ação implementada', () => {
    const html = readFileSync(join(outDir, 'admin', 'index.html'), 'utf8');
    const main = readFileSync(join(ROOT, 'src', 'js', 'admin', 'main.js'), 'utf8');
    for (const [button] of html.matchAll(/<button\b[^>]*>/g)) assert.match(button, /type="button"/);
    for (const [, action] of html.matchAll(/data-action="([^"]+)"/g)) {
      assert.ok(main.includes(`[data-action="${action}"]`), `ação sem handler: ${action}`);
    }
  });

  test('scripts do painel: só requisições relativas, sem credenciais nem armazenamento além do rascunho', () => {
    const dir = join(ROOT, 'src', 'js', 'admin');
    for (const file of readdirSync(dir)) {
      const code = readFileSync(join(dir, file), 'utf8');
      assert.doesNotMatch(code, /https?:\/\/|api\.github\.com|Authorization|Bearer|password|sessionStorage/i, file);
      for (const [, arg] of code.matchAll(/fetch(?:Text)?\(\s*([^,)]+)/g)) {
        assert.doesNotMatch(arg, /^['"`](?:https?:|\/\/)/, `${file}: ${arg}`);
      }
    }
  });

  test('build publica dados do painel: templates e manifesto de imagens', () => {
    assert.ok(typeof templates.page === 'string' && templates.page.includes('{{> header}}'));
    assert.ok(templates.partials.header && templates.partials.footer);
    assert.deepEqual(JSON.parse(readFileSync(join(outDir, 'admin', 'images.json'), 'utf8')), { images: [] });
  });
});

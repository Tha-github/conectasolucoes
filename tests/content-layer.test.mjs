import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';
import { build, checkContentImages } from '../scripts/build.mjs';
import { inventoryState } from '../scripts/schema-doc.mjs';
import { resolveWithDefaults } from '../src/lib/defaults.js';
import { checkImageFile, readImageMeta } from '../src/lib/image-meta.js';
import { MIGRATIONS, migrateContent } from '../src/lib/migrate.js';
import { FACT_IDS, GALLERY_IDS, SCHEMA_VERSION, contentSchema, walkSchema } from '../src/lib/schema.js';
import { DRAFT_KEY, clearDraft, loadDraft, saveDraft } from '../src/lib/storage.js';
import { exportContent, exportFileName, importContent } from '../src/lib/transfer.js';
import { MAX_CONTENT_JSON_LENGTH, fieldAt, validateContent, validateField } from '../src/lib/validate.js';
import { loadDefaultContent } from './helpers.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'conecta-content-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const setAt = (obj, path, value) => {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((node, key) => node[key], obj)[last] = value;
};
const getAt = (obj, path) => path.split('.').reduce((node, key) => node?.[key], obj);

/* ------------------------------------------------------------------ */
/* Imagens sintéticas (apenas cabeçalhos)                              */
/* ------------------------------------------------------------------ */

const bytes = (...parts) =>
  Uint8Array.from(parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)));
const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const le24 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255];

const png = (w, h) => bytes([0x89], 'PNG\r\n', [0x1a, 0x0a], be32(13), 'IHDR', be32(w), be32(h), [8, 2, 0, 0, 0]);
const jpeg = (w, h) =>
  bytes(
    [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10],
    new Array(14).fill(0),
    [0xff, 0xc0, 0x00, 0x11, 8],
    [h >> 8, h & 255],
    [w >> 8, w & 255],
    [3, 0, 0, 0],
  );
const webpX = (w, h) =>
  bytes('RIFF', [0, 0, 0, 0], 'WEBP', 'VP8X', [10, 0, 0, 0], [0, 0, 0, 0], le24(w - 1), le24(h - 1));
const webpL = (w, h) => {
  const v = (w - 1) | ((h - 1) << 14);
  return bytes(
    'RIFF',
    [0, 0, 0, 0],
    'WEBP',
    'VP8L',
    [5, 0, 0, 0],
    [0x2f, v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255],
  );
};
const webpLossy = (w, h) =>
  bytes('RIFF', [0, 0, 0, 0], 'WEBP', 'VP8 ', [10, 0, 0, 0], new Array(6).fill(0), [w & 255, w >> 8, h & 255, h >> 8]);
const svg = (body) => new TextEncoder().encode(body);

/* ------------------------------------------------------------------ */

describe('procedência: todo texto exibido vem do conteúdo', async () => {
  // Cada campo de texto (e alt) recebe um marcador único; nada além dos
  // marcadores e dos itens fixos documentados pode aparecer na página.
  const content = loadDefaultContent();
  const markers = new Map();
  walkSchema((field, path) => {
    if (field.kind === 'text') {
      const marker = `§${markers.size}§`;
      markers.set(path, marker);
      setAt(content, path, marker);
    } else if (field.kind === 'image') {
      const marker = `§${markers.size}§`;
      markers.set(`${path}.alt`, marker);
      setAt(content, `${path}.alt`, marker);
    }
  });
  const contentPath = join(tmp, 'markers.json');
  writeFileSync(contentPath, JSON.stringify(content));
  const outDir = join(tmp, 'markers-dist');
  await build({ outDir, contentPath, basePath: '/x', year: '2026' });
  const pages = ['index.html', '404.html'].map((p) => readFileSync(join(outDir, p), 'utf8'));
  const all = pages.join('\n');

  const FIXED = /^[\s:|©]*(?:2026)?[\s:|©]*(?:\(91\) 98095-8661)?[\s:|©]*$/;
  const stripMarkers = (s) => s.replace(/§\d+§/g, '');

  test('texto visível (fora de tags, script e svg)', () => {
    for (const html of pages) {
      const body = html
        .replace(/<script[\s\S]*?<\/script>/g, '')
        .replace(/<svg[\s\S]*?<\/svg>/g, '')
        .replace(/<!--[\s\S]*?-->/g, '');
      for (const [, chunk] of body.matchAll(/>([^<]+)</g)) {
        assert.match(stripMarkers(chunk), FIXED, `texto fixo não editável: "${chunk.trim()}"`);
      }
    }
  });

  test('atributos legíveis (alt, aria-label, title, meta de descrição/og)', () => {
    for (const html of pages) {
      for (const [, , value] of html.matchAll(/\s(alt|aria-label|title)="([^"]*)"/g)) {
        assert.match(stripMarkers(value), FIXED, `atributo fixo: "${value}"`);
      }
      for (const [tag] of html.matchAll(
        /<meta\s(?:name="description"|property="og:(?:title|description|site_name)")[^>]*>/g,
      )) {
        const value = tag.match(/content="([^"]*)"/)[1];
        assert.match(stripMarkers(value), FIXED, `meta fixa: "${tag}"`);
      }
    }
  });

  test('todo campo de texto do schema é usado em alguma página', () => {
    const unused = [...markers].filter(([, marker]) => !all.includes(marker)).map(([path]) => path);
    assert.deepEqual(unused, []);
  });

  test('todas as cores do tema chegam ao CSS', () => {
    const css = readFileSync(join(outDir, 'css', 'theme.css'), 'utf8');
    for (const value of Object.values(content.theme.colors)) assert.ok(css.includes(value), value);
  });
});

describe('limites de texto (todos os campos)', () => {
  const textFields = [];
  walkSchema((field, path) => {
    if (field.kind === 'text') textFields.push([path, field.maxLength]);
    if (field.kind === 'image') textFields.push([`${path}.alt`, field.altMaxLength]);
  });

  test('aceita exatamente o limite e rejeita limite + 1 com mensagem clara', () => {
    for (const [path, max] of textFields) {
      const ok = loadDefaultContent();
      setAt(ok, path, 'a'.repeat(max));
      assert.equal(validateContent(ok).ok, true, `${path} com ${max}`);

      const tooLong = loadDefaultContent();
      setAt(tooLong, path, 'a'.repeat(max + 1));
      const result = validateContent(tooLong);
      assert.equal(result.ok, false, `${path} com ${max + 1}`);
      assert.match(result.errors[0].message, new RegExp(`máximo de ${max} caracteres \\(atual: ${max + 1}\\)`));
      assert.equal(result.errors[0].path, path);
    }
  });

  test('o conteúdo padrão cabe nos limites atuais', () => {
    for (const [path, max] of textFields) assert.ok(getAt(loadDefaultContent(), path).length <= max, path);
  });

  test('fieldAt expõe limite e rótulo para o contador do painel', () => {
    const field = fieldAt('hero.title');
    assert.equal(field.kind, 'text');
    assert.equal(field.maxLength, 80);
    assert.equal(typeof field.label, 'string');
    assert.equal(fieldAt('hero.inexistente'), null);
    assert.equal(fieldAt('services.items.nao-existe.title'), null);
    assert.deepEqual(validateField(field, '<script>alert(1)</script>', 'hero.title'), []);
  });

  test('todo campo tem rótulo (usado no painel e no inventário)', () => {
    walkSchema((field, path) => assert.ok(field.label?.length > 0, path));
  });
});

describe('URLs e formatos de imagem', () => {
  const rejects = (path, src) => {
    const content = loadDefaultContent();
    setAt(content, `${path}.src`, src);
    const result = validateContent(content);
    return !result.ok && result.errors.some((e) => e.path === `${path}.src`);
  };

  for (const src of [
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'JAVASCRIPT:alert(1)',
    ' assets/img/a.png',
    'assets/img/a.png ',
    'assets/img/a.png?v=1',
    'assets/img/a.png#x',
    'assets/img/%2e%2e/a.png',
    'assets\\img\\a.png',
    'ASSETS/img/a.png',
    'assets/img/.png',
    'assets/img/-a.png',
    'assets/fonts/a.png',
    'data:image/svg+xml,<svg onload=alert(1)>',
    'blob:https://exemplo.com/1',
    '',
  ]) {
    test(`rejeita "${src}"`, () => assert.ok(rejects('hero.image', src)));
  }

  test('rejeita src que não é texto nem null', () => {
    for (const src of [0, false, {}, ['assets/img/a.png']]) assert.ok(rejects('hero.image', src));
  });

  test('cada campo aceita apenas os seus formatos', () => {
    assert.ok(rejects('hero.image', 'assets/img/hero.svg'), 'SVG não é aceito em foto');
    assert.ok(rejects('brand.logo', 'assets/img/logo.jpg'), 'JPEG não é aceito no logo');
    assert.ok(!rejects('brand.logo', 'assets/img/logo.svg'));
    assert.ok(!rejects('hero.image', 'assets/img/hero.jpeg'));
  });
});

describe('leitura de imagens (image-meta)', () => {
  test('lê dimensões de PNG, JPEG e WebP (VP8X, VP8L, VP8)', () => {
    assert.deepEqual(readImageMeta(png(1600, 1200)), { format: 'png', width: 1600, height: 1200 });
    assert.deepEqual(readImageMeta(jpeg(2400, 1800)), { format: 'jpg', width: 2400, height: 1800 });
    assert.deepEqual(readImageMeta(webpX(1920, 1080)), { format: 'webp', width: 1920, height: 1080 });
    assert.deepEqual(readImageMeta(webpL(1300, 1100)), { format: 'webp', width: 1300, height: 1100 });
    assert.deepEqual(readImageMeta(webpLossy(800, 600)), { format: 'webp', width: 800, height: 600 });
  });

  test('lê dimensões de SVG por width/height ou viewBox', () => {
    assert.deepEqual(readImageMeta(svg('<svg width="240" height="64"></svg>')), {
      format: 'svg',
      width: 240,
      height: 64,
    });
    assert.deepEqual(readImageMeta(svg('<?xml version="1.0"?>\n<svg viewBox="0 0 480 120"></svg>')), {
      format: 'svg',
      width: 480,
      height: 120,
    });
  });

  for (const [name, body] of [
    ['script', '<svg viewBox="0 0 10 10"><script>alert(1)</script></svg>'],
    ['evento', '<svg viewBox="0 0 10 10" onload="alert(1)"></svg>'],
    ['javascript:', '<svg viewBox="0 0 10 10"><a href="javascript:alert(1)"/></svg>'],
    ['href externo', '<svg viewBox="0 0 10 10"><image href="https://exemplo.com/x.png"/></svg>'],
    ['url() externo', '<svg viewBox="0 0 10 10"><rect style="fill:url(https://x)"/></svg>'],
    ['foreignObject', '<svg viewBox="0 0 10 10"><foreignObject/></svg>'],
    ['entidade', '<!DOCTYPE svg [<!ENTITY x "y">]><svg viewBox="0 0 10 10"></svg>'],
  ]) {
    test(`recusa SVG inseguro: ${name}`, () => assert.throws(() => readImageMeta(svg(body)), /SVG|svg/));
  }

  test('aceita referência interna (#id) em SVG', () => {
    assert.doesNotThrow(() =>
      readImageMeta(svg('<svg viewBox="0 0 10 10"><use href="#a"/><rect fill="url(#g)"/></svg>')),
    );
  });

  test('recusa formato desconhecido', () => {
    assert.throws(() => readImageMeta(bytes('GIF89a', new Array(20).fill(0))), /não reconhecido/);
  });

  test('checkImageFile: extensão, formato do campo, tamanho e dimensões', () => {
    const hero = fieldAt('hero.image');
    assert.deepEqual(checkImageFile(png(1200, 1600), 'assets/img/hero.png', hero), []);
    assert.match(
      checkImageFile(png(1200, 1600), 'assets/img/hero.webp', hero).join(),
      /conteúdo é PNG, mas a extensão é \.webp/,
    );
    assert.match(checkImageFile(png(640, 480), 'assets/img/hero.png', hero).join(), /mínimo 600×1200/);
    assert.match(checkImageFile(png(6000, 4000), 'assets/img/hero.png', hero).join(), /máximo 4000×4000/);
    const big = new Uint8Array(hero.maxBytes + 1);
    big.set(png(1200, 1600));
    assert.match(checkImageFile(big, 'assets/img/hero.png', hero).join(), /KB; máximo/);
    assert.match(
      checkImageFile(svg('<svg viewBox="0 0 2000 1500"></svg>'), 'assets/img/hero.svg', hero).join(),
      /não aceito/,
    );
  });

  test('checkContentImages confere existência com grafia exata e conteúdo do arquivo', async () => {
    const srcDir = join(tmp, 'src-images');
    mkdirSync(join(srcDir, 'assets', 'img'), { recursive: true });
    writeFileSync(join(srcDir, 'assets', 'img', 'hero.png'), png(1200, 1600));
    writeFileSync(join(srcDir, 'assets', 'img', 'Sobre.png'), png(1600, 1200));
    writeFileSync(join(srcDir, 'assets', 'img', 'falso.webp'), png(1600, 1200));

    // Só as imagens deste teste: as demais ficam pendentes (src null).
    const content = loadDefaultContent();
    walkSchema((field, path) => {
      if (field.kind === 'image') getAt(content, path).src = null;
    });
    content.hero.image.src = 'assets/img/hero.png';
    assert.deepEqual(await checkContentImages(content, srcDir), []);

    content.about.image.src = 'assets/img/sobre.png';
    assert.match((await checkContentImages(content, srcDir)).join(), /about\.image\.src: arquivo não encontrado/);

    content.about.image.src = 'assets/img/falso.webp';
    assert.match((await checkContentImages(content, srcDir)).join(), /conteúdo é PNG/);
  });
});

describe('migração explícita', () => {
  test('versão atual passa sem alterações', () => {
    const content = loadDefaultContent();
    const result = migrateContent(content);
    assert.equal(result.ok, true);
    assert.equal(result.from, SCHEMA_VERSION);
    assert.deepEqual(result.value, content);
    assert.notEqual(result.value, content, 'trabalha sobre uma cópia');
  });

  test('aplica migrações em sequência até a versão alvo', () => {
    const migrations = {
      1: (d) => ({ ...d, schemaVersion: 2, renamed: d.old }),
      2: ({ old: _old, ...d }) => ({ ...d, schemaVersion: 3 }),
    };
    const result = migrateContent({ schemaVersion: 1, old: 'x' }, { migrations, target: 3 });
    assert.deepEqual(result, { ok: true, value: { schemaVersion: 3, renamed: 'x' }, from: 1 });
  });

  test('recusa versão mais nova, ausente, inválida, sem migração ou migração defeituosa', () => {
    const msg = (r) => (r.ok ? '' : r.errors[0].message);
    assert.match(msg(migrateContent({ schemaVersion: SCHEMA_VERSION + 1 })), /mais nova que a suportada/);
    assert.match(msg(migrateContent({})), /ausente ou inválida/);
    assert.match(msg(migrateContent({ schemaVersion: '1' })), /ausente ou inválida/);
    assert.match(msg(migrateContent({ schemaVersion: 1.5 })), /ausente ou inválida/);
    assert.match(
      msg(migrateContent({ schemaVersion: 1 }, { migrations: {}, target: 2 })),
      /não há migração da versão 1 para 2/,
    );
    assert.match(
      msg(migrateContent({ schemaVersion: 1 }, { migrations: { 1: (d) => d }, target: 2 })),
      /não atualizou/,
    );
    assert.match(msg(migrateContent([])), /objeto JSON/);
  });

  test('registro de migrações de produção é imutável e coerente com a versão', () => {
    assert.ok(Object.isFrozen(MIGRATIONS));
    for (let v = 1; v < SCHEMA_VERSION; v++) assert.equal(typeof MIGRATIONS[v], 'function', `falta MIGRATIONS[${v}]`);
  });
});

describe('defaults seguros (rascunho local)', () => {
  const defaults = loadDefaultContent();
  const paths = (issues) => issues.map((i) => i.path);

  test('conteúdo válido passa intacto, sem avisos', () => {
    const { value, issues } = resolveWithDefaults(loadDefaultContent(), defaults);
    assert.deepEqual(value, defaults);
    assert.deepEqual(issues, []);
  });

  test('campo inválido volta ao padrão; os demais são preservados', () => {
    const draft = loadDefaultContent();
    draft.hero.title = 'x'.repeat(500);
    draft.hero.text = 'Texto editado válido';
    draft.services.items['sistemas-scada'].title = 42;
    const { value, issues } = resolveWithDefaults(draft, defaults);
    assert.equal(value.hero.title, defaults.hero.title);
    assert.equal(value.hero.text, 'Texto editado válido');
    assert.equal(value.services.items['sistemas-scada'].title, defaults.services.items['sistemas-scada'].title);
    assert.deepEqual(paths(issues), ['hero.title', 'services.items.sistemas-scada.title']);
    assert.match(issues[0].message, /usando padrão/);
  });

  test('campos e grupos ausentes usam o padrão', () => {
    const draft = loadDefaultContent();
    delete draft.contact;
    delete draft.nav.menu;
    const { value, issues } = resolveWithDefaults(draft, defaults);
    assert.deepEqual(value.contact, defaults.contact);
    assert.equal(value.nav.menu, defaults.nav.menu);
    assert.deepEqual(paths(issues), ['nav.menu', 'contact']);
  });

  test('propriedades desconhecidas são descartadas (inclusive __proto__)', () => {
    const draft = JSON.parse(
      JSON.stringify(loadDefaultContent()).replace('"hero":{', '"hero":{"__proto__":{"x":1},"html":"<b>",'),
    );
    draft.extra = 1;
    const { value, issues } = resolveWithDefaults(draft, defaults);
    assert.equal(validateContent(value).ok, true);
    assert.ok(!Object.hasOwn(value, 'extra') && !Object.hasOwn(value.hero, 'html'));
    assert.deepEqual(paths(issues).sort(), ['extra', 'hero.__proto__', 'hero.html']);
    assert.equal(/** @type {any} */ ({}).x, undefined);
  });

  test('imagem com URL perigosa volta ao padrão', () => {
    const draft = loadDefaultContent();
    draft.hero.image = { src: 'javascript:alert(1)', alt: 'x' };
    const { value } = resolveWithDefaults(draft, defaults);
    assert.deepEqual(value.hero.image, defaults.hero.image);
  });

  test('cores válidas mas sem contraste restauram a paleta padrão inteira', () => {
    const draft = loadDefaultContent();
    draft.theme.colors.text = '#CCCCCC';
    draft.theme.colors.accent = '#BB5522';
    const { value, issues } = resolveWithDefaults(draft, defaults);
    assert.deepEqual(value.theme.colors, defaults.theme.colors);
    assert.ok(paths(issues).includes('theme.colors'));
  });

  test('versão desconhecida ou formato inválido descarta tudo e usa o padrão', () => {
    for (const draft of [{ ...loadDefaultContent(), schemaVersion: 99 }, null, [], 'texto', 42]) {
      const { value, issues } = resolveWithDefaults(draft, defaults);
      assert.deepEqual(value, defaults);
      assert.ok(issues.length > 0);
    }
  });

  test('o resultado é sempre válido', () => {
    const draft = loadDefaultContent();
    walkSchema((field, path) => {
      if (field.kind === 'text') setAt(draft, path, null);
    });
    assert.equal(validateContent(resolveWithDefaults(draft, defaults).value).ok, true);
  });
});

describe('rascunho local (storage)', () => {
  const defaults = loadDefaultContent();
  const memoryStorage = () => {
    const data = new Map();
    return {
      data,
      getItem: (k) => (data.has(k) ? data.get(k) : null),
      setItem: (k, v) => data.set(k, String(v)),
      removeItem: (k) => data.delete(k),
    };
  };

  test('salva e recarrega conteúdo válido', () => {
    const storage = memoryStorage();
    const draft = loadDefaultContent();
    draft.hero.title = 'Título editado';
    const saved = saveDraft(storage, draft, new Date('2026-10-28T10:00:00Z'));
    assert.deepEqual(saved, { ok: true, savedAt: '2026-10-28T10:00:00.000Z' });
    const loaded = loadDraft(storage, defaults);
    assert.equal(loaded.status, 'ok');
    assert.equal(loaded.value.hero.title, 'Título editado');
    assert.equal(loaded.savedAt, '2026-10-28T10:00:00.000Z');
  });

  test('não salva conteúdo inválido', () => {
    const storage = memoryStorage();
    const draft = loadDefaultContent();
    draft.extra = true;
    assert.equal(saveDraft(storage, draft).reason, 'invalid');
    assert.equal(storage.data.size, 0);
  });

  test('armazenamento indisponível ou cheio gera mensagem, sem exceção', () => {
    assert.equal(saveDraft(null, defaults).reason, 'unavailable');
    const full = {
      ...memoryStorage(),
      setItem: () => {
        throw Object.assign(new Error('exceeded the quota'), { name: 'QuotaExceededError' });
      },
    };
    const result = saveDraft(full, defaults);
    assert.equal(result.reason, 'quota');
    assert.match(result.message, /Exporte/);
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError');
      },
    };
    assert.equal(loadDraft(blocked, defaults).status, 'error');
  });

  test('sem rascunho: padrão', () => {
    const loaded = loadDraft(memoryStorage(), defaults);
    assert.equal(loaded.status, 'none');
    assert.deepEqual(loaded.value, defaults);
  });

  test('rascunho corrompido, enorme ou em formato estranho: padrão + aviso', () => {
    for (const raw of [
      '{',
      'null',
      '[]',
      '"x"',
      JSON.stringify({ outra: 1 }),
      'x'.repeat(MAX_CONTENT_JSON_LENGTH + 2000),
    ]) {
      const storage = memoryStorage();
      storage.setItem(DRAFT_KEY, raw);
      const loaded = loadDraft(storage, defaults);
      assert.equal(loaded.status, 'error', raw.slice(0, 20));
      assert.deepEqual(loaded.value, defaults);
      assert.ok(loaded.issues[0].message.length > 0);
    }
  });

  test('rascunho antigo/parcial é reparado campo a campo', () => {
    const storage = memoryStorage();
    const partial = loadDefaultContent();
    partial.hero.title = 'Mantido';
    delete partial.notFound;
    storage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: 'ontem', content: partial }));
    const loaded = loadDraft(storage, defaults);
    assert.equal(loaded.status, 'repaired');
    assert.equal(loaded.value.hero.title, 'Mantido');
    assert.deepEqual(loaded.value.notFound, defaults.notFound);
    assert.equal(loaded.savedAt, null, 'data inválida não é exibida');
  });

  test('clearDraft remove o rascunho e tolera falhas', () => {
    const storage = memoryStorage();
    saveDraft(storage, defaults);
    assert.equal(clearDraft(storage), true);
    assert.equal(storage.data.size, 0);
    assert.equal(
      clearDraft({
        removeItem: () => {
          throw new Error('x');
        },
      }),
      false,
    );
  });
});

describe('exportação e importação', () => {
  test('exporta no formato de content/content.json e reimporta igual', () => {
    const json = exportContent(loadDefaultContent());
    assert.equal(
      json,
      readFileSync(new URL('../content/content.json', import.meta.url), 'utf8').replace(/\r\n/g, '\n'),
    );
    const result = importContent(json);
    assert.equal(result.ok, true);
    assert.deepEqual(result.ok && result.value, loadDefaultContent());
    assert.equal(result.ok && result.migratedFrom, null);
  });

  test('não exporta conteúdo inválido', () => {
    const content = loadDefaultContent();
    content.hero.title = '';
    assert.throws(() => exportContent(content), /inválido/);
  });

  test('importação rejeita com mensagens claras por campo', () => {
    const errorsOf = (json) => {
      const r = importContent(json);
      return r.ok ? [] : r.errors.map((e) => `${e.path}: ${e.message}`);
    };
    assert.deepEqual(errorsOf('{'), [': o arquivo não é um JSON válido']);
    assert.match(errorsOf(' '.repeat(MAX_CONTENT_JSON_LENGTH + 1))[0], /excede/);
    assert.match(
      errorsOf(JSON.stringify({ ...loadDefaultContent(), schemaVersion: 7 }))[0],
      /mais nova que a suportada/,
    );

    const content = loadDefaultContent();
    content.services.items['servico-novo'] = { title: 'Novo' };
    content.hero.image.src = 'https://exemplo.com/foto.jpg';
    content.theme.colors.primary = 'red';
    assert.deepEqual(errorsOf(JSON.stringify(content)), [
      'hero.image.src: deve ser null ou um caminho em assets/img/ (minúsculas, .webp, .jpg, .png, .avif ou .svg)',
      'services.items.servico-novo: propriedade desconhecida',
      'theme.colors.primary: deve ser uma cor no formato #RRGGBB',
    ]);
  });

  test('reordenar chaves no JSON não altera a ordem da página', () => {
    const content = loadDefaultContent();
    const reversed = Object.fromEntries(Object.entries(content.services.items).reverse());
    content.services.items = reversed;
    const result = importContent(JSON.stringify(content));
    assert.equal(result.ok, true, 'ordem das chaves é irrelevante');
    // A página usa a ordem de SERVICE_IDS (verificado em landing-page.test.mjs).
  });

  test('nome sugerido do arquivo exportado', () => {
    assert.equal(exportFileName(new Date('2026-10-28T12:00:00Z')), 'conecta-conteudo-2026-10-28.json');
  });
});

test('o schema não contém arrays nem campos dinâmicos', () => {
  const kinds = new Set();
  const visit = (field) => {
    kinds.add(field.kind);
    if (field.kind === 'object') Object.values(field.fields).forEach(visit);
  };
  visit(contentSchema);
  assert.deepEqual([...kinds].sort(), ['color', 'image', 'literal', 'object', 'text']);
});

test('docs/CONTENT_SCHEMA.md tem o inventário em dia (npm run docs:schema)', async () => {
  const { upToDate } = await inventoryState();
  assert.equal(upToDate, true);
});

describe('schema v2: enquadramento de imagens', () => {
  const v1 = () => JSON.parse(readFileSync(new URL('./fixtures/content-v1.json', import.meta.url), 'utf8'));

  test('arquivo real da versão 1 é migrado (focus = center) e passa na validação estrita', () => {
    const result = importContent(JSON.stringify(v1()));
    assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result.errors));
    assert.equal(result.migratedFrom, 1);
    assert.equal(result.value.schemaVersion, SCHEMA_VERSION);
    for (const path of ['brand.logo', 'hero.image', 'about.image'])
      assert.equal(getAt(result.value, path).focus, 'center');
    assert.deepEqual(result.value.hero.image, { ...v1().hero.image, focus: 'center' }, 'demais valores preservados');
  });

  test('rascunho v1 no navegador também é migrado sem perda', () => {
    const draft = v1();
    draft.hero.title = 'Título do rascunho antigo';
    const { value, issues } = resolveWithDefaults(draft, loadDefaultContent());
    assert.deepEqual(issues, []);
    assert.equal(value.hero.title, 'Título do rascunho antigo');
  });

  test('migração v1 é defensiva com dados malformados', () => {
    const broken = { schemaVersion: 1, hero: { image: 'texto' }, brand: null };
    const result = migrateContent(broken);
    assert.equal(result.ok, true);
    assert.equal(result.value.hero.image, 'texto', 'a validação posterior aponta o erro');
    assert.equal(validateContent(result.value).ok, false);
  });

  test('focus só aceita a lista fechada e só onde há enquadramento', () => {
    const errorsFor = (path, focus) => {
      const content = loadDefaultContent();
      setAt(content, `${path}.focus`, focus);
      const result = validateContent(content);
      return result.ok ? [] : result.errors.map((e) => e.path);
    };
    assert.deepEqual(errorsFor('hero.image', 'top'), []);
    assert.deepEqual(errorsFor('about.image', 'right'), []);
    for (const bad of ['diagonal', '50% 50%', 'top; color: red', '', null, 1]) {
      assert.deepEqual(errorsFor('hero.image', bad), ['hero.image.focus'], String(bad));
    }
    assert.deepEqual(errorsFor('brand.logo', 'top'), ['brand.logo.focus'], 'logo não tem enquadramento');
    const missing = loadDefaultContent();
    delete missing.hero.image.focus;
    assert.equal(validateContent(missing).ok, false);
  });

  test('enquadramento vira classe fixa na página (sem estilo inline)', async () => {
    const content = loadDefaultContent();
    content.hero.image = { ...content.hero.image, src: null, focus: 'bottom' };
    content.about.gallery.scada.focus = 'top';
    const contentPath = join(tmp, 'focus.json');
    writeFileSync(contentPath, JSON.stringify(content));
    const outDir = join(tmp, 'focus-dist');
    await build({ outDir, contentPath, year: '2026' });
    const html = readFileSync(join(outDir, 'index.html'), 'utf8');
    assert.match(html, /class="media-fallback media__img media__img--focus-bottom"/);
    assert.match(html, /<img src="[^"]*galeria-scada.webp"[^>]*class="media__img media__img--focus-top"/);
    assert.doesNotMatch(html, /\sstyle=/);
  });

  test('AVIF: lê dimensões e recusa ISOBMFF que não é AVIF', () => {
    const box = (type, body) => [...be32(8 + body.length), ...[...type].map((c) => c.charCodeAt(0)), ...body];
    const ascii = (t) => [...t].map((c) => c.charCodeAt(0));
    const ispe = box('ispe', [0, 0, 0, 0, ...be32(1920), ...be32(1080)]);
    const ok = Uint8Array.from([...box('ftyp', [...ascii('avif'), 0, 0, 0, 0, ...ascii('mif1')]), ...ispe]);
    assert.deepEqual(readImageMeta(ok), { format: 'avif', width: 1920, height: 1080 });
    const heic = Uint8Array.from([...box('ftyp', [...ascii('heic'), 0, 0, 0, 0, ...ascii('mif1')]), ...ispe]);
    assert.throws(() => readImageMeta(heic), /não é AVIF/);
    const noDims = Uint8Array.from(
      box('ftyp', [...ascii('avif'), 0, 0, 0, 0, ...ascii('mif1'), ...new Array(16).fill(0)]),
    );
    assert.throws(() => readImageMeta(noDims), /sem dimensões/);
  });
});

describe('schema v3: redesign estrutural', () => {
  // Conteúdo v2 equivalente ao publicado antes do redesign (fixture v1 migrada para v2).
  const v2 = () => {
    const v1 = JSON.parse(readFileSync(new URL('./fixtures/content-v1.json', import.meta.url), 'utf8'));
    return MIGRATIONS[1](structuredClone(v1));
  };

  test('v2 → v3: títulos padrão divididos, campos novos preenchidos, validação estrita aprovada', () => {
    const data = v2();
    data.hero.title = 'Soluções técnicas para instalações industriais na Região Norte';
    const result = importContent(JSON.stringify(data));
    assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result.errors));
    assert.equal(result.value.schemaVersion, SCHEMA_VERSION);
    assert.equal(result.value.hero.title, 'Soluções técnicas para instalações industriais');
    assert.equal(result.value.hero.titleAccent, 'na Região Norte');
    assert.deepEqual(Object.keys(result.value.about.gallery), [...GALLERY_IDS]);
    assert.deepEqual(Object.keys(result.value.about.facts), [...FACT_IDS]);
    assert.equal(result.value.hero.image.src, data.hero.image.src, 'imagem existente preservada');
  });

  test('v2 → v3: título personalizado fica inteiro (destaque vazio), sem duplicar texto', () => {
    const data = v2();
    data.about.title = 'Um título escrito pelo cliente';
    const result = importContent(JSON.stringify(data));
    assert.equal(result.ok, true);
    assert.equal(result.value.about.title, 'Um título escrito pelo cliente');
    assert.equal(result.value.about.titleAccent, '');
  });

  test('v2 → v3 é defensiva com seções malformadas', () => {
    const result = migrateContent({ schemaVersion: 2, hero: 'texto', about: null });
    assert.equal(result.ok, true);
    assert.equal(result.value.hero, 'texto', 'a validação posterior aponta o erro');
    assert.equal(validateContent(result.value).ok, false);
  });

  test('mosaico e características têm quantidade fixa: o JSON não cria nem remove itens', () => {
    for (const mutate of [
      (c) => (c.about.gallery.extra = { src: null, alt: 'Nova', focus: 'center' }),
      (c) => delete c.about.gallery.subestacao,
      (c) => (c.about.facts.novo = { label: 'x', value: 'y' }),
      (c) => delete c.about.facts.contato,
      (c) => (c.about.gallery = []),
      (c) => (c.hero.seal.link = 'https://exemplo.com'),
    ]) {
      const content = loadDefaultContent();
      mutate(content);
      assert.equal(validateContent(content).ok, false, String(mutate));
    }
  });

  test('destaque de título aceita vazio, mas não HTML como marcação', async () => {
    const content = loadDefaultContent();
    content.hero.titleAccent = '';
    content.about.titleAccent = '<b onmouseover="x()">ok</b>';
    assert.equal(validateContent(content).ok, true);
    const contentPath = join(tmp, 'accent.json');
    writeFileSync(contentPath, JSON.stringify(content));
    const outDir = join(tmp, 'accent-dist');
    await build({ outDir, contentPath, year: '2026' });
    const html = readFileSync(join(outDir, 'index.html'), 'utf8');
    assert.match(html, /<span class="title-accent"><\/span><\/h1>/);
    assert.match(html, /&lt;b onmouseover=&quot;x\(\)&quot;&gt;ok&lt;\/b&gt;/);
    assert.doesNotMatch(html, /<b onmouseover/);
  });
});

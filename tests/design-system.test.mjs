import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { themeCss } from '../scripts/build.mjs';
import { contrastRatio } from '../src/lib/color.js';
import { MIN_CONTRAST_TEXT, STATUS_COLORS } from '../src/lib/schema.js';
import { validateContent } from '../src/lib/validate.js';
import { ROOT, loadDefaultContent } from './helpers.mjs';

const CSS_DIR = join(ROOT, 'src', 'css');
const cssFiles = readdirSync(CSS_DIR).filter((f) => f.endsWith('.css'));
const readCss = (name) => readFileSync(join(CSS_DIR, name), 'utf8');
const allCss = cssFiles.map(readCss).join('\n') + themeCss(loadDefaultContent().theme.colors);

const tokenValue = (css, name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];

test('toda variável CSS usada está definida', () => {
  const defined = new Set([...allCss.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  const used = new Set([...allCss.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((m) => m[1]));
  const missing = [...used].filter((name) => !defined.has(name));
  assert.deepEqual(missing, []);
});

test('cores de estado do CSS são as mesmas validadas pelo schema', () => {
  const tokens = readCss('tokens.css');
  for (const [name, hex] of Object.entries(STATUS_COLORS)) {
    assert.equal(tokenValue(tokens, `color-${name}`)?.toLowerCase(), hex, `--color-${name}`);
  }
});

test('fundo que deixe mensagens de estado ilegíveis é rejeitado pelo validador', () => {
  const content = loadDefaultContent();
  const { background, surface } = content.theme.colors;
  for (const hex of Object.values(STATUS_COLORS)) {
    for (const bg of [background, surface]) assert.ok(contrastRatio(hex, bg) >= MIN_CONTRAST_TEXT);
  }
  content.theme.colors.surface = '#7A7A7A';
  const result = validateContent(content);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.path === 'theme.colors.surface' && /mensagens de erro/.test(e.message)));
});

test('foco de teclado visível é definido e nunca removido sem substituto', () => {
  const base = readCss('base.css');
  assert.match(base, /:focus-visible\s*\{[^}]*outline:\s*var\(--focus-width\) solid var\(--focus-color\)/);
  for (const file of cssFiles) {
    const css = readCss(file);
    for (const [, selector] of css.matchAll(/([^{}]+)\{[^}]*outline:\s*(?:none|0)\s*;/g)) {
      const allowed = /:focus:not\(:focus-visible\)|\[tabindex='-1'\]:focus|\.card__link:focus-visible/;
      assert.match(selector.trim(), allowed, `outline removido em ${file}: ${selector.trim()}`);
    }
  }
});

test('prefers-reduced-motion anula transições e animações', () => {
  const base = readCss('base.css');
  assert.match(
    base,
    /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*transition-duration:\s*0\.01ms !important[\s\S]*animation-duration:|@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*animation-duration:\s*0\.01ms !important[\s\S]*transition-duration:/,
  );
  assert.match(readCss('tokens.css'), /@media \(prefers-reduced-motion: reduce\)[\s\S]*--duration-base:\s*0ms/);
});

test('efeitos de hover só em dispositivos com hover real', () => {
  for (const file of cssFiles) {
    const css = readCss(file);
    // Remove blocos @media (hover: hover) e procura :hover restante.
    const outside = css.replace(/@media \(hover: hover\)\s*\{(?:[^{}]*\{[^}]*\})*\s*\}/g, '');
    assert.doesNotMatch(outside, /:hover/, `:hover fora de @media (hover: hover) em ${file}`);
  }
});

test('sem gradientes, glassmorphism ou fontes externas', () => {
  assert.doesNotMatch(allCss, /gradient\(|backdrop-filter|@import|https?:\/\//);
});

test('fontes usam font-display: swap e arquivos locais', () => {
  const fonts = readCss('fonts.css');
  const faces = fonts.match(/@font-face\s*\{[^}]*\}/g) ?? [];
  assert.equal(faces.length, 3);
  for (const face of faces) {
    assert.match(face, /font-display:\s*swap/);
    assert.match(face, /src:\s*url\('\.\.\/assets\/fonts\/[a-z0-9-]+\.woff2'\)/);
  }
});

test('cabeçalho: estado ao rolar só muda cor/filete, nunca a altura (sem salto de layout)', () => {
  const css = readCss('components.css');
  for (const [, body] of css.matchAll(/\.site-header\[data-scrolled='(?:true|false)'\]\s*\{([^}]*)\}/g)) {
    assert.doesNotMatch(body, /height|padding|margin|top/, body);
  }
  const js = readFileSync(join(ROOT, 'src', 'js', 'header.js'), 'utf8');
  assert.match(js, /passive: true/);
  assert.doesNotMatch(js, /innerHTML|style\./);
});

test('títulos usam a serifa editorial e o texto a sans; nenhuma fonte antiga referenciada', () => {
  const tokens = readCss('tokens.css');
  assert.match(tokens, /--font-display:\s*'Cormorant Garamond'/);
  assert.match(tokens, /--font-sans:\s*'Manrope'/);
  assert.doesNotMatch(allCss, /Archivo|IBM Plex|font-stretch/);
});

test('o grid responde a 4, 8 e 12 colunas', () => {
  const tokens = readCss('tokens.css');
  assert.match(tokens, /--grid-columns:\s*4/);
  assert.match(tokens, /min-width: 40em\)\s*\{\s*:root\s*\{\s*--grid-columns:\s*8/);
  assert.match(tokens, /min-width: 64em\)\s*\{\s*:root\s*\{\s*--grid-columns:\s*12/);
});

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { build } from '../scripts/build.mjs';
import { APPROACH_IDS, FACT_IDS, GALLERY_IDS, PAGE_SECTIONS, SERVICE_IDS, walkSchema } from '../src/lib/schema.js';
import { WHATSAPP, whatsappUrl } from '../src/lib/site.js';
import { escapeHtml } from '../src/lib/template.js';
import { checkPolicy } from '../src/lib/policy.js';
import { loadDefaultContent } from './helpers.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'conecta-landing-'));
let html = '';
let placeholders = [];

before(async () => {
  const result = await build({ outDir: tmp, basePath: '/conecta-site', year: '2026' });
  placeholders = result.placeholders;
  html = readFileSync(join(tmp, 'index.html'), 'utf8');
});

after(() => rmSync(tmp, { recursive: true, force: true }));

const main = () => html.slice(html.indexOf('<main'), html.indexOf('</main>'));

describe('estrutura aprovada', () => {
  test('seções na ordem do inventário, dentro de <main>', () => {
    const ids = [...main().matchAll(/<section[^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(ids, [...PAGE_SECTIONS]);
  });

  test('cabeçalho antes de <main> e rodapé depois', () => {
    assert.ok(html.indexOf('<header class="site-header"') < html.indexOf('<main'));
    assert.ok(html.indexOf('<footer class="site-footer') > html.indexOf('</main>'));
  });

  test('um único h1 e cada seção rotulada por um título existente', () => {
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1);
    for (const [, labelledBy] of main().matchAll(/<section[^>]*aria-labelledby="([^"]+)"/g)) {
      assert.match(html, new RegExp(`<h[12][^>]*id="${labelledBy}"`), labelledBy);
    }
  });

  test('sem formulários, mapas, iframes ou seções não autorizadas', () => {
    assert.doesNotMatch(html, /<form|<iframe|<video|<input|<textarea/i);
    assert.doesNotMatch(html, /depoimento|testemunho|blog|perguntas frequentes|\bfaq\b|nossos clientes|cases?\b/i);
  });

  test('navegação aponta para as seções, na mesma ordem', () => {
    const nav = html.slice(html.indexOf('<nav'), html.indexOf('</nav>'));
    const anchors = [...nav.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(
      anchors,
      PAGE_SECTIONS.filter((id) => id !== 'inicio'),
    );
  });
});

describe('composição do redesign (referência de layout)', () => {
  const section = (id) => {
    const start = html.lastIndexOf('<section', html.indexOf(`id="${id}"`));
    return html.slice(start, html.indexOf('</section>', start));
  };

  test('hero: texto, botão e composição em camadas (moldura, foto, foto em primeiro plano, selo)', () => {
    const hero = section('inicio');
    assert.match(hero, /class="hero theme-dark"/);
    assert.match(hero, /<svg class="geometry"[^>]*aria-hidden="true"/);
    for (const layer of ['hero__text', 'hero__frame', 'hero__photo', 'hero__detail', 'hero__seal']) {
      assert.match(hero, new RegExp(`class="${layer}"`), layer);
    }
    assert.match(hero, /<h1[^>]*>[^<]+<span class="title-accent">[^<]+<\/span><\/h1>/);
    assert.match(hero, /fetchpriority="high"/, 'foto principal priorizada (LCP)');
    const { seal } = loadDefaultContent().hero;
    assert.match(hero, new RegExp(`hero__seal-title">${seal.title}<`));
  });

  test('empresa: mosaico de 8 imagens à esquerda, conteúdo e 6 características à direita', () => {
    const about = section('sobre');
    assert.equal((about.match(/class="about__tile"/g) ?? []).length, 1 + GALLERY_IDS.length);
    assert.ok(about.indexOf('about__mosaic') < about.indexOf('about__content'), 'mosaico antes do conteúdo');
    const facts = [...about.matchAll(/data-fact="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(facts, [...FACT_IDS]);
    assert.match(about, /class="button button--primary" href="https:\/\/wa\.me\//);
    // Só o 1º bloco de imagens (hero) é eager; o mosaico carrega sob demanda.
    for (const [img] of about.matchAll(/<img\b[^>]*>/g)) assert.match(img, /loading="lazy"/);
  });

  test('toda seção com botão leva ao WhatsApp oficial (nenhum botão sem ação)', () => {
    for (const id of ['inicio', 'sobre', 'servicos', 'atuacao', 'contato']) {
      const buttons = [...section(id).matchAll(/class="button button--primary[^"]*" href="([^"]+)"/g)];
      assert.ok(buttons.length > 0, id);
      for (const [, href] of buttons) assert.equal(href, escapeHtml(whatsappUrl()), id);
    }
    assert.doesNotMatch(html, /href="#"/);
  });
});

describe('serviços e abordagem', () => {
  test('21 serviços na ordem do schema, com os títulos do conteúdo', () => {
    const items = [...html.matchAll(/data-service="([^"]+)">([^<]+)</g)];
    assert.deepEqual(
      items.map((m) => m[1]),
      [...SERVICE_IDS],
    );
    const { items: content } = loadDefaultContent().services;
    assert.deepEqual(
      items.map((m) => m[2]),
      SERVICE_IDS.map((id) => escapeHtml(content[id].title)),
    );
  });

  test('rebobinagem de motores elétricos aparece na lista e no texto da empresa', () => {
    assert.match(html, /data-service="rebobinagem-motores">[^<]*[Rr]ebobinagem[^<]*</);
  });

  test('itens de abordagem na ordem do schema', () => {
    const ids = [...html.matchAll(/data-approach="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(ids, [...APPROACH_IDS]);
  });
});

describe('WhatsApp e links externos', () => {
  test('URL wa.me com número normalizado e mensagem codificada', () => {
    const url = new URL(whatsappUrl());
    assert.equal(url.origin + url.pathname, 'https://wa.me/5591980958661');
    assert.equal(url.searchParams.get('text'), WHATSAPP.message);
    assert.doesNotMatch(whatsappUrl(), /\s/);
    assert.equal(WHATSAPP.display, '(91) 98095-8661');
  });

  test('CTAs no cabeçalho, hero, contato e rodapé', () => {
    const count = html.split(`href="${escapeHtml(whatsappUrl())}"`).length - 1;
    assert.ok(count >= 4, `encontrados ${count}`);
  });

  test('todo link em nova aba tem rel="noopener noreferrer" e aviso para leitores de tela', () => {
    const links = [...html.matchAll(/<a\s[^>]*target="_blank"[^>]*>[\s\S]*?<\/a>/g)].map((m) => m[0]);
    assert.ok(links.length > 0);
    for (const link of links) {
      assert.match(link, /rel="noopener noreferrer"/);
      assert.match(link, /\(abre em nova aba\)/);
    }
  });

  test('links externos só para o WhatsApp oficial', () => {
    const external = [...html.matchAll(/href="(https?:[^"]+)"/g)].map((m) => m[1]);
    assert.ok(
      external.every((href) => href === escapeHtml(whatsappUrl())),
      external.join(', '),
    );
  });
});

describe('interface', () => {
  test('botão do menu controla a navegação e começa recolhido', () => {
    const buttons = [...html.matchAll(/<button\b[^>]*>/g)].map((m) => m[0]);
    assert.equal(buttons.length, 1);
    const [button] = buttons;
    assert.match(button, /type="button"/);
    assert.match(button, /aria-expanded="false"/);
    const controls = button.match(/aria-controls="([^"]+)"/)?.[1];
    assert.match(html, new RegExp(`<nav[^>]*id="${controls}"`));
  });

  test('sem emoji no lugar de ícones; ícones SVG são decorativos', () => {
    assert.doesNotMatch(html, /\p{Emoji_Presentation}|️/u);
    for (const [svg] of html.matchAll(/<svg\b[^>]*>/g)) {
      assert.match(svg, /aria-hidden="true"/);
      assert.match(svg, /focusable="false"/);
    }
  });

  test('imagens com dimensões e alt; imagens pendentes viram fallback acessível', () => {
    for (const [img] of html.matchAll(/<img\b[^>]*>/g)) {
      assert.match(img, /\swidth="\d+"/);
      assert.match(img, /\sheight="\d+"/);
      // Único alt vazio permitido: o símbolo da marca, sempre ao lado do nome em texto.
      if (/class="(?:brand__logo|hero__brand-mark)"/.test(img)) assert.match(img, /\salt=""/);
      else assert.match(img, /\salt="[^"]+"/);
    }
    const fallbacks = (html.match(/class="media-fallback[^"]*" role="img" aria-label="[^"]+"/g) ?? []).length;
    assert.equal(fallbacks, placeholders.length);
  });

  test('build informa as imagens pendentes', () => {
    const content = loadDefaultContent();
    const expected = [];
    walkSchema((field, path) => {
      if (field.kind === 'image' && path.split('.').reduce((node, key) => node[key], content).src === null) {
        expected.push(path);
      }
    });
    assert.deepEqual(placeholders, expected);
    assert.deepEqual(placeholders, [], 'nenhuma imagem pendente');
  });
});

describe('conteúdo sem afirmações não confirmadas', () => {
  // Mesmas regras aplicadas no pipeline de publicação (src/lib/policy.js).
  const content = loadDefaultContent();
  const set = (path, value) => {
    const copy = structuredClone(content);
    const keys = path.split('.');
    const last = keys.pop();
    keys.reduce((node, key) => node[key], copy)[last] = value;
    return [...new Set(checkPolicy(copy).map((e) => e.path))];
  };

  test('conteúdo atual sem anos, estatísticas, certificações, garantias, preços ou dados pessoais', () => {
    assert.deepEqual(checkPolicy(content), []);
  });

  for (const [label, text] of [
    ['anos de mercado', 'Mais de 20 anos de experiência'],
    ['estatística', '98% de satisfação'],
    ['certificação', 'Empresa certificada ISO 9001'],
    ['garantia', 'Garantia de resultado'],
    ['preço', 'A partir de R$ 500'],
    ['e-mail', 'contato@exemplo.com.br'],
    ['CNPJ', 'CNPJ 12.345.678/0001-90'],
    ['endereço', 'Rua das Flores, 100'],
    ['telefone', 'Ligue (91) 3222-1234'],
    ['link', 'Veja www.exemplo.com'],
  ]) {
    test(`bloqueia ${label}`, () => assert.deepEqual(set('about.text', text), ['about.text']));
  }
});

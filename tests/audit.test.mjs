// Regras da auditoria técnica (PROJECT_AUDIT §14): SEO, performance, CSP,
// movimento e cadeia de publicação.

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { SITE_CSS, build, bundleCss } from '../scripts/build.mjs';
import { normalizeSiteUrl, organizationJsonLd, robotsTxt, seoHead, sitemapXml } from '../src/lib/seo.js';
import { renderTemplate } from '../src/lib/template.js';
import { ROOT, loadDefaultContent } from './helpers.mjs';

const read = (...parts) => readFileSync(join(ROOT, ...parts), 'utf8');

describe('URL pública (SITE_URL)', () => {
  test('normaliza http(s) com barra final', () => {
    assert.equal(normalizeSiteUrl(''), '');
    assert.equal(normalizeSiteUrl('https://usuario.github.io/repo'), 'https://usuario.github.io/repo/');
    assert.equal(normalizeSiteUrl('https://www.exemplo.com.br/'), 'https://www.exemplo.com.br/');
    assert.equal(normalizeSiteUrl('  https://Exemplo.com  '), 'https://exemplo.com/');
  });

  for (const value of [
    'javascript:alert(1)',
    'data:text/html,x',
    'ftp://exemplo.com/',
    'https://user:senha@exemplo.com/',
    'https://exemplo.com/?q=1',
    'https://exemplo.com/#x',
    'https://exemplo.com/a"b',
    'exemplo.com',
  ]) {
    test(`recusa ${value}`, () => assert.throws(() => normalizeSiteUrl(value), /SITE_URL/));
  }
});

describe('metadados gerados', () => {
  const content = loadDefaultContent();

  test('dados estruturados só com fatos confirmados', () => {
    const data = JSON.parse(organizationJsonLd(content, 'https://exemplo.com/'));
    assert.deepEqual(Object.keys(data).sort(), [
      '@context',
      '@type',
      'areaServed',
      'description',
      'name',
      'telephone',
      'url',
    ]);
    assert.equal(data['@type'], 'Organization');
    assert.equal(data.telephone, '+5591980958661');
    assert.equal(data.areaServed.name, 'Região Norte do Brasil');
    assert.equal(data.name, content.brand.name);
    assert.equal('url' in JSON.parse(organizationJsonLd(content)), false, 'sem URL conhecida, sem "url"');
  });

  test('texto do conteúdo não encerra o <script> do JSON-LD', () => {
    const hostile = { ...content, brand: { ...content.brand, name: '</script><script>alert(1)</script>&' } };
    const json = organizationJsonLd(hostile);
    assert.doesNotMatch(json, /<|>|&/);
    assert.equal(JSON.parse(json).name, hostile.brand.name, 'o valor continua o mesmo após o parse');
  });

  test('canonical e og:url só com URL conhecida', () => {
    assert.doesNotMatch(seoHead(content), /canonical|og:url/);
    const head = seoHead(content, 'https://exemplo.com/');
    assert.match(head, /<link rel="canonical" href="https:\/\/exemplo\.com\/">/);
    assert.match(head, /<meta property="og:url" content="https:\/\/exemplo\.com\/">/);
  });

  test('Twitter Card e og:image: imagem só quando existe fotografia publicada e URL conhecida', () => {
    const semFoto = { ...content, hero: { ...content.hero, image: { ...content.hero.image, src: null } } };
    assert.match(seoHead(semFoto, 'https://exemplo.com/'), /<meta name="twitter:card" content="summary">/);
    assert.doesNotMatch(seoHead(semFoto, 'https://exemplo.com/'), /og:image/, 'sem fotografia, sem og:image');
    const comFoto = {
      ...content,
      hero: { ...content.hero, image: { src: 'assets/img/hero.webp', alt: 'Painel "A"', focus: 'center' } },
    };
    assert.doesNotMatch(seoHead(comFoto), /og:image/, 'sem URL pública, sem og:image');
    const head = seoHead(comFoto, 'https://exemplo.com/repo/');
    assert.match(head, /<meta property="og:image" content="https:\/\/exemplo\.com\/repo\/assets\/img\/hero\.webp">/);
    assert.match(head, /<meta property="og:image:alt" content="Painel &quot;A&quot;">/);
    assert.match(head, /<meta name="twitter:card" content="summary_large_image">/);
    const svg = { ...comFoto, hero: { ...comFoto.hero, image: { ...comFoto.hero.image, src: 'assets/img/hero.svg' } } };
    assert.doesNotMatch(seoHead(svg, 'https://exemplo.com/'), /og:image/, 'redes sociais não leem SVG');
  });

  test('robots.txt libera tudo e não divulga o painel', () => {
    assert.equal(robotsTxt(), 'User-agent: *\nAllow: /\n');
    assert.match(robotsTxt('https://exemplo.com/'), /\nSitemap: https:\/\/exemplo\.com\/sitemap\.xml\n$/);
    assert.doesNotMatch(robotsTxt('https://exemplo.com/'), /admin/i);
  });

  test('sitemap com a única página indexável', () => {
    const xml = sitemapXml('https://exemplo.com/repo/');
    assert.equal(xml.match(/<loc>/g).length, 1);
    assert.match(xml, /<loc>https:\/\/exemplo\.com\/repo\/<\/loc>/);
  });
});

describe('build com URL pública', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'conecta-audit-'));
  const outDir = join(tmp, 'dist');
  before(() => build({ outDir, basePath: '/repo', siteUrl: 'https://usuario.github.io/repo', year: '2026' }));
  after(() => rmSync(tmp, { recursive: true, force: true }));

  test('index com canonical, og:url e JSON-LD; 404 e painel sem eles', () => {
    const index = readFileSync(join(outDir, 'index.html'), 'utf8');
    assert.match(index, /<link rel="canonical" href="https:\/\/usuario\.github\.io\/repo\/">/);
    assert.match(index, /<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org"/);
    for (const page of ['404.html', 'admin/index.html']) {
      assert.doesNotMatch(readFileSync(join(outDir, page), 'utf8'), /canonical|ld\+json/, page);
    }
  });

  test('404 de site de projeto aponta para /repo/ e o painel é uma página real em admin/', () => {
    assert.match(readFileSync(join(outDir, '404.html'), 'utf8'), /<base href="\/repo\/">/);
    assert.match(readFileSync(join(outDir, 'admin', 'index.html'), 'utf8'), /href="\.\.\/css\/admin\.css"/);
  });

  test('robots.txt e sitemap.xml publicados', () => {
    assert.match(
      readFileSync(join(outDir, 'robots.txt'), 'utf8'),
      /Sitemap: https:\/\/usuario\.github\.io\/repo\/sitemap\.xml/,
    );
    assert.ok(existsSync(join(outDir, 'sitemap.xml')));
  });

  test('sem source maps nem arquivos de desenvolvimento publicados', () => {
    const files = readdirSync(outDir, { recursive: true }).map(String);
    assert.deepEqual(
      files.filter((f) => /\.map$|\.md$|\.test\.|package(?:-lock)?\.json|node_modules|\.github|\.env/.test(f)),
      [],
    );
  });

  test('css/site.css reúne as folhas do site na ordem, sem comentários', () => {
    const css = readFileSync(join(outDir, 'css', 'site.css'), 'utf8');
    assert.doesNotMatch(css, /\/\*/);
    let last = -1;
    for (const marker of [
      '@font-face',
      '--grid-columns: 4',
      '[hidden]',
      '.container {',
      '.skip-link {',
      '.hero__grid {',
    ]) {
      const at = css.indexOf(marker);
      assert.ok(at > last, `ordem: ${marker}`);
      last = at;
    }
  });
});

describe('build com domínio personalizado (sem base path)', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'conecta-dominio-'));
  const outDir = join(tmp, 'dist');
  before(() => build({ outDir, basePath: '', siteUrl: 'https://www.exemplo.com.br', year: '2026' }));
  after(() => rmSync(tmp, { recursive: true, force: true }));

  test('canonical, sitemap e 404 usam a raiz do domínio', () => {
    assert.match(
      readFileSync(join(outDir, 'index.html'), 'utf8'),
      /<link rel="canonical" href="https:\/\/www\.exemplo\.com\.br\/">/,
    );
    assert.match(readFileSync(join(outDir, 'sitemap.xml'), 'utf8'), /<loc>https:\/\/www\.exemplo\.com\.br\/<\/loc>/);
    assert.match(readFileSync(join(outDir, '404.html'), 'utf8'), /<base href="\/">/);
  });
});

describe('performance', () => {
  test('toda folha do site público está em SITE_CSS (só o painel fica fora)', () => {
    const files = readdirSync(join(ROOT, 'src', 'css')).filter((f) => f.endsWith('.css'));
    assert.deepEqual(
      files.filter((f) => !SITE_CSS.includes(f)),
      ['admin.css'],
    );
  });

  test('o <head> público carrega só theme.css e site.css', () => {
    const links = [...read('src', 'partials', 'head.html').matchAll(/rel="stylesheet" href="([^"]+)"/g)].map(
      (m) => m[1],
    );
    assert.deepEqual(links, ['{{build.root}}css/theme.css', '{{build.root}}css/site.css']);
  });

  test('bundleCss remove comentários e linhas vazias e preserva as regras', () => {
    assert.equal(bundleCss(['/* a */\n.a {\n  color: red;\n}\n\n', '.b{}\r\n']), '.a {\n  color: red;\n}\n.b{}\n');
  });

  test('imagem do hero (LCP): carregamento imediato e prioridade alta; demais com lazy', () => {
    const page = read('src', 'pages', 'index.html');
    assert.match(page, /\{\{image content\.hero\.image [^}]*loading=eager fetchpriority=high\}\}/);
    assert.match(page, /\{\{image content\.about\.image (?![^}]*eager)[^}]*\}\}/);
  });

  test('fetchpriority aceita só valores válidos', () => {
    const context = { content: { img: { src: 'assets/img/a.webp', alt: 'A' } }, build: { root: './' } };
    assert.match(renderTemplate('{{image content.img fetchpriority=high}}', { context }), /fetchpriority="high"/);
    assert.throws(() => renderTemplate('{{image content.img fetchpriority=x"onload}}', { context }), /inválido/);
  });
});

describe('segurança', () => {
  test('CSP pública exige Trusted Types (nenhum sink de HTML no JavaScript do site)', () => {
    const csp = read('src', 'partials', 'head.html').match(/Content-Security-Policy" content="([^"]+)"/)[1];
    for (const directive of [
      "default-src 'self'",
      "script-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'none'",
      "require-trusted-types-for 'script'",
      "trusted-types 'none'",
    ]) {
      assert.ok(csp.includes(directive), directive);
    }
    assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|\*/);
  });

  test('actions dos workflows fixadas por SHA de commit', () => {
    for (const file of ['pages.yml', 'validate.yml']) {
      const uses = [...read('.github', 'workflows', file).matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
      assert.ok(uses.length > 0);
      for (const ref of uses) assert.match(ref, /^actions\/[a-z-]+@[0-9a-f]{40}$/, `${file}: ${ref}`);
    }
  });

  test('workflows sem pull_request_target nem permissões de escrita no nível do workflow', () => {
    for (const file of ['pages.yml', 'validate.yml']) {
      const yml = read('.github', 'workflows', file);
      assert.doesNotMatch(yml, /pull_request_target|write-all|secrets\./, file);
      const top = yml.match(/^permissions:(.*)$/m)?.[1].trim();
      assert.ok(top === '{}' || top === '', `${file}: permissions no topo`);
      if (top === '') assert.match(yml, /^permissions:\n {2}contents: read\n/m, file);
    }
  });
});

describe('movimento', () => {
  /** Remove blocos @media (prefers-reduced-motion: no-preference) { … } com chaves balanceadas. */
  function withoutMotionBlocks(css) {
    let out = css;
    for (let at = out.indexOf('@media (prefers-reduced-motion: no-preference)'); at !== -1;) {
      let i = out.indexOf('{', at);
      let depth = 0;
      do {
        if (out[i] === '{') depth++;
        if (out[i] === '}') depth--;
        i++;
      } while (depth > 0 && i < out.length);
      out = out.slice(0, at) + out.slice(i);
      at = out.indexOf('@media (prefers-reduced-motion: no-preference)');
    }
    return out;
  }

  test('toda animação só existe com prefers-reduced-motion: no-preference', () => {
    for (const file of readdirSync(join(ROOT, 'src', 'css')).filter((f) => f.endsWith('.css'))) {
      const outside = withoutMotionBlocks(read('src', 'css', file));
      assert.doesNotMatch(outside, /(?:^|[;{\s])animation(?:-name)?\s*:\s*(?!none)/m, file);
    }
  });

  test('animações de rolagem só com suporte nativo (sem JavaScript, sem conteúdo oculto)', () => {
    const css = read('src', 'css', 'sections.css');
    assert.match(css, /@supports \(animation-timeline: view\(\)\)\s*\{[^}]*\{[^}]*animation-timeline: view\(\);/);
  });
});

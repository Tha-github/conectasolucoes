import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { contrastRatio } from '../src/lib/color.js';
import { escapeHtml, renderTemplate } from '../src/lib/template.js';
import { createMediaFallback } from '../src/js/media-fallback.js';

const context = {
  content: {
    title: '<script>alert("x")</script> & \'aspas\'',
    logo: { src: null, alt: 'Conecta Soluções' },
    photo: { src: 'assets/img/foto.webp', alt: 'Painel "elétrico"' },
    nested: { value: 'ok' },
  },
  build: { root: './', year: '2026' },
};

const render = (source, partials) => renderTemplate(source, { context, partials });

describe('renderTemplate', () => {
  test('escapa todo valor de conteúdo', () => {
    assert.equal(
      render('<h1>{{content.title}}</h1>'),
      '<h1>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;aspas&#39;</h1>',
    );
  });

  test('não reprocessa marcações vindas do conteúdo', () => {
    const out = renderTemplate('{{content.v}}', { context: { content: { v: '{{build.year}}' } } });
    assert.equal(out, '{{build.year}}');
  });

  test('falha em chave inexistente', () => {
    assert.throws(() => render('{{content.nope}}'), /inexistente/);
  });

  test('falha em namespace não permitido', () => {
    assert.throws(() => render('{{process.env}}'), /inválida/);
  });

  test('falha ao inserir objeto como texto', () => {
    assert.throws(() => render('{{content.nested}}'), /não é um texto/);
  });

  test('falha em marcação sem fechamento', () => {
    assert.throws(() => render('<p>{{content.title</p>'), /sem fechamento/);
  });

  test('expande parciais e falha em parcial inexistente ou cíclico', () => {
    assert.equal(render('[{{> a}}]', { a: 'A{{> b}}\n', b: 'B\n' }), '[AB]');
    assert.throws(() => render('{{> x}}', {}), /inexistente/);
    assert.throws(() => render('{{> a}}', { a: '{{> a}}' }), /ciclo/);
  });

  test('imagem sem arquivo vira fallback com o texto alternativo', () => {
    assert.equal(
      render('{{image content.logo class=brand__logo}}'),
      '<span class="media-fallback brand__logo" role="img" aria-label="Conecta Soluções"><span class="media-fallback__text">Conecta Soluções</span></span>',
    );
  });

  test('imagem existente usa caminho relativo e atributos seguros', () => {
    assert.equal(
      render('{{image content.photo width=800 height=600}}'),
      '<img src="./assets/img/foto.webp" alt="Painel &quot;elétrico&quot;" width="800" height="600" loading="lazy" decoding="async" data-media-fallback>',
    );
  });

  test('rejeita atributo de imagem não permitido', () => {
    assert.throws(() => render('{{image content.photo onerror=alert(1)}}'), /inválido/);
    assert.throws(() => render('{{image content.photo class="x"}}'), /inválido/);
  });
});

test('escapeHtml cobre os cinco caracteres especiais', () => {
  assert.equal(escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
});

test('contrastRatio segue a fórmula WCAG', () => {
  assert.equal(contrastRatio('#000000', '#FFFFFF').toFixed(1), '21.0');
  assert.equal(contrastRatio('#777777', '#777777'), 1);
});

describe('createMediaFallback (DOM)', () => {
  // DOM mínimo suficiente para a função; evita dependência de jsdom.
  const fakeDoc = {
    createElement: () => ({
      attrs: {},
      children: [],
      className: '',
      textContent: '',
      setAttribute(name, value) {
        this.attrs[name] = value;
      },
      append(child) {
        this.children.push(child);
      },
    }),
  };

  test('usa textContent e aria-label, nunca HTML', () => {
    const box = createMediaFallback(fakeDoc, { alt: '<img src=x onerror=alert(1)>', className: 'hero' });
    assert.equal(box.className, 'media-fallback hero');
    assert.equal(box.attrs.role, 'img');
    assert.equal(box.attrs['aria-label'], '<img src=x onerror=alert(1)>');
    assert.equal(box.children[0].textContent, '<img src=x onerror=alert(1)>');
  });

  test('imagem decorativa (alt vazio) fica oculta para leitores de tela', () => {
    const box = createMediaFallback(fakeDoc, { alt: '' });
    assert.equal(box.attrs['aria-hidden'], 'true');
    assert.equal(box.children.length, 0);
  });
});

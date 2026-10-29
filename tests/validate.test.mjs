import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { MAX_CONTENT_JSON_LENGTH, parseContent, validateContent } from '../src/lib/validate.js';
import { loadDefaultContent } from './helpers.mjs';

/** Aplica uma alteração ao conteúdo padrão e retorna os caminhos com erro. */
function errorsAfter(mutate) {
  const content = loadDefaultContent();
  mutate(content);
  const result = validateContent(content);
  return result.ok ? [] : result.errors.map((e) => e.path);
}

describe('estrutura', () => {
  test('rejeita propriedade desconhecida na raiz', () => {
    assert.deepEqual(
      errorsAfter((c) => (c.extra = 'x')),
      ['extra'],
    );
  });

  test('rejeita propriedade desconhecida aninhada', () => {
    assert.deepEqual(
      errorsAfter((c) => (c.brand.html = '<b>x</b>')),
      ['brand.html'],
    );
  });

  test('rejeita serviço novo (não é possível adicionar itens)', () => {
    assert.deepEqual(
      errorsAfter((c) => (c.services.items['servico-novo'] = { title: 'Novo' })),
      ['services.items.servico-novo'],
    );
  });

  test('rejeita remoção de serviço', () => {
    assert.deepEqual(
      errorsAfter((c) => delete c.services.items['sistemas-scada']),
      ['services.items.sistemas-scada'],
    );
  });

  test('rejeita __proto__ vindo de JSON', () => {
    const json = JSON.stringify(loadDefaultContent()).replace('{', '{"__proto__":{"polluted":true},');
    const result = parseContent(json);
    assert.equal(result.ok, false);
    assert.equal(/** @type {any} */ ({}).polluted, undefined);
  });

  test('rejeita schemaVersion diferente', () => {
    assert.deepEqual(
      errorsAfter((c) => (c.schemaVersion = 4)),
      ['schemaVersion'],
    );
  });

  test('rejeita array no lugar de objeto', () => {
    assert.deepEqual(
      errorsAfter((c) => (c.services.items = [])),
      ['services.items'],
    );
  });
});

describe('textos', () => {
  test('rejeita texto vazio ou só com espaços', () => {
    assert.deepEqual(
      errorsAfter((c) => (c.brand.name = '   ')),
      ['brand.name'],
    );
  });

  test('rejeita texto acima do limite', () => {
    assert.deepEqual(
      errorsAfter((c) => (c.meta.title = 'a'.repeat(71))),
      ['meta.title'],
    );
  });

  test('rejeita tipo diferente de texto', () => {
    assert.deepEqual(
      errorsAfter((c) => (c.brand.tagline = 42)),
      ['brand.tagline'],
    );
  });

  test('rejeita quebra de linha em campo de uma linha', () => {
    assert.deepEqual(
      errorsAfter((c) => (c.brand.tagline = 'a\nb')),
      ['brand.tagline'],
    );
  });

  test('rejeita caracteres de controle e de direção de texto', () => {
    assert.deepEqual(
      errorsAfter((c) => (c.brand.tagline = 'abc\u0007')),
      ['brand.tagline'],
    );
    assert.deepEqual(
      errorsAfter((c) => (c.brand.tagline = 'abc‮def')),
      ['brand.tagline'],
    );
  });

  test('aceita sinais como < e & (são escapados na renderização)', () => {
    assert.deepEqual(
      errorsAfter((c) => (c.brand.tagline = 'Painéis < 1 kV & sistemas')),
      [],
    );
  });
});

describe('imagens', () => {
  for (const src of [
    'javascript:alert(1)',
    'https://exemplo.com/logo.png',
    '//exemplo.com/logo.png',
    '/assets/img/logo.png',
    'assets/img/../../segredo.png',
    'assets/img/Logo.png',
    'assets/img/logo.gif',
    'data:image/png;base64,AAAA',
    'assets/img/sub/logo.png',
  ]) {
    test(`rejeita src "${src}"`, () => {
      assert.deepEqual(
        errorsAfter((c) => (c.brand.logo.src = src)),
        ['brand.logo.src'],
      );
    });
  }

  test('aceita caminho aprovado', () => {
    assert.deepEqual(
      errorsAfter((c) => (c.brand.logo.src = 'assets/img/logo-conecta.svg')),
      [],
    );
  });

  test('exige texto alternativo nas fotografias; o símbolo ao lado do nome pode ser decorativo', () => {
    assert.deepEqual(
      errorsAfter((c) => (c.hero.image.alt = '')),
      ['hero.image.alt'],
    );
    assert.deepEqual(
      errorsAfter((c) => (c.about.gallery.scada.alt = '  ')),
      ['about.gallery.scada.alt'],
    );
    assert.deepEqual(
      errorsAfter((c) => (c.brand.logo.alt = '')),
      [],
    );
  });

  test('rejeita propriedade extra na imagem', () => {
    assert.deepEqual(
      errorsAfter((c) => (c.brand.logo.onerror = 'x')),
      ['brand.logo.onerror'],
    );
  });
});

describe('cores', () => {
  for (const value of ['red', '#fff', '#12345G', 'rgb(0,0,0)', '#123456;}', '']) {
    test(`rejeita cor "${value}"`, () => {
      assert.deepEqual(
        errorsAfter((c) => (c.theme.colors.accent = value)),
        ['theme.colors.accent'],
      );
    });
  }

  test('rejeita texto sem contraste AA (4,5:1) sobre cada fundo', () => {
    assert.deepEqual(
      errorsAfter((c) => (c.theme.colors.text = '#BBBBBB')),
      ['theme.colors.text', 'theme.colors.text', 'theme.colors.text'],
    );
  });

  test('rejeita borda de componente abaixo de 3:1', () => {
    assert.deepEqual(
      errorsAfter((c) => (c.theme.colors.borderStrong = '#B0B0B0')),
      ['theme.colors.borderStrong', 'theme.colors.borderStrong'],
    );
  });

  test('aceita borda de componente entre 3:1 e 4,5:1', () => {
    assert.deepEqual(
      errorsAfter((c) => (c.theme.colors.borderStrong = '#767B82')),
      [],
    );
  });
});

describe('parseContent', () => {
  test('rejeita JSON malformado sem lançar exceção', () => {
    const result = parseContent('{ "schemaVersion": ');
    assert.equal(result.ok, false);
  });

  test('rejeita entrada acima do tamanho máximo', () => {
    const result = parseContent(' '.repeat(MAX_CONTENT_JSON_LENGTH + 1));
    assert.equal(result.ok, false);
  });

  test('rejeita raiz que não é objeto', () => {
    assert.equal(parseContent('[]').ok, false);
    assert.equal(parseContent('null').ok, false);
  });

  test('ida e volta: serializar e validar preserva o conteúdo', () => {
    const content = loadDefaultContent();
    const result = parseContent(JSON.stringify(content));
    assert.equal(result.ok, true);
    assert.deepEqual(result.ok && result.value, content);
  });
});

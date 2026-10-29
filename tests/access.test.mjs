// Acesso do painel (exceção do CLAUDE.md §7): token cifrado pela senha,
// arquivo de acesso estrito e lista fechada do que o painel pode gravar.

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';
import { build } from '../scripts/build.mjs';
import {
  ACCESS_ITERATIONS,
  bytesToBase64,
  base64ToBytes,
  decryptToken,
  encryptToken,
  isGitHubToken,
  isPublishablePath,
  parseAccessFile,
  passwordProblem,
  serializeAccessFile,
} from '../src/lib/access.js';

const TOKEN = `github_pat_${'Ab3'.repeat(25)}`;
const PASSWORD = 'uma frase longa de teste';
// Iterações reduzidas só para os testes de ida e volta ficarem rápidos.
const FAST = { iterations: ACCESS_ITERATIONS };

const tmp = mkdtempSync(join(tmpdir(), 'conecta-access-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

describe('cifra do token', () => {
  let file;

  test('ida e volta com a senha certa; o arquivo não contém o token', async () => {
    file = await encryptToken(TOKEN, PASSWORD, FAST);
    const text = serializeAccessFile(file);
    assert.doesNotMatch(text, /github_pat_/);
    assert.deepEqual(Object.keys(file), ['v', 'kdf', 'iterations', 'salt', 'iv', 'data']);
    assert.equal(file.iterations, ACCESS_ITERATIONS);
    assert.deepEqual(parseAccessFile(text), file);
    assert.equal(await decryptToken(file, PASSWORD), TOKEN);
  });

  test('senha errada ou arquivo adulterado → null (sem exceção)', async () => {
    assert.equal(await decryptToken(file, 'outra senha qualquer'), null);
    const data = base64ToBytes(file.data);
    data[0] ^= 1;
    assert.equal(await decryptToken({ ...file, data: bytesToBase64(data) }, PASSWORD), null);
  });

  test('sal e vetor aleatórios: cifrar duas vezes gera arquivos diferentes', async () => {
    const other = await encryptToken(TOKEN, PASSWORD, FAST);
    assert.notEqual(other.salt, file.salt);
    assert.notEqual(other.data, file.data);
  });

  test('recusa token fora do formato e senha fraca', async () => {
    await assert.rejects(() => encryptToken('abc', PASSWORD), /token inválido/);
    await assert.rejects(() => encryptToken(TOKEN, 'curta'), /pelo menos 10/);
    assert.equal(isGitHubToken(TOKEN), true);
    assert.equal(isGitHubToken(`ghp_${'a'.repeat(36)}`), true);
    for (const bad of ['', 'github_pat_x', `Bearer ${TOKEN}`, `${TOKEN}\n`, null])
      assert.equal(isGitHubToken(bad), false);
    assert.match(passwordProblem('aaaaaaaaaaaa'), /repetido/);
    assert.equal(passwordProblem(PASSWORD), null);
  });
});

describe('arquivo de acesso (entrada não confiável)', () => {
  const valid = {
    v: 1,
    kdf: 'PBKDF2-SHA256',
    iterations: ACCESS_ITERATIONS,
    salt: bytesToBase64(new Uint8Array(16)),
    iv: bytesToBase64(new Uint8Array(12)),
    data: 'QUJD',
  };
  const parse = (value) => parseAccessFile(typeof value === 'string' ? value : JSON.stringify(value));

  test('aceita o formato exato', () => assert.deepEqual(parse(valid), valid));

  for (const [name, value] of [
    ['JSON inválido', '{'],
    ['array', '[]'],
    ['propriedade extra', { ...valid, token: 'x' }],
    ['campo ausente', { ...valid, iv: undefined }],
    ['versão desconhecida', { ...valid, v: 2 }],
    ['outra derivação', { ...valid, kdf: 'MD5' }],
    ['iterações rebaixadas', { ...valid, iterations: 1000 }],
    ['iterações absurdas', { ...valid, iterations: 1e9 }],
    ['base64 inválido', { ...valid, data: '<script>' }],
    ['sal curto', { ...valid, salt: bytesToBase64(new Uint8Array(4)) }],
    ['IV de tamanho errado', { ...valid, iv: bytesToBase64(new Uint8Array(16)) }],
    ['grande demais', JSON.stringify({ ...valid, data: 'A'.repeat(5000) })],
  ]) {
    test(`recusa: ${name}`, () => assert.equal(parse(value), null));
  }
});

describe('o que o painel pode gravar no repositório', () => {
  test('só conteúdo, acesso e imagens raster', () => {
    for (const ok of [
      'content/content.json',
      'content/acesso.json',
      'src/assets/img/hero-image-20261029-143005.webp',
      'src/assets/img/foto.jpg',
    ]) {
      assert.equal(isPublishablePath(ok), true, ok);
    }
    for (const bad of [
      '.github/workflows/pages.yml',
      'src/js/main.js',
      'src/pages/index.html',
      'CLAUDE.md',
      'package.json',
      'src/assets/img/logo.svg',
      'src/assets/img/../../js/x.png',
      'src/assets/img/Foto.png',
      'content/outro.json',
      '/content/content.json',
    ]) {
      assert.equal(isPublishablePath(bad), false, bad);
    }
  });
});

describe('build com o arquivo de acesso', () => {
  test('arquivo válido vai para admin/acesso.json; inválido interrompe o build', async () => {
    const accessPath = join(tmp, 'acesso.json');
    writeFileSync(accessPath, serializeAccessFile(await encryptToken(TOKEN, PASSWORD, FAST)));
    const outDir = join(tmp, 'dist');
    await build({ outDir, accessPath, year: '2026' });
    assert.equal(readFileSync(join(outDir, 'admin', 'acesso.json'), 'utf8'), readFileSync(accessPath, 'utf8'));

    const missing = join(tmp, 'dist-sem');
    await build({ outDir: missing, accessPath: join(tmp, 'nao-existe.json'), year: '2026' });
    assert.equal(existsSync(join(missing, 'admin', 'acesso.json')), false, 'sem arquivo: configuração inicial');

    writeFileSync(accessPath, JSON.stringify({ token: TOKEN }));
    await assert.rejects(
      () => build({ outDir: join(tmp, 'dist-ruim'), accessPath, year: '2026' }),
      /acesso do painel inválido/,
    );
  });
});

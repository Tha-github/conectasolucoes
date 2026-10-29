// Fluxo de publicação: alterações não autorizadas ou inválidas não chegam ao site.
// Cobre o que pode ser verificado localmente: as barreiras do CI (validação de
// conteúdo e escopo do PR) e a configuração versionada dos workflows e do
// ruleset. A aplicação do ruleset no GitHub é verificada após criar o
// repositório (docs/publicacao.md §6).

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';
import { checkContentScope, gitChanges, referencedImagesIn } from '../scripts/check-content-scope.mjs';
import { validatePublish } from '../scripts/validate-publish.mjs';
import { githubUploadUrl } from '../src/lib/site.js';
import { ROOT, loadDefaultContent } from './helpers.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'conecta-publish-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const png = (w, h) =>
  Uint8Array.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...be32(13),
    0x49,
    0x48,
    0x44,
    0x52,
    ...be32(w),
    ...be32(h),
    8,
    2,
    0,
    0,
    0,
  ]);
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

/* ------------------------------------------------------------------ */

describe('validação do pipeline (validate:publish)', () => {
  const srcDir = join(tmp, 'src');
  mkdirSync(join(srcDir, 'assets', 'img'), { recursive: true });
  // Fotografias publicadas (referenciadas pelo conteúdo padrão) + casos de teste.
  cpSync(join(ROOT, 'src', 'assets', 'img'), join(srcDir, 'assets', 'img'), { recursive: true });
  writeFileSync(join(srcDir, 'assets', 'img', 'hero-ok.png'), png(1000, 1600));
  writeFileSync(join(srcDir, 'assets', 'img', 'hero-pequena.png'), png(400, 300));
  writeFileSync(
    join(srcDir, 'assets', 'img', 'logo-inseguro.svg'),
    '<svg viewBox="0 0 300 80"><script>alert(1)</script></svg>',
  );

  const run = (mutate) => {
    const content = loadDefaultContent();
    mutate?.(content);
    return validatePublish({ contentText: typeof content === 'string' ? content : json(content), srcDir });
  };

  test('aprova o conteúdo atual', async () => {
    const result = await validatePublish({ contentText: readFileSync(join(ROOT, 'content', 'content.json'), 'utf8') });
    assert.deepEqual(result.errors, []);
  });

  test('aprova edição legítima com imagem nova válida', async () => {
    const result = await run((c) => {
      c.hero.title = 'Novo título do destaque';
      c.hero.image = { src: 'assets/img/hero-ok.png', alt: 'Painel elétrico industrial', focus: 'top' };
      c.services.items['sistemas-scada'].title = 'Supervisório SCADA';
    });
    assert.deepEqual(result.errors, []);
  });

  for (const [name, mutate, expected] of [
    ['propriedade desconhecida', (c) => (c.hero.script = '<script>'), /hero\.script: propriedade desconhecida/],
    [
      'serviço a mais',
      (c) => (c.services.items.novo = { title: 'Novo' }),
      /services\.items\.novo: propriedade desconhecida/,
    ],
    [
      'serviço removido',
      (c) => delete c.services.items['redes-industriais'],
      /redes-industriais: campo obrigatório ausente/,
    ],
    ['seção nova', (c) => (c.depoimentos = { title: 'x' }), /depoimentos: propriedade desconhecida/],
    [
      'URL de imagem externa',
      (c) => (c.hero.image.src = 'https://exemplo.com/a.png'),
      /hero\.image\.src: deve ser null ou um caminho/,
    ],
    ['imagem inexistente', (c) => (c.hero.image.src = 'assets/img/nao-existe.png'), /arquivo não encontrado/],
    ['imagem pequena demais', (c) => (c.hero.image.src = 'assets/img/hero-pequena.png'), /mínimo 600×1200/],
    ['SVG com script', (c) => (c.brand.logo.src = 'assets/img/logo-inseguro.svg'), /SVG inseguro/],
    ['texto acima do limite', (c) => (c.area.title = 'x'.repeat(41)), /area\.title: máximo de 40/],
    ['cor sem contraste', (c) => (c.theme.colors.text = '#DDDDDD'), /contraste insuficiente/],
    [
      'serviço descaracterizado',
      (c) => (c.services.items['rebobinagem-motores'].title = 'Consultoria'),
      /mudou de significado/,
    ],
    ['afirmação não confirmada', (c) => (c.about.text = 'Há 30 anos no mercado.'), /exige confirmação/],
    ['dado pessoal', (c) => (c.contact.text = 'Escreva para fulano@exemplo.com'), /e-mail/],
    ['versão antiga do schema', (c) => (c.schemaVersion = 0), /schemaVersion/],
  ]) {
    test(`recusa: ${name}`, async () => {
      const result = await run(mutate);
      assert.equal(result.ok, false);
      assert.match(result.errors.join('\n'), expected);
    });
  }

  test('recusa JSON malformado', async () => {
    const result = await validatePublish({ contentText: '{"schemaVersion": 1,', srcDir });
    assert.equal(result.ok, false);
    assert.match(result.errors[0], /JSON inválido/);
  });

  test('CLI sai com código 1 e explica o motivo', () => {
    const bad = loadDefaultContent();
    bad.services.items.extra = { title: 'Serviço inventado' };
    const file = join(tmp, 'ruim.json');
    writeFileSync(file, json(bad));
    let status = 0;
    let output = '';
    try {
      execFileSync(process.execPath, [join(ROOT, 'scripts', 'validate-publish.mjs'), '--content', file], {
        encoding: 'utf8',
        env: { ...process.env, GITHUB_STEP_SUMMARY: '' },
      });
    } catch (error) {
      status = error.status;
      output = error.stdout;
    }
    assert.equal(status, 1);
    assert.match(output, /Conteúdo recusado[\s\S]*services\.items\.extra/);
  });
});

/* ------------------------------------------------------------------ */

describe('escopo de PR de conteúdo (função)', () => {
  const refs = new Set(['assets/img/hero-image-20261028-143005.webp']);
  const scope = (changes) => checkContentScope(changes, refs);

  test('permite content.json e imagem referenciada', () => {
    assert.deepEqual(
      scope([
        { status: 'M', path: 'content/content.json', mode: '100644' },
        { status: 'A', path: 'src/assets/img/hero-image-20261028-143005.webp', mode: '100644' },
      ]),
      [],
    );
  });

  for (const [name, change, expected] of [
    ['código JS', { status: 'M', path: 'src/js/main.js', mode: '100644' }, /fora do escopo/],
    ['template', { status: 'M', path: 'src/pages/index.html', mode: '100644' }, /fora do escopo/],
    ['workflow', { status: 'M', path: '.github/workflows/pages.yml', mode: '100644' }, /fora do escopo/],
    ['schema', { status: 'M', path: 'src/lib/schema.js', mode: '100644' }, /fora do escopo/],
    ['package.json', { status: 'M', path: 'package.json', mode: '100644' }, /fora do escopo/],
    [
      'exclusão de imagem',
      { status: 'D', path: 'src/assets/img/hero-image-20261028-143005.webp', mode: '000000' },
      /"D" não permitida/,
    ],
    ['content.json apagado', { status: 'D', path: 'content/content.json', mode: '000000' }, /"D" não permitida/],
    ['imagem não referenciada', { status: 'A', path: 'src/assets/img/outra.png', mode: '100644' }, /não referenciada/],
    [
      'nome de imagem inválido',
      { status: 'A', path: 'src/assets/img/Foto Nova.PNG', mode: '100644' },
      /fora do escopo/,
    ],
    ['subpasta de imagem', { status: 'A', path: 'src/assets/img/x/a.png', mode: '100644' }, /fora do escopo/],
    [
      'link simbólico',
      { status: 'A', path: 'src/assets/img/hero-image-20261028-143005.webp', mode: '120000' },
      /links simbólicos/,
    ],
    ['mudança de tipo', { status: 'T', path: 'content/content.json', mode: '120000' }, /links simbólicos|"T"/],
  ]) {
    test(`recusa: ${name}`, () => assert.match(scope([change]).join('\n'), expected));
  }
});

/* ------------------------------------------------------------------ */

describe('simulação com git: branches de conteúdo', () => {
  let hasGit = true;
  try {
    execFileSync('git', ['--version'], { stdio: 'ignore' });
  } catch {
    hasGit = false;
  }

  const repo = join(tmp, 'repo');
  const git = (...args) =>
    execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const write = (path, data) => {
    mkdirSync(join(repo, path, '..'), { recursive: true });
    writeFileSync(join(repo, path), data);
  };
  const scopeOf = async (branch) => {
    git('checkout', '-q', branch);
    return checkContentScope(
      gitChanges('main', branch, repo),
      await referencedImagesIn(join(repo, 'content', 'content.json')),
    );
  };

  if (hasGit) {
    mkdirSync(repo, { recursive: true });
    git('init', '-q', '-b', 'main');
    git('config', 'user.email', 'teste@example.invalid');
    git('config', 'user.name', 'Teste');
    git('config', 'core.autocrlf', 'false');
    cpSync(join(ROOT, 'content'), join(repo, 'content'), { recursive: true });
    write('src/js/main.js', 'console.log(1);\n');
    write('src/assets/img/.gitkeep', '');
    git('add', '-A');
    git('commit', '-q', '-m', 'base');

    const branch = (name, changes) => {
      git('checkout', '-q', 'main');
      git('checkout', '-q', '-b', name);
      changes();
      git('add', '-A');
      git('commit', '-q', '-m', name);
    };

    branch('conteudo/legitimo', () => {
      const c = loadDefaultContent();
      c.hero.title = 'Título revisado';
      c.hero.image = { src: 'assets/img/hero-image-20261028-143005.png', alt: 'Painel' };
      write('content/content.json', json(c));
      write('src/assets/img/hero-image-20261028-143005.png', png(1600, 1200));
    });
    branch('conteudo/com-codigo', () => {
      const c = loadDefaultContent();
      c.hero.title = 'Título revisado';
      write('content/content.json', json(c));
      write('src/js/main.js', 'fetch("https://exemplo.com/roubar");\n');
    });
    branch('conteudo/apaga-imagem', () => {
      git('rm', '-q', 'src/assets/img/.gitkeep');
    });
    branch('conteudo/imagem-solta', () => {
      write('src/assets/img/nao-usada.png', png(1600, 1200));
    });
  }

  test('branch de conteúdo legítima passa no escopo', { skip: !hasGit && 'git indisponível' }, async () => {
    assert.deepEqual(await scopeOf('conteudo/legitimo'), []);
  });

  test('branch de conteúdo que altera código é barrada', { skip: !hasGit && 'git indisponível' }, async () => {
    assert.match((await scopeOf('conteudo/com-codigo')).join('\n'), /src\/js\/main\.js: fora do escopo/);
  });

  test('branch de conteúdo que apaga arquivos é barrada', { skip: !hasGit && 'git indisponível' }, async () => {
    assert.match((await scopeOf('conteudo/apaga-imagem')).join('\n'), /"D" não permitida/);
  });

  test('imagem enviada sem uso no conteúdo é barrada', { skip: !hasGit && 'git indisponível' }, async () => {
    assert.match((await scopeOf('conteudo/imagem-solta')).join('\n'), /não referenciada/);
  });
});

/* ------------------------------------------------------------------ */

describe('configuração versionada da publicação', () => {
  const read = (path) => readFileSync(join(ROOT, path), 'utf8');
  const validate = read('.github/workflows/validate.yml');
  const pages = read('.github/workflows/pages.yml');
  const ruleset = JSON.parse(read('.github/rulesets/proteger-main.json'));

  test('nenhum workflow usa pull_request_target, segredos ou tokens de escrita do repositório', () => {
    for (const wf of [validate, pages]) {
      assert.doesNotMatch(wf, /pull_request_target|secrets\.|contents:\s*write|GITHUB_TOKEN|workflow_run/);
    }
  });

  test('validação de PR: só leitura, sem credenciais persistidas, roda as barreiras', () => {
    assert.match(validate, /on:\s*\n\s*pull_request:\s*\n\s*branches: \[main\]/);
    assert.match(validate, /^permissions:\s*\n\s*contents: read\s*$/m);
    assert.match(validate, /persist-credentials: false/);
    assert.match(validate, /check-content-scope\.mjs/);
    assert.match(validate, /if: startsWith\(github\.head_ref, 'conteudo\/'\)/);
    assert.match(validate, /npm run validate:publish/);
    assert.match(validate, /npm test/);
    // Expressões do GitHub não são interpoladas em comandos (evita injeção).
    for (const line of validate.split('\n').filter((l) => /^\s*(?:- )?run:/.test(l))) {
      assert.doesNotMatch(line, /\$\{\{/, line.trim());
    }
  });

  test('publicação: só da main, permissões mínimas por job, revalida antes do build', () => {
    assert.match(pages, /on:\s*\n\s*push:\s*\n\s*branches: \[main\]/);
    assert.doesNotMatch(pages, /pull_request/);
    assert.match(pages, /^permissions: \{\}$/m);
    assert.equal((pages.match(/if: github\.ref == 'refs\/heads\/main'/g) ?? []).length, 2);
    const build = pages.slice(pages.indexOf('  build:'), pages.indexOf('  deploy:'));
    const deploy = pages.slice(pages.indexOf('  deploy:'));
    assert.match(build, /permissions:\s*\n\s*contents: read\s*\n/);
    assert.doesNotMatch(build, /pages: write|id-token: write/);
    assert.match(deploy, /permissions:\s*\n\s*pages: write\s*\n\s*id-token: write/);
    assert.match(deploy, /environment:\s*\n\s*name: github-pages/);
    assert.ok(build.indexOf('validate:publish') < build.indexOf('npm run build'), 'valida antes de gerar o site');
  });

  test('ruleset: main só muda por PR com o check "validar" verde, sem exceções', () => {
    assert.equal(ruleset.enforcement, 'active');
    assert.deepEqual(ruleset.conditions.ref_name.include, ['~DEFAULT_BRANCH']);
    assert.deepEqual(ruleset.bypass_actors, []);
    const types = ruleset.rules.map((r) => r.type);
    for (const type of ['deletion', 'non_fast_forward', 'pull_request', 'required_status_checks']) {
      assert.ok(types.includes(type), type);
    }
    const checks = ruleset.rules.find((r) => r.type === 'required_status_checks').parameters;
    assert.equal(checks.strict_required_status_checks_policy, true);
    assert.deepEqual(checks.required_status_checks, [{ context: 'validar' }]);
    // O nome do check deve ser o nome do job do workflow de validação.
    assert.match(validate, /^\s{2}validar:\s*\n\s{4}name: validar$/m);
  });

  test('painel: links de envio só existem com repositório configurado e válido', () => {
    assert.equal(githubUploadUrl('content', { owner: null, name: null, branch: 'main' }), null, 'sem repositório');
    assert.equal(githubUploadUrl('content'), 'https://github.com/Tha-github/conectasolucoes/upload/main/content');
    const repo = { owner: 'empresa', name: 'site', branch: 'main' };
    assert.equal(githubUploadUrl('content', repo), 'https://github.com/empresa/site/upload/main/content');
    assert.equal(githubUploadUrl('src/assets/img', repo), 'https://github.com/empresa/site/upload/main/src/assets/img');
    assert.equal(githubUploadUrl('src/js', repo), null);
    assert.equal(githubUploadUrl('content', { ...repo, owner: 'x/../y' }), null);
    assert.equal(githubUploadUrl('content', { ...repo, name: 'javascript:alert(1)' }), null);
  });
});

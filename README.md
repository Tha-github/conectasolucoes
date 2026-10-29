# Conecta Soluções — site institucional

Site estático da Conecta Soluções (Engenharia, Automação e Sistemas Industriais), publicado no GitHub Pages.
HTML, CSS e JavaScript puros, com um build em Node sem dependências de runtime.

| Documento                                            | Para quem e para quê                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------- |
| [`docs/manual-admin.md`](docs/manual-admin.md)       | Cliente: alterar textos, imagens e cores no painel (`/admin/`) e publicar |
| [`docs/publicacao.md`](docs/publicacao.md)           | Responsável técnico: configuração do GitHub, fluxo de publicação, domínio |
| [`docs/auditoria-final.md`](docs/auditoria-final.md) | Situação de entrega: o que foi verificado, pendências e riscos            |
| [`docs/CONTENT_SCHEMA.md`](docs/CONTENT_SCHEMA.md)   | Inventário dos 85 campos editáveis (gerado do schema)                     |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)     | Sistema visual: cores, tipografia, grid, componentes, movimento           |
| [`docs/PROJECT_AUDIT.md`](docs/PROJECT_AUDIT.md)     | Histórico técnico e decisões de cada etapa                                |
| [`CLAUDE.md`](CLAUDE.md)                             | Regras permanentes do projeto                                             |

## Requisitos

- Node.js 22 ou superior (CI usa a versão de `.nvmrc`, 24)
- npm (o `package-lock.json` garante instalação reproduzível)

## Comandos

| Comando                                              | O que faz                                                                                       |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm ci`                                             | Instala exatamente as versões do `package-lock.json`                                            |
| `npm run dev`                                        | Build + servidor local com recompilação ao salvar (recarregue o navegador)                      |
| `npm run serve`                                      | Build + servidor local, sem observação de arquivos                                              |
| `npm run build`                                      | Valida o conteúdo e gera `dist/`                                                                |
| `npm test`                                           | Testes (`node --test`)                                                                          |
| `npm run lint`                                       | ESLint + verificação do Prettier                                                                |
| `npm run format`                                     | Formata os arquivos com Prettier                                                                |
| `npm run validate:content`                           | Valida `content/content.json` (ou outro arquivo: `npm run validate:content -- x.json`)          |
| `npm run content:import -- arquivo.json [--dry-run]` | Valida um JSON exportado pelo painel, lista os campos alterados e grava `content/content.json`  |
| `npm run docs:schema`                                | Regenera o inventário de campos em `docs/CONTENT_SCHEMA.md` (`-- --check` só verifica)          |
| `npm run validate:publish [-- --base origin/main]`   | Validação do pipeline: schema, arquivos de imagem e política editorial (lista campos alterados) |
| `npm run check`                                      | Lint, testes e build em sequência                                                               |

O servidor local responde em `http://localhost:4173/preview/`. Ele reproduz um site de projeto do GitHub Pages
(servido em subdiretório), inclusive a página 404. Para mudar: `PORT` e `BASE_PATH` (ex.: `BASE_PATH=/meu-repo`).

## Estrutura

```
content/content.json   Conteúdo editável (textos, imagens, cores) — validado pelo schema
src/
  pages/               Páginas (templates) → viram dist/<nome>.html
  partials/            Componentes HTML reutilizáveis ({{> nome}})
  css/                 tokens.css, fonts.css, base.css, layout.css, components.css, sections.css → css/site.css no build
  js/                  Scripts do site público (melhoria progressiva)
  lib/                 Módulos puros compartilhados: schema, validação, templates, cor
  assets/img/          Imagens aprovadas (logo, fotos)
scripts/               build, servidor local, validação, importação e verificação de escopo do PR
tests/                 Testes automatizados
docs/                  Documentação do projeto
```

O painel administrativo é `src/pages/admin/index.html` → `/admin/` (página real, sem roteamento no navegador). Ele
reutiliza `src/lib/` e não altera o schema: edita apenas valores de textos, imagens e cores.

### Conteúdo × estrutura

- `src/lib/schema.js` define **quais** chaves existem, os tipos, os limites e a ordem (inclusive os 21 serviços).
  Somente o código altera o schema.
- `content/content.json` fornece **os valores** dessas chaves. Chaves desconhecidas, ausentes ou fora dos limites
  interrompem o build.
- Os templates usam marcações que sempre são escapadas: `{{content.brand.name}}`, `{{build.root}}`,
  `{{image content.brand.logo width=200 height=56 class=brand__logo}}` e `{{> header}}`. Não há como inserir HTML a
  partir do conteúdo.
- As cores de `theme.colors` viram `css/theme.css` (`--color-*`). O build verifica o contraste mínimo AA dos pares de
  texto/fundo.

### Imagens

1. Coloque o arquivo em `src/assets/img/`, com nome em minúsculas e hífens (`.webp`, `.jpg`, `.png` ou `.svg`).
2. Referencie-o no `content.json` como `"assets/img/nome.webp"`.

Se o arquivo não existir, o build falha. Se `src` for `null`, a página mostra o texto alternativo no lugar da imagem.
Se a imagem falhar ao carregar no navegador, `js/media-fallback.js` faz a mesma substituição. O logotipo está como
`null` até o arquivo oficial ser recebido, e o cabeçalho mostra o nome da marca em texto.

## Publicação no GitHub Pages

Toda mudança entra na `main` **por Pull Request** e é publicada pelo GitHub Actions. O fluxo completo, a configuração
de proteção e o passo a passo do administrador estão em [`docs/publicacao.md`](docs/publicacao.md).

- [`.github/workflows/validate.yml`](.github/workflows/validate.yml) roda em cada PR para a `main`, apenas com
  permissão de leitura. Executa o escopo do PR de conteúdo (`conteudo/*`), `validate:publish`, lint, testes e build.
  É o status check obrigatório `validar`.
- [`.github/workflows/pages.yml`](.github/workflows/pages.yml) roda em push na `main`, com permissões mínimas por job.
  Revalida tudo e publica **somente** `dist/` no ambiente `github-pages`.
- [`.github/rulesets/proteger-main.json`](.github/rulesets/proteger-main.json) define a `main`: só aceita PR com
  `validar` verde, sem push direto, force-push nem exclusão, e sem exceções.

Configuração única no GitHub: [`docs/publicacao.md`](docs/publicacao.md) §3, que cobre Pages via Actions, o ruleset,
o ambiente e as permissões do Actions.

O **base path** é obtido automaticamente (`actions/configure-pages`). Ele vale `/nome-do-repo` em sites de projeto e
vazio com domínio próprio ou em `usuario.github.io`. Todos os caminhos das páginas são relativos. O base path só é
usado na página 404, que o GitHub Pages serve em qualquer URL inexistente.

A **URL pública** (`SITE_URL`) também vem de `actions/configure-pages` (`base_url`). Com ela, o build gera
`canonical`, `og:url` e `sitemap.xml`. Sem ela (build local), esses itens são omitidos com aviso; `robots.txt` e os
dados estruturados (JSON-LD da organização: nome, descrição, telefone e região) são gerados sempre.

Para simular localmente o build de produção de um repositório específico:

```sh
BASE_PATH=/nome-do-repo npm run build    # bash
$env:BASE_PATH="/nome-do-repo"; npm run build   # PowerShell
```

No Git Bash para Windows, adicione `MSYS_NO_PATHCONV=1`. Sem isso, o shell converte `/nome-do-repo` em um caminho do
Windows, e o build recusa o valor.

### Limitações da hospedagem

- Não é possível definir cabeçalhos HTTP. A CSP é aplicada por `<meta>`, que não suporta `frame-ancestors`, e
  `X-Frame-Options` não pode ser definido. HSTS e `nosniff` dependem do próprio GitHub Pages.
- `robots.txt` e `sitemap.xml` só são lidos na raiz do domínio. Num site de projeto
  (`usuario.github.io/repo`), o buscador procura `usuario.github.io/robots.txt`, que não é deste repositório; o
  sitemap pode ser enviado manualmente no Google Search Console. Com domínio próprio, funcionam normalmente.
- O CDN do GitHub Pages faz cache de cerca de 10 minutos, então uma publicação pode demorar alguns minutos para
  aparecer.
- Não há backend. Conteúdo editado no painel só chega ao site público depois de ser integrado ao repositório (Pull
  Request) e publicado de novo. Rascunho e exportação não publicam nada.
- Domínio personalizado: ainda não informado. Configuração em [`docs/publicacao.md`](docs/publicacao.md) §6.

# Auditoria do projeto — Conecta Soluções

Etapa 1 · 27/10/2026 · Nenhuma interface foi criada ou alterada nesta etapa.
Atualizado na etapa 2 (fundação técnica): ver §7. As seções 1 a 6 descrevem o estado encontrado na etapa 1.

## 1. Estado atual e stack

### Arquivos analisados

| Caminho                 | Conteúdo                                                           |
| ----------------------- | ------------------------------------------------------------------ |
| `CLAUDE.md`             | Regras permanentes do projeto (já existia; mantido sem alterações) |
| `.claude/settings.json` | Permissões locais do Claude Code; não afeta o site                 |

Não existe nenhum outro arquivo. Constatações:

- Não há `package.json`, dependências, scripts, rotas, configuração de build nem workflow de publicação.
- A pasta **não** é um repositório git, e não há remoto do GitHub configurado.
- **O logotipo e as imagens do cliente não estão no repositório.** Foram mencionados como enviados, mas nenhum arquivo foi encontrado.
- O diretório adicional da sessão (`Desktop/laerte`) é de outro cliente (Reforma Macol). Ele **não** será usado como fonte de conteúdo nem de assets.
- O formulário Google e a página do Behance **não** foram acessados nesta etapa. Nenhuma resposta do formulário foi lida.

### Ferramentas disponíveis na máquina

Node v24.19.0 · npm 11.17.0 · git 2.55.0.

### Comandos de validação disponíveis hoje

**Nenhum.** Não há scripts de build, lint ou teste. Eles serão criados na etapa 2 (ver §5).
_Atualização da etapa 2: os comandos já existem (ver §7.4)._

### Stack proposta (não há stack existente a preservar)

Para seguir "simples, estável, poucas dependências":

- HTML, CSS e JavaScript puros (ES modules), sem framework.
- Build próprio em Node, sem dependências: um script injeta o `content.json` validado no HTML. O resultado é uma página pública estática, completa sem JavaScript, sem flash de conteúdo e indexável.
- Testes com `node --test` (nativo do Node 24), sem dependências.
- Dependências de desenvolvimento, apenas se aprovadas: `eslint` e `html-validate` para lint, e `@playwright/test` para testes de navegador e de responsividade.
- Publicação via GitHub Actions (`actions/upload-pages-artifact` + `actions/deploy-pages`), enviando somente a pasta `dist/`. Assim, docs, testes e scripts não ficam públicos.

## 2. Riscos

### GitHub Pages e caminhos

| Risco                                                                                       | Mitigação                                                                                                         |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Um site de projeto é servido em `/<repo>/`, então caminhos absolutos (`/css/...`) quebram   | Usar somente caminhos relativos e testar automaticamente que não existem `href`/`src` iniciados por `/`           |
| Não há rewrite de rotas (SPA); um 404 em rota profunda                                      | Usar páginas reais (`index.html`, `admin/index.html`) e nenhum roteamento no cliente                              |
| O servidor diferencia maiúsculas/minúsculas, ao contrário do Windows                        | Nomes de arquivo em minúsculas e kebab-case, com um teste que verifica se cada referência existe com o nome exato |
| O Jekyll ignora arquivos ou pastas que começam com `_`                                      | Publicar via Actions (sem Jekyll) e incluir `.nojekyll` por garantia                                              |
| Não é possível definir cabeçalhos HTTP (CSP completa, `X-Frame-Options`, `frame-ancestors`) | Usar CSP por `<meta>` (sem suporte a `frame-ancestors`) e `referrer` por `<meta>`, e documentar a limitação       |
| Cache de cerca de 10 min no CDN, sem controle                                               | Avisar que a publicação pode levar alguns minutos para aparecer                                                   |
| Domínio próprio e HTTPS ainda não definidos                                                 | Ver §4                                                                                                            |

### Armazenamento (`localStorage`)

- Vale apenas para aquele navegador e aquela origem. Não sincroniza com nada, e o rascunho não é publicação.
- **Todos os sites de projeto em `<usuario>.github.io` compartilham a mesma origem.** Outros repositórios do mesmo usuário podem ler e gravar as mesmas chaves. Mitigação: usar um prefixo próprio e versionado (`conecta:draft:v1`) e revalidar tudo o que for lido como entrada não confiável.
- A cota é de cerca de 5 MB, e imagens em base64 consomem 33% a mais. Por isso o tamanho das imagens será limitado (ver §3) e erros de cota serão tratados com uma mensagem clara.
- O navegador pode apagar os dados. Com navegação privada ou cookies bloqueados, `localStorage` pode lançar exceção, então todo acesso ficará em `try/catch`.

### Painel administrativo

- **O painel será público.** Qualquer pessoa com a URL consegue abri-lo. Uma senha em JavaScript não protege nada, e por isso **não** será implementada uma "senha" ilusória.
- O risco real é baixo, porque o painel só altera o rascunho no navegador de quem o usa e não publica nada. Mesmo assim, ele receberá `noindex` e `Disallow` no `robots.txt`, o que impede indexação, não acesso.
- Um JSON importado pode ser malicioso. Mitigações: schema estrito, chaves fixas, rejeição de propriedades desconhecidas, limites de tamanho, cores somente em `#RRGGBB`, imagens somente de caminhos ou MIME aprovados e renderização exclusivamente por `textContent`/`setAttribute`, nunca `innerHTML`.
- A página pública **nunca** lê o `localStorage`. A prévia acontece dentro do painel.
- Qualquer escrita direta no repositório a partir do navegador (token do GitHub) está vetada pelo `CLAUDE.md`. Uma publicação automática exigiria backend ou serviço externo e uma decisão explícita do cliente.

## 3. Arquitetura proposta

```
/
├─ CLAUDE.md
├─ README.md                  # como rodar, testar, publicar
├─ package.json               # scripts: build, test, lint, validate, serve
├─ .github/workflows/pages.yml
├─ content/
│  └─ content.json            # conteúdo publicado (fonte da verdade editável)
├─ src/                       # tudo o que vira site
│  ├─ index.html              # estrutura fixa com data-content="chave"
│  ├─ admin/index.html        # painel
│  ├─ css/                    # tokens.css, base.css, sections.css, admin.css
│  ├─ js/
│  │  ├─ schema.js            # definição das chaves, tipos e limites (compartilhado)
│  │  ├─ validate.js          # validação pura, sem DOM
│  │  ├─ render.js            # aplica o conteúdo ao DOM (prévia)
│  │  ├─ storage.js           # rascunho local com try/catch
│  │  └─ admin.js             # formulário, prévia, import/export
│  └─ assets/img/             # logo e fotos aprovadas
├─ scripts/
│  ├─ build.mjs               # valida content.json → gera dist/
│  └─ apply-export.mjs        # integra um JSON exportado (valida, extrai imagens)
├─ tests/                     # node --test (+ Playwright, se aprovado)
├─ docs/
│  ├─ PROJECT_AUDIT.md
│  ├─ CONTENT_WORKFLOW.md     # procedimento real de edição → publicação
│  └─ OPEN_QUESTIONS.md       # lacunas pendentes do cliente
└─ dist/                      # gerado, fora do git
```

### Estratégia de conteúdo

- **Fica no código, e não muda pelo painel:** seções, sua ordem, os 21 serviços e seus IDs, links, destinos (`wa.me/5591980958661`) e layout.
- **Fica no `content.json`, editável:** só valores de chaves que já existem.
  - Textos: `string`, com `maxLength` por chave, sem HTML e com quebras de linha controladas.
  - Imagens: `{ src, alt }`.
  - Cores: tokens nomeados (`primary`, `accent`, `surface`, `text`...) em `#RRGGBB`, com verificação de contraste mínimo AA entre os pares texto/fundo definidos.
- Os serviços ficam como um objeto indexado por ID fixo (`automacao-industrial`, ..., `rebobinagem-motores`), e não como um array. Assim, quantidade e ordem não podem ser alteradas pelo JSON. A ordem é definida no `schema.js`.
- O JSON terá `schemaVersion`. Uma versão diferente é rejeitada com mensagem clara.
- **Imagens no painel** (suposição conservadora, a confirmar):
  1. Escolher entre as imagens já existentes no catálogo do projeto; ou
  2. Enviar um arquivo novo para prévia, somente JPEG, PNG ou WebP, com até cerca de 800 KB e dimensões limitadas. Ele é exportado em base64 dentro do JSON e o `apply-export.mjs` o grava em `src/assets/img/`.

  SVG enviado pelo painel será recusado, por risco de script embutido.

### Fluxo de publicação (estático)

1. O cliente edita no painel e usa a prévia. O rascunho fica salvo só no navegador dele.
2. Ele exporta o arquivo `.json` e envia ao responsável técnico.
3. O responsável roda `npm run apply-export -- arquivo.json`, que valida e grava `content/content.json` e as imagens.
4. Em seguida, roda `npm test && npm run build`, revisa o diff, faz commit e push, e o Actions publica.

Esse procedimento será documentado em `docs/CONTENT_WORKFLOW.md`.

### Testes previstos

- **Unidade:** schema e validação (chaves desconhecidas, tipos, limites, cores, protocolos `javascript:`/`data:` indevidos, caminhos com `..`, MIME e tamanho de imagem, `schemaVersion`), além de round-trip de exportação → importação.
- **Integridade:** `content.json` padrão válido; exatamente 21 serviços na ordem do `CLAUDE.md`; nenhum `href="#"`; nenhum caminho absoluto; todas as referências de arquivo existem; nenhum `innerHTML` no código-fonte; link do WhatsApp correto.
- **Navegador (se aprovado):** renderização em 360, 768 e 1440 px sem rolagem horizontal; navegação por teclado; `prefers-reduced-motion`; painel com fluxo de edição → prévia → exportação → importação, incluindo rejeição de arquivo inválido.

## 4. Informações ausentes (não serão inventadas)

| Item                                                                  | Uso                                 | Default até confirmar                                                                              |
| --------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Arquivo do logotipo** (de preferência SVG ou PNG em alta resolução) | Identidade, cabeçalho, favicon      | **Bloqueia a etapa 4** (design). Até lá, usar só o nome da marca em texto                          |
| Fotos do cliente, com direito de uso                                  | Hero e seções                       | Fotos de banco com licença livre e crédito registrado, sujeitas a aprovação                        |
| Cores oficiais da marca                                               | Tokens                              | Extraídas do logo quando ele for recebido                                                          |
| Texto "Sobre" e descrições dos serviços                               | Conteúdo                            | Descrições curtas e neutras do que é cada serviço, sem promessas, marcadas para revisão do cliente |
| Estados e cidades atendidos dentro da Região Norte                    | Seção de atendimento                | Apenas "Região Norte do Brasil"                                                                    |
| E-mail comercial público                                              | Contato                             | Omitido; somente WhatsApp                                                                          |
| Endereço, CNPJ, horário, redes sociais                                | Rodapé e SEO                        | Omitidos                                                                                           |
| Respostas do formulário Google                                        | Briefing                            | Tratadas como indisponíveis                                                                        |
| Nome do repositório/usuário GitHub e domínio próprio                  | URL canônica, Open Graph, base path | Caminhos relativos; canonical e OG URL preenchidos depois                                          |
| Mensagem pré-preenchida do WhatsApp                                   | Link `wa.me`                        | "Olá, gostaria de solicitar um orçamento." (neutra)                                                |
| Política de privacidade/LGPD                                          | Rodapé                              | Não necessária enquanto não houver formulário, cookies nem analytics; reavaliar se isso mudar      |

Não há bloqueio para concluir esta auditoria. O único bloqueio real à frente é o **logotipo**, necessário a partir da etapa 4.

## 5. Plano de trabalho (etapas 2 a 10)

| #   | Etapa                                                                                                                                                                | Critérios objetivos de conclusão                                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2   | **Fundação**: `git init` (com autorização), `package.json`, estrutura de pastas, `README.md`, `.gitignore`, workflow do Pages, scripts `build`/`test`/`lint`/`serve` | `npm test` e `npm run build` executam sem erro; `dist/` é gerado; o workflow é válido; nenhuma dependência de runtime                                                             |
| 3   | **Schema e conteúdo**: `schema.js`, `validate.js` e `content.json` padrão com os 21 serviços                                                                         | Testes de validação cobrindo todos os casos do §3 passam; o JSON padrão é válido; nenhum dado inventado                                                                           |
| 4   | **Design system**: tokens de cor, tipografia e espaçamento a partir do logo; direção editorial inspirada no Merlot e adaptada ao contexto industrial                 | Logo recebido; tokens em `tokens.css`; contraste AA verificado por teste; referência visual documentada sem copiar assets                                                         |
| 5   | **Página pública**: Hero, Serviços (21), Área de atendimento, Contato (WhatsApp) e Rodapé                                                                            | HTML semântico com `lang="pt-BR"`; todos os botões com destino real; layout validado em 360, 768 e 1440 px; funciona sem JavaScript                                               |
| 6   | **Build, SEO e performance**: injeção do conteúdo, metas, Open Graph, `robots.txt`, favicon, imagens otimizadas (WebP, `width`/`height`, `loading="lazy"`)           | Lighthouse ≥ 90 em Performance, Acessibilidade, Boas práticas e SEO (mobile); CLS < 0,1; sem caminhos absolutos                                                                   |
| 7   | **Painel: textos e cores**: formulário gerado pelo schema, prévia, rascunho local, exportação e importação                                                           | Nenhum controle de criar, remover ou reordenar; import inválido é rejeitado com mensagem acessível; testes de round-trip passam; avisos claros de "rascunho local, não publicado" |
| 8   | **Painel: imagens** e `apply-export.mjs`                                                                                                                             | Somente formatos e tamanhos permitidos; SVG recusado; o script integra o export e o build passa; procedimento documentado                                                         |
| 9   | **Endurecimento**: CSP por meta, revisão de segurança, acessibilidade (teclado, foco, leitores de tela), `prefers-reduced-motion`, testes de navegador               | Nenhum `innerHTML` e nenhum `href="#"`; teste de teclado completo; checklist do `CLAUDE.md` §8–9 atendido; limitações documentadas                                                |
| 10  | **Entrega**: `CONTENT_WORKFLOW.md`, `OPEN_QUESTIONS.md` atualizado, revisão final do diff e deploy **somente com autorização**                                       | Definição de pronto do `CLAUDE.md` §11 atendida; todos os comandos executados e resultados reportados                                                                             |

## 6. Suposições registradas

- Como não existe código, adoto a stack mínima do §1. Se o cliente ou o responsável preferir um framework, a decisão deve vir antes da etapa 2.
- O painel será publicado em `/admin/`, publicamente acessível e sem senha ilusória.
- A publicação do conteúdo editado depende de uma pessoa técnica (commit e push). Não haverá publicação automática.
- Os textos de serviço que eu redigir serão neutros e ficarão marcados para validação do cliente.
- Nenhum analytics, pixel ou fonte externa de terceiros. As fontes serão auto-hospedadas.

## 7. Etapa 2 — Fundação técnica (27/10/2026)

### 7.1 Decisões

| Tema              | Decisão                                                                                                                                                                  | Motivo                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack             | HTML, CSS e JavaScript puros, com build em Node próprio (`scripts/build.mjs`)                                                                                            | Não havia stack a preservar; é a solução estática mais simples e sem dependências de runtime                                                                                                    |
| Templates         | Marcações `{{...}}` (`src/lib/template.js`) com escape obrigatório; parciais em `src/partials/` como componentes                                                         | Não há como inserir HTML vindo do conteúdo; a página é completa sem JavaScript, o que ajuda SEO e evita CLS                                                                                     |
| Conteúdo          | `content/content.json`, validado por schema declarativo (`src/lib/schema.js`) com tipos via JSDoc                                                                        | Chaves fixas, sem chaves extras, limites de tamanho, cores `#RRGGBB`, imagens só em `assets/img/`, contraste AA. Serviços em objeto indexado por ID, então a ordem e a quantidade vêm do código |
| Tipagem           | JSDoc + validação em tempo de execução, sem TypeScript                                                                                                                   | O schema é o tipo de fato; evita compilador e dependência pesada                                                                                                                                |
| Base path         | Caminhos sempre relativos (`{{build.root}}` = `./`); `BASE_PATH` só no `<base>` da 404; no CI vem de `actions/configure-pages`                                           | Funciona em `/nome-do-repo/`, em domínio próprio e em `usuario.github.io` sem reconfigurar                                                                                                      |
| Publicação        | GitHub Actions publica somente `dist/` (`.github/workflows/pages.yml`)                                                                                                   | Docs, testes e scripts não ficam públicos; lint e testes bloqueiam o deploy                                                                                                                     |
| Fonte             | IBM Plex Sans (OFL 1.1) via `@fontsource/ibm-plex-sans`, copiada pelo build para `assets/fonts/` (pesos 400/500/600, latino) com a licença                               | Auto-hospedada, sem terceiros; escolha **provisória**, a revisar com a identidade visual na etapa 4                                                                                             |
| Cores             | Paleta neutra industrial **provisória** em `theme.colors`; o build gera `css/theme.css`                                                                                  | O logotipo não foi recebido; as cores oficiais virão dele                                                                                                                                       |
| Logotipo          | `brand.logo.src = null`; o cabeçalho mostra o nome da marca em texto                                                                                                     | Não substituir a marca por uma inventada                                                                                                                                                        |
| Imagens ausentes  | Build falha se o arquivo referenciado não existir; `src: null` mostra fallback com o texto alternativo; `js/media-fallback.js` substitui imagens que falham no navegador | Atende ao requisito de imagens ausentes sem quebrar o layout                                                                                                                                    |
| Erros             | Conteúdo inválido interrompe o build listando os campos (o `dist/` anterior é mantido); `404.html` para URLs inexistentes; o servidor local reproduz a 404               | Falha cedo e com mensagem clara                                                                                                                                                                 |
| Segurança         | CSP por `<meta>` (somente `'self'`), sem scripts ou handlers inline; ESLint proíbe `innerHTML`/`eval`; testes procuram tokens e serviços externos                        | `CLAUDE.md` §8                                                                                                                                                                                  |
| Lint e formatação | ESLint 10 (`@eslint/js`, `globals`) e Prettier 3, apenas como dependências de desenvolvimento                                                                            | Ferramentas padrão e leves; os templates ficam fora do Prettier para não quebrar `{{...}}`                                                                                                      |
| Testes            | `node --test`, sem dependências; um DOM falso mínimo no lugar de jsdom                                                                                                   | Testes de navegador (Playwright) ficam para a etapa 9, se aprovados                                                                                                                             |

Fora do escopo desta etapa, e portanto não implementado: seções de negócio, botão do WhatsApp, painel administrativo,
rascunho local e importação/exportação. A página inicial mostra apenas nome, área e região, como base para validar o build.

### 7.2 Arquivos criados

```
package.json, package-lock.json, .nvmrc, .gitignore, .gitattributes, .editorconfig
.prettierrc.json, .prettierignore, eslint.config.js
.github/workflows/pages.yml
README.md
content/content.json
src/pages/index.html, src/pages/404.html
src/partials/head.html, header.html, footer.html
src/css/tokens.css, fonts.css, base.css
src/js/main.js, media-fallback.js
src/lib/schema.js, validate.js, template.js, color.js
src/assets/img/.gitkeep
scripts/build.mjs, serve.mjs, validate-content.mjs
tests/helpers.mjs, content.test.mjs, validate.test.mjs, template.test.mjs, build.test.mjs, source-safety.test.mjs
```

Nenhum arquivo existente foi apagado. `CLAUDE.md` não foi alterado. Esta auditoria recebeu as seções 7 e as notas de atualização.

### 7.3 Dependências

| Pacote                                                   | Tipo                 | Uso                                  |
| -------------------------------------------------------- | -------------------- | ------------------------------------ |
| `@fontsource/ibm-plex-sans` 5.3.0                        | dependência de build | Arquivos `.woff2` e licença da fonte |
| `eslint` 10.13.0, `@eslint/js` 10.0.1, `globals` 17.13.0 | desenvolvimento      | Lint                                 |
| `prettier` 3.9.10                                        | desenvolvimento      | Formatação                           |

As versões estão fixas e o `package-lock.json` está versionado. `npm audit`: 0 vulnerabilidades no momento da instalação.

### 7.4 Comandos de validação

`npm run lint`, `npm test`, `npm run build`, `npm run validate:content`, `npm run check` (todos) e `npm run dev`/`serve`
para conferência manual em `http://localhost:4173/preview/`. Os detalhes estão no `README.md`.

### 7.5 Pendências e limitações

- A pasta ainda **não é um repositório git**. O `git init`, o remoto no GitHub e a ativação de _Pages → Source: GitHub
  Actions_ dependem de autorização e do nome do repositório.
- As versões das actions (`checkout@v4`, `setup-node@v4`, `configure-pages@v5`, `upload-pages-artifact@v3`,
  `deploy-pages@v4`) não foram executadas no GitHub. Validar no primeiro deploy autorizado.
- Logo, fotos e cores oficiais continuam pendentes (§4).
- Ainda faltam teste de layout em navegador e Lighthouse (etapas 6 e 9).
- Os textos da página 404 estão no código e não são editáveis. Se o cliente quiser editá-los, eles podem entrar no schema
  em etapa futura.

## 8. Sistema visual (27/10/2026)

As decisões completas estão em [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md). Resumo do que mudou em relação à §7:

- **Referência Behance:** o acesso automatizado foi recusado (HTTP 403). Nada da página foi visto nem copiado, e a
  direção segue o briefing.
- **Schema (código):** `theme.colors` passou de 10 para 14 papéis (`surfaceAlt`, `borderStrong`, `onDarkMuted`,
  `accentOnDark`). `CONTRAST_PAIRS` agora tem mínimo por par: 4,5:1 para texto e 3:1 para bordas de componentes e foco.
  Paleta provisória atualizada no `content.json`.
- **Fontes:** a `@fontsource/ibm-plex-sans`, estática, foi removida e substituída por:
  - `@fontsource-variable/ibm-plex-sans` 5.3.0;
  - `@fontsource-variable/archivo` 5.3.0, para títulos;
  - `@fontsource/ibm-plex-mono` 5.3.0, para rótulos.

  São todas OFL 1.1 e auto-hospedadas, com total de 147 KB.

- **CSS:** foram criados `layout.css` e `components.css`; `tokens.css`, `fonts.css` e `base.css` foram reescritos.
  `build.mjs` copia as três fontes e suas licenças.
- **Páginas:** em `index.html` e `404.html` mudaram só classes e o agrupamento do conteúdo já existente. O índice ganhou
  `.section`, rótulo e display, e a 404 ganhou rótulo fixo "Erro 404" e o link em estilo de botão. O rodapé passou a
  usar `theme-dark`.
  **Não foram criadas seções, itens de navegação, formulários nem funcionalidades.**
- **Testes:** foi criado `tests/design-system.test.mjs`, que verifica:
  - variáveis CSS indefinidas;
  - contraste das cores de estado;
  - foco visível;
  - `prefers-reduced-motion`;
  - hover só em `@media (hover: hover)`;
  - ausência de gradientes e de recursos externos;
  - `font-display`;
  - grid 4/8/12.

  `validate.test.mjs` cobre o novo limite de 3:1.

- **Verificação visual:** capturas com Edge headless em 1440, 768 e 375 px (esta última via iframe, porque a janela
  headless tem largura mínima de 492 px). Uma vitrine temporária dos componentes foi gerada só em `dist/` e descartada.
  Não houve overflow horizontal.

## 9. Landing page pública (27/10/2026)

### 9.1 Estrutura implementada (inventário aprovado)

A ordem está fixa em `src/pages/index.html` e é verificada por `tests/landing-page.test.mjs` contra `PAGE_SECTIONS`, em
`src/lib/schema.js`.

| #   | Seção                 | Âncora       | Conteúdo                                                                                     |
| --- | --------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| 1   | Cabeçalho e navegação | —            | Marca, 5 links para as seções, CTA do WhatsApp, menu recolhível no mobile                    |
| 2   | Hero                  | `#inicio`    | Rótulo, título (`h1`), texto de apoio, CTA do WhatsApp, imagem                               |
| 3   | Empresa               | `#sobre`     | Rótulo, título, texto de apresentação, imagem                                                |
| 4   | Serviços              | `#servicos`  | Os 21 serviços do briefing na ordem do cliente, incluindo a rebobinagem de motores elétricos |
| 5   | Abordagem             | `#abordagem` | 4 itens genéricos, derivados apenas da lista de serviços                                     |
| 6   | Área de atuação       | `#atuacao`   | "Região Norte do Brasil" e orientação para confirmar a localidade pelo WhatsApp              |
| 7   | Contato               | `#contato`   | Texto, CTA do WhatsApp e número exibido                                                      |
| 8   | Rodapé                | —            | Marca, área, região, link do WhatsApp, copyright                                             |

**Não foram criados:** depoimentos, logos de clientes, cases, blog, FAQ, mapa, formulário, carrossel nem qualquer outra
seção. Os testes bloqueiam `<form>`, `<iframe>` e esses termos na página.

### 9.2 Decisões

- **Schema (código):** novas chaves fixas para `nav`, `hero`, `about`, `services` (os títulos passaram para
  `services.items`), `approach` (4 IDs fixos em `APPROACH_IDS`), `area` e `contact`. Todos os textos visíveis são
  editáveis; a estrutura, a ordem e a quantidade não são.
- **WhatsApp:** em `src/lib/site.js`, fixo no código e não editável pelo painel, porque é destino de link (CLAUDE.md §4).
  - Link: `https://wa.me/5591980958661?text=Ol%C3%A1!%20Gostaria%20de%20falar%20com%20a%20Conecta%20Solu%C3%A7%C3%B5es%20sobre%20um%20servi%C3%A7o.`
  - Mensagem: "Olá! Gostaria de falar com a Conecta Soluções sobre um serviço.", codificada com `encodeURIComponent`.
  - Os links abrem em nova aba com `rel="noopener noreferrer"` e aviso "(abre em nova aba)" para leitores de tela.
  - Há 5 ocorrências: cabeçalho, hero, botão e número no contato, e rodapé.
- **Menu mobile:** padrão _disclosure_ acessível (ver `DESIGN_SYSTEM.md` §6), com degradação sem JavaScript.
- **Meta:** `title`, `description` e Open Graph básico (`og:title`, `og:description`, `og:locale`, `og:site_name`).
  `og:url`, `og:image` e `canonical` dependem do domínio e da imagem definitivos.
- **Build:** emite aviso com as imagens pendentes (`src: null`).

### 9.3 Placeholders e conteúdo pendente

| Item                                | Situação atual                                                                                                    | O que falta                                             |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Logotipo (`brand.logo`)             | Nome "Conecta Soluções" em texto                                                                                  | Arquivo oficial (SVG ou PNG em alta resolução)          |
| Imagem do hero (`hero.image`)       | Bloco com o texto alternativo "Painel elétrico de automação industrial com controladores e cabeamento organizado" | Foto real ou licenciada; ajustar o alt à foto escolhida |
| Imagem da empresa (`about.image`)   | Bloco com o texto alternativo "Profissional realizando manutenção em motor elétrico industrial"                   | Foto real ou licenciada; ajustar o alt                  |
| Favicon                             | Não existe (o navegador recebe 404 em `/favicon.ico`)                                                             | Derivar do logotipo oficial                             |
| `og:image`, `og:url`, `canonical`   | Omitidos                                                                                                          | Domínio/repositório e imagem de compartilhamento        |
| Textos da Abordagem, Empresa e Hero | Redigidos a partir do briefing, sem números, certificações nem garantias                                          | **Validação do cliente**                                |
| Cores da marca                      | Paleta provisória                                                                                                 | Revisar com o logotipo                                  |

Nenhuma foto de banco foi baixada ou inserida, para não usar ativos sem licença verificada nem sugerir projetos reais.

### 9.4 Verificação

- `npm run check`: lint, 102 testes e build passaram.
- O novo `tests/landing-page.test.mjs` cobre:
  - ordem das seções;
  - um único `h1`;
  - navegação;
  - os 21 serviços em ordem;
  - a abordagem;
  - URL do WhatsApp;
  - `rel` dos links em nova aba;
  - ausência de emoji;
  - botão do menu;
  - imagens e fallbacks;
  - varredura do conteúdo contra anos, percentuais, certificações, garantias, preços, e-mail, endereço e CNPJ.
- **Navegador** (Edge headless via DevTools Protocol, script temporário fora do projeto):
  - sem overflow horizontal em 375, 768 e 1440 px;
  - as 3 fontes carregadas;
  - menu mobile operado por teclado: Tab chega ao botão; Enter abre e o foco vai ao primeiro link, com anel de 3 px;
    Escape fecha e devolve o foco;
  - escolher um link fecha o menu e posiciona a seção abaixo do cabeçalho fixo;
  - sem JavaScript, o botão fica oculto e os links visíveis;
  - console sem erros de CSP ou de script; o único 404 é o `favicon.ico`.
- **Não testado:** leitores de tela reais (NVDA, VoiceOver), Safari/iOS, Firefox e Lighthouse.

## 10. Camada de conteúdo editável (28/10/2026)

O inventário completo e as regras estão em [`CONTENT_SCHEMA.md`](CONTENT_SCHEMA.md). Esse arquivo é gerado e
verificado contra o schema.

- **Inventário:** 85 campos editáveis, sendo 68 textos, 3 imagens e 14 cores. Seis textos que estavam fixos nos
  templates passaram para o conteúdo: o skip link, o aviso "(abre em nova aba)" e os 4 textos da página 404.
- **Fixos no código:**
  - estrutura;
  - IDs, ordem e quantidade de serviços (21) e de itens da abordagem (4);
  - destinos de link;
  - número, URL e mensagem do WhatsApp;
  - `©`, ano, `:` e `|`.

  Um teste renderiza a página com marcadores e prova que todo o resto vem do conteúdo.

- **Schema v1 congelado:**
  - rótulo e limite por campo, revisados conforme o layout (por exemplo, o título da área de atuação ficou com 40
    caracteres, porque é exibido em escala display);
  - restrições por imagem: formatos, KB e dimensões mínimas e máximas;
  - `fieldAt()`/`validateField()` para o contador e a validação do painel.
- **Novos módulos** em `src/lib/`:
  - `migrate.js`: migração explícita; versão futura é recusada;
  - `defaults.js`: recuperação campo a campo, só para rascunho;
  - `image-meta.js`: dimensões de PNG, JPEG e WebP pelos bytes e segurança de SVG;
  - `storage.js`: rascunho local;
  - `transfer.js`: exportação e importação estritas.
- **Build:** verifica os arquivos de imagem (grafia exata, formato real × extensão, KB, dimensões) e publica
  `content/content.json` validado (padrão do painel). `content/content.json` foi normalizado para o formato da
  exportação; o conteúdo continua idêntico.
- **Scripts:** `content:import` (com `--dry-run` e lista de campos alterados) e `docs:schema`.
- **Publicação:** continua manual, por commit e push. O rascunho local e a exportação **não publicam**. Publicação
  automática exigiria serviço externo autorizado; não há token no front-end.
- **Testes:** 167 no total, dos quais 65 novos em `tests/content-layer.test.mjs`.
- **Ainda não implementado:**
  - a interface do painel (contador visível, formulários, upload de imagem), prevista para a etapa 7;
  - o upload de imagem pelo navegador, que exigirá decidir se `data:` será aceito no rascunho, com limites; hoje,
    `data:` é sempre recusado.

## 11. Painel administrativo (28/10/2026)

O guia de uso e as limitações estão em [`manual-admin.md`](manual-admin.md).

- **Rota:** `/admin/`, gerada de `src/pages/admin/index.html`. O build agora renderiza páginas em subpastas, com
  caminhos `../`.
- **Funções:**
  - edição dos 85 campos do schema, com contador e limite;
  - substituição de imagem validada por MIME, bytes reais, KB e dimensões, e guardada no IndexedDB deste navegador;
  - cores com seletor, código hexadecimal e verificação de contraste;
  - prévia;
  - rascunho no `localStorage`;
  - restaurar padrão por campo e geral;
  - exportar e importar JSON validado;
  - confirmação com opção "Exportar antes";
  - aviso ao sair com alterações não salvas.
- **Status exibidos:** "Rascunho salvo neste navegador", "Arquivo exportado", "Alterações ainda não publicadas",
  "Alterações não salvas neste navegador" e "Igual ao conteúdo publicado".
- **Prévia fiel:** o build publica `admin/preview-templates.json` (o template da página inicial e os parciais). O
  painel renderiza com o **mesmo** `renderTemplate` em um `iframe srcdoc` com `sandbox` sem scripts. As cores do
  rascunho entram por um stylesheet `blob:` gerado com `themeCss`, que foi movido para `src/lib/theme.js`. Um teste
  prova que a prévia com o conteúdo publicado é idêntica a `index.html`, exceto pela CSP ampliada para `blob:` e pela
  remoção do script.
- **Segurança:**
  - nenhuma senha simulada, token ou chamada externa;
  - CSP `'self'`, com `blob:` só para imagens e estilos;
  - `noindex`;
  - avisos permanentes: "não publica" e "página pública, sem senha".
- **Novos arquivos:**
  - `src/pages/admin/index.html`;
  - `src/js/admin/{main,form,dialog,image-store}.js`;
  - `src/lib/{admin-model,preview,theme}.js`;
  - `src/css/admin.css`;
  - `tests/admin.test.mjs`;
  - `docs/manual-admin.md`.
- **Correções feitas durante os testes:**
  - a prévia não refletia as cores editadas;
  - `[hidden]` era anulado por componentes com `display` próprio, o que exibia um ícone de erro vazio sob todos os
    campos; criada uma regra global em `base.css`;
  - legendas longas sobrepunham a moldura do grupo;
  - a barra fixa ocupava a tela do celular;
  - os KB passaram a ser contados em base 1000 em todas as mensagens.
- **Testes:**
  - 188 testes unitários, 21 deles novos em `admin.test.mjs`;
  - 52 verificações ponta a ponta no Edge headless, por script temporário fora do repositório: edição e escape na
    prévia, erro de campo vazio e foco no campo inválido, salvar, recarregar, exportar (arquivo baixado e
    revalidado), importação inválida e não-JSON, importação válida com confirmação e Escape, imagem recusada e aceita
    (blob carregado na prévia e mantido após recarregar), contraste, cores na prévia, restaurar, `beforeunload`,
    teclado (skip link e anel de foco de 3 px), ausência de rolagem horizontal em 375, 768 e 1280 px, e console
    limpo (exceto o 404 conhecido de `favicon.ico`).
- **Não testado:** leitores de tela reais, Firefox e Safari/iOS.

## 12. Fluxo de publicação seguro (29/10/2026)

O detalhamento está em [`publicacao.md`](publicacao.md).

- **Análise:**
  - o OAuth do GitHub (fluxo web e device flow) exige servidor para a troca do código por token, por causa do
    `client_secret` e da falta de CORS;
  - o token de instalação de GitHub App exige chave privada em servidor;
  - token colado no navegador é vetado pelo `CLAUDE.md` §7.

  **Nenhum atalho foi implementado.** A identidade e a autorização ficam no github.com, por Pull Request.

- **Barreiras:**
  - ruleset versionado `.github/rulesets/proteger-main.json`: PR obrigatório, check `validar`, sem push direto,
    force-push ou exclusão, histórico linear e `bypass_actors` vazio;
  - `validate.yml`, só com leitura, para PRs: escopo de `conteudo/*`, `validate:publish`, lint, testes e build;
  - `pages.yml` com `permissions: {}` e permissões por job, deploy só da `main`, revalidação antes do build e ambiente
    `github-pages` com aprovação opcional.
- **Novos arquivos:**
  - `src/lib/policy.js`: política editorial, que inclui a regra de o serviço manter seu termo central;
  - `scripts/validate-publish.mjs`;
  - `scripts/check-content-scope.mjs`;
  - `.github/workflows/validate.yml`;
  - `.github/rulesets/proteger-main.json`;
  - `tests/publishing.test.mjs`;
  - `docs/publicacao.md`.
- **Alterações:**
  - `pages.yml`;
  - cores de estado validadas contra os fundos editáveis (`STATUS_COLORS`);
  - inventário do schema sem a coluna de valores atuais;
  - painel: download "content.json" e links de envio do GitHub quando `REPOSITORY` for configurado em `site.js`;
  - documentos `manual-admin`, `CONTENT_SCHEMA` e README.
- **Testes desacoplados do conteúdo atual:** os nomes exatos dos serviços, o logotipo nulo e a lista fixa de imagens
  pendentes impediriam edições legítimas no pipeline. Agora a regra é a política, não o valor atual.
- **Verificação:**
  - `npm run check`: 239 testes;
  - `npm run validate:publish` aprova o conteúdo atual;
  - E2E do painel: 52/52.
  - A simulação com git real confirma que branches `conteudo/*` com código, exclusões ou imagens soltas são
    barradas.
- **Pendente (exige repositório e autorização):** aplicar o ruleset e as configurações no GitHub e executar o
  checklist de `publicacao.md` §5. Os workflows ainda não rodaram no GitHub.

## 13. Editores de imagem e cor do painel (29/10/2026)

O que já existia: validação de MIME, bytes, KB e dimensões; prévia; seletor de cor com código hexadecimal; aviso de
contraste no grupo; e estrutura fixa.

O que foi acrescentado:

- **Schema v2 com migração explícita v1 → v2** (`MIGRATIONS[1]`, testada com o arquivo v1 real em
  `tests/fixtures/content-v1.json`). As imagens ganharam `focus` (enquadramento): uma lista fechada que vira classe
  CSS `.media__img--focus-*`, sem estilo inline. Só os espaços com `focal` (destaque e empresa) aceitam valores além
  de `center`. Os campos de imagem ganharam `frames` (molduras reais) e `target` (caixa de otimização).
  `content/content.json` foi migrado pelo próprio código.
- **AVIF:** leitura de dimensões pela caixa `ispe`, recusando HEIC e MP4. Adicionado ao padrão de caminhos, ao
  servidor local e ao manifesto.
- **Envio pelo painel só em raster** (JPEG, PNG, WebP, AVIF). SVG, executáveis e outros tipos são recusados,
  inclusive no logotipo. SVG só entra pelo repositório, verificado no CI.
- **`src/js/admin/image-editor.js`**, nesta sequência:
  - arquivo de até 15 MB e até 8000 px por lado, verificados antes de decodificar;
  - tipo real pelos bytes;
  - **decodificação real** com `createImageBitmap`, que pega arquivo corrompido;
  - conferência das dimensões com o cabeçalho, aceitando a rotação EXIF;
  - redução proporcional até `target`, sem distorção;
  - reencodificação em WebP, que remove metadados como EXIF e GPS;
  - escolha entre original e otimizada (`chooseOutput`).

  Em seguida abre o **diálogo de confirmação**: prévia nas molduras reais, enquadramento, texto alternativo
  obrigatório e **Aplicar** ou **Cancelar**/Escape. Nada é gravado antes de Aplicar. O enquadramento continua
  editável depois, no formulário.

- **Cores:**
  - só valores válidos chegam ao rascunho (aceita `#RGB`, sem `#` e minúsculas);
  - um valor inválido mostra erro no campo e mantém a cor anterior;
  - Escape ou sair do campo descarta o valor digitado;
  - o aviso de contraste aparece **nas duas cores do par**, além do grupo;
  - a prévia muda em tempo real, inclusive pelo seletor visual.
- **Testes:** 250 unitários, incluindo os novos de upload, otimização, cores, AVIF, `focus` e migração v1. O E2E no
  navegador soma 77 verificações; as 25 novas são:
  - recusa de imagem pequena demais;
  - recusa de PNG corrompido;
  - recusa de dimensões gigantes;
  - recusa de PNG disfarçado de WebP;
  - recusa de executável renomeado;
  - recusa de arquivo de 16 MB;
  - recusa de SVG no logo;
  - otimização de 3000×2500 para 2400×2000 em WebP;
  - molduras 4:5 e 3:2;
  - cancelamento sem efeito;
  - texto alternativo obrigatório;
  - prévia sem distorção e com enquadramento;
  - persistência após aplicar;
  - código hexadecimal inválido, Escape e sair do campo;
  - atalho `#RGB`;
  - contraste nas duas cores do par;
  - seletor visual em tempo real;
  - mapeamento `--color-text`;
  - restaurar cor.
- **Ajustes visuais após as capturas:** no celular, o diálogo abria rolado até o botão (agora abre no título); a
  legenda do enquadramento cortava a moldura.
- **Limitações:**
  - em navegadores sem codificador WebP no canvas, a imagem só é aceita se já couber no espaço sem redução;
  - AVIF depende do navegador conseguir decodificá-lo; se não conseguir, o painel explica;
  - o CI valida o cabeçalho e as dimensões, mas não decodifica a imagem inteira (não há decodificador sem
    dependências).

## 14. Revisão visual e auditoria técnica (29/10/2026)

Nenhuma seção, item, link, botão, campo ou funcionalidade foi criado ou removido. Nos templates, só duas mudanças:

- o `<head>` carrega `css/site.css`;
- o hero ganhou `fetchpriority=high`.

### 14.1 Método

- **Navegador:** Edge headless via DevTools Protocol, com scripts temporários fora do repositório.
  - Site e painel medidos em 320, 375, 390, 430, 768, 1024, 1440 e 1920 px; a 404, em 320 e 1440 px.
  - Itens verificados: rolagem horizontal, elementos fora da tela, texto cortado, sobreposição, alvos de toque menores
    que 44 px e altura do cabeçalho.
  - Capturas de página inteira, revisadas visualmente.
- **Lighthouse 12.8.2:** executado com o Chrome local, em mobile e desktop, a partir de uma instalação temporária fora
  do projeto. Nada foi adicionado ao `package.json`.
- **Comportamento:** 15 verificações no navegador:
  - movimento com e sem `reduce`;
  - menu móvel (Escape e retorno do foco);
  - JSON-LD;
  - Trusted Types;
  - painel em 320 px: faixa de áreas, prévia escapando HTML, rótulos e alvos de 44 px.

### 14.2 Problemas encontrados e corrigidos

| #   | Onde            | Problema                                                                                  | Correção                                                                                    |
| --- | --------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | Site, 320 px    | Cabeçalho quebrava em 2 linhas (89 px), e a seção ancorada ficava 1 px sob ele            | Abaixo de 384 px, espaço menor entre marca e menu e botão mais estreito (73 px)             |
| 2   | Site, celular   | CTAs estreitos e soltos à esquerda                                                        | Abaixo de 480 px, CTAs do hero, do contato e da 404 ocupam a largura da coluna              |
| 3   | Site, ≥ 1024 px | Empresa: a imagem ficava no topo e sobrava espaço abaixo dela, ao lado do texto mais alto | Imagem e texto centrados na vertical                                                        |
| 4   | Painel          | Chips com 36 px e botão "Restaurar" com 32 px                                             | 44 px (no "Restaurar", uma margem negativa mantém o espaçamento)                            |
| 5   | Painel, celular | As 13 áreas ocupavam cerca de 250 px antes do primeiro campo                              | Faixa única com rolagem horizontal interna (sem rolar a página); o foco mostra o chip       |
| 6   | Painel, celular | Ações em linhas irregulares; títulos e rótulos longos com entrelinha 1,6                  | Ações em grade 2 × 2; entrelinha 1,25; menos recuo interno abaixo de 480 px                 |
| 7   | Desempenho      | 7 folhas de estilo bloqueando a renderização                                              | O build gera `css/site.css` (6 folhas, sem comentários); com `theme.css`, são 2 requisições |
| 8   | SEO             | Sem canonical, `og:url`, sitemap, `robots.txt` e dados estruturados                       | Ver §14.3                                                                                   |
| 9   | Segurança       | Actions referenciadas por tag móvel (`@v4`)                                               | Fixadas por SHA de commit, com teste                                                        |
| 10  | Segurança       | Sem defesa adicional contra injeção de HTML no navegador                                  | CSP pública com `require-trusted-types-for 'script'; trusted-types 'none'`                  |

**Mantido de propósito:**

- As proporções das molduras (3:2 e 4:5). O schema as espelha no editor de imagem do painel; mudar só o CSS faria a
  prévia do enquadramento mentir.
- O alinhamento à esquerda no celular. O container já é centralizado, e texto longo centralizado se lê pior.

As animações (entrada do hero, abertura do menu e surgimento ao rolar) estão descritas em `DESIGN_SYSTEM.md` §5.

### 14.3 SEO

- `title` (63 caracteres) e `description` (114) vêm do conteúdo validado. A página tem um único `h1`, um `h2` por
  seção e `h3` na abordagem (já testado).
- `SITE_URL` (`src/lib/seo.js`) só aceita `http(s)` sem credenciais, consulta ou fragmento. No CI, vem de
  `configure-pages` (`base_url`). Com ela, a página inicial recebe `canonical` e `og:url`, e o build gera
  `sitemap.xml`.
- `robots.txt` libera tudo. O painel **não** aparece nele: tem `noindex`, que o buscador precisa rastrear para ler, e
  listá-lo só divulgaria o endereço.
- O JSON-LD `Organization` traz apenas nome, descrição, telefone (`+5591980958661`) e região atendida (fato
  confirmado, em `site.js`). Não traz endereço, logotipo, avaliações nem horário.
  - O JSON escapa `< > &` e U+2028/2029, para que nenhum texto encerre o `<script>`.
  - O bloco não é executado, e a CSP não o bloqueia (confirmado no console).
- **Não feito:**
  - `og:image`: não há imagem aprovada.
  - Favicon: depende do logotipo, e criar um seria redesenhar a marca. O 404 de `favicon.ico` é o único erro de
    console restante.

### 14.4 Performance

| Lighthouse (local, sem gzip) | Desempenho | Acessibilidade | Boas práticas | SEO | LCP   | CLS |
| ---------------------------- | ---------- | -------------- | ------------- | --- | ----- | --- |
| Mobile, antes                | 98         | 100            | 96            | 100 | 2,3 s | 0   |
| Mobile, depois               | 99         | 100            | 96            | 100 | 2,1 s | 0   |
| Desktop, antes e depois      | 100        | 100            | 96            | 100 | 0,5 s | 0   |

- **Boas práticas em 96:** a única causa é o 404 do favicon.
- **Avisos restantes:**
  - "compressão" e "bloqueio de renderização" vêm do servidor local, que não usa gzip; o GitHub Pages comprime;
  - os cerca de 10 KB de "CSS não usado" são regras de formulário compartilhadas com o painel.
- **Imagens:** ainda não existem, então o LCP medido é um texto. Já está pronto:
  - `width`/`height` e `aspect-ratio` na moldura (CLS 0);
  - `lazy` fora da primeira dobra;
  - `eager` + `fetchpriority="high"` no hero;
  - otimização em WebP pelo painel.

  Não há `srcset`: o fluxo gera um arquivo por imagem. Com as fotos reais, avaliar 2 larguras no build.

- **Fontes:** 3 WOFF2 auto-hospedados (147 KB), com `font-display: swap` e preload das 2 usadas na primeira dobra.
- **JavaScript:** 3 módulos pequenos, sem dependências.

### 14.5 Segurança

| Verificação                     | Resultado                                                                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm audit`                     | 0 vulnerabilidades; nenhuma dependência de runtime (as fontes são apenas arquivos copiados)                                                    |
| XSS e injeção de conteúdo       | Template sempre escapa; sem `innerHTML`/`eval` (lint e teste); prévia em iframe `sandbox` sem scripts; `<b>` aparece literal na prévia         |
| Campos editáveis                | Schema estrito: chaves fixas; propriedades desconhecidas e `__proto__` recusadas; limites; `#RRGGBB`; imagens só em `assets/img/`              |
| Protocolos perigosos            | Nenhum campo editável é URL; `javascript:` e `data:` recusados em `src`; `SITE_URL` só `http(s)`; links fixos no código                        |
| Mudanças estruturais            | Serviço, seção ou propriedade nova são recusados no painel, na importação, no build e no CI                                                    |
| Tokens e segredos               | Nenhum padrão encontrado em código, conteúdo ou `dist/` (teste); sem `secrets.` nos workflows                                                  |
| Source maps e arquivos expostos | Não há `.map`; `dist/` sem docs, testes, `package.json` ou `.github` (teste). `lib/` e `content.json` são públicos de propósito                |
| CSP                             | Por `<meta>`: `'self'`, sem `unsafe-*`, `object-src 'none'`, `form-action 'none'`; Trusted Types na página pública                             |
| GitHub Actions                  | `{}` ou `contents: read` no topo; escrita só no deploy (`pages`, `id-token`); `pull_request`, não `_target`; `persist-credentials: false`; SHA |
| `/admin`                        | Sem senha, token ou login simulado (teste); avisa que é público e que não publica                                                              |

### 14.6 Riscos residuais e limitações

- **O site não é invulnerável.**
  - A CSP por `<meta>` não suporta `frame-ancestors`, então o site pode ser embutido por terceiros. O risco é baixo,
    porque não há ações autenticadas.
  - Não há controle de HSTS, `nosniff` nem `Permissions-Policy`; esses cabeçalhos dependem do GitHub Pages.
- **Trusted Types só na página pública.**
  - O painel usa `iframe.srcdoc`, que exigiria uma política própria. A proteção dele continua sendo o escape e o
    `sandbox`.
  - Firefox e Safari ignoram Trusted Types.
- **Painel público.** Qualquer pessoa pode abri-lo, mas ele só altera o navegador de quem o usa. A autorização real
  está no GitHub (PR e ruleset).
- **Actions fixadas por SHA** não recebem correções sozinhas. Atualize periodicamente (`publicacao.md` §5).
- **`robots.txt` e sitemap** só valem na raiz do domínio (ver README, "Limitações").
- **Animações de rolagem** só aparecem em navegadores com `animation-timeline` (Chromium); nos demais, o conteúdo
  surge sem animação.
- **Não testado:**
  - Safari/iOS e Firefox reais;
  - leitores de tela reais;
  - Lighthouse no Pages publicado (ainda não há repositório);
  - fotografias reais, que ainda não existem.

### 14.7 Verificação executada

- `npm run check`: lint (ESLint e Prettier), **278 testes** (28 novos em `tests/audit.test.mjs`) e build — tudo
  passou.
- `npm run validate:publish`: sem problemas.
- `npm run docs:schema -- --check`: inventário em dia.
- `npm audit`: 0 vulnerabilidades.
- Navegador: 18 combinações de página × largura sem problemas e 15/15 verificações de comportamento.

## 15. Revisão final de entrega (29/10/2026)

Resultado, evidências, pendências e riscos em [`auditoria-final.md`](auditoria-final.md). Os guias foram renomeados
para os nomes de entrega: `ADMIN_GUIDE.md` → [`manual-admin.md`](manual-admin.md) (reescrito para o cliente) e
`PUBLISHING.md` → [`publicacao.md`](publicacao.md) (com a seção de base path, domínio e 404). Menções a esses arquivos
nas seções anteriores foram atualizadas para os nomes novos.

## 16. Redesign editorial e primeira publicação (29/10/2026)

Pedido: redesign completo no padrão de landing page arquitetônica premium (referência Merlot Residence, descrita em
texto pelo cliente), painel com a mesma identidade, revisão de SEO/segurança/performance e envio ao repositório
`Tha-github/conectasolucoes` com deploy pelo GitHub Actions.

**Decisões**

- **Stack preservada.** A especificação mencionava React/Vite, mas o projeto é HTML/CSS/JS sem framework, com build
  próprio e 280 testes. Migrar não traria benefício e contrariaria "não recriar sem necessidade". "Vite base path" e
  "roteamento" já são resolvidos pelo base path automático e pelo painel como página real em `/admin/`.
- **Sistema visual v2** (detalhes em `DESIGN_SYSTEM.md`): Cormorant Garamond + Manrope (102 KB, antes 147 KB);
  paleta off-white, bege, grafite e verde oliva da especificação. O cinza oliva `#77786F` não atinge 4,5:1 como texto,
  então ficou restrito a bordas e o texto secundário usa `#5C5E55`.
- **Mesmas seções, mesma ordem, mesmas chaves.** Mudou só a marcação de layout: o hero saiu do `.container` (sangria
  da fotografia) e Serviços ganhou o wrapper `.services__grid`. Schema sem mudança de versão: só rótulos e molduras
  (`frames`) da prévia, e o rótulo do token `accent` ("cobre" deixou de fazer sentido).
- **Painel:** menu lateral com contador de campos alterados por área (número + texto para leitor de tela) e filete
  nos campos alterados (`form.markChanged`). Escopo intacto: nenhum controle novo cria, remove ou reordena itens.
- **SEO:** Twitter Card (`summary`, ou `summary_large_image` quando houver fotografia), `og:image` absoluto só com
  fotografia raster publicada e URL conhecida, `theme-color`.
- **Fotografias:** não incluídas. Não havia fotos do cliente; Unsplash (proteção anti-robô) e Openverse
  (inacessível) não puderam ser consultados para fotos com licença verificável. O fallback virou uma "prancha" em tom de
  papel com moldura fina e o texto alternativo, e o layout foi verificado com imagem sintética não publicada.

**Verificação:** 283 testes, lint, `validate:publish`, `docs:schema --check`, `npm audit` (0); 8 larguras sem
overflow horizontal (site e painel); edição real no painel (contadores, HTML escapado na prévia, contraste recusado);
Lighthouse no build de produção servido localmente: celular 98/100/96/100, desktop 100/100/96/100, CLS 0.

# Auditoria final — Conecta Soluções

Revisão de entrega · 29/10/2026 · Escopo: site público, painel `/admin/`, build, testes, GitHub Actions e documentação.

## Situação em uma frase

**Tecnicamente completo e verificado localmente, mas não pronto para a entrega final ao cliente.** Faltam o
logotipo e as fotografias do cliente, a validação dos textos redigidos e a criação do repositório no GitHub (o
deploy e as proteções nunca rodaram de verdade). Detalhes em [§4](#4-pendências-que-impedem-a-entrega-final).

## 1. Fontes usadas na revisão

- `CLAUDE.md` (regras e informações confirmadas, §3) e o histórico de decisões em `PROJECT_AUDIT.md`.
- **`docs/requisitos.md` não existe no projeto.** O briefing usado é o `CLAUDE.md` §3; nada foi suposto além dele.
- O formulário Google e a referência do Behance **não foram lidos**: o formulário não foi fornecido, e o Behance
  recusou o acesso automatizado (HTTP 403). A direção visual segue a descrição do briefing ("premium, editorial,
  técnico"), não a página de referência.

## 2. Verificação item a item

Legenda: **OK** = verificado nesta revisão · **Parcial** = verificado com ressalva · **Pendente** = depende de algo
externo.

| #   | Item                                      | Situação                            | Evidência                                                                                                                                                                                                                                |
| --- | ----------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Fidelidade ao briefing                    | OK                                  | 21 serviços na ordem do `CLAUDE.md`, incluindo a rebobinagem de motores (teste); WhatsApp `5591980958661`; Região Norte; área "Engenharia, Automação e Sistemas Industriais"                                                             |
| 2   | Qualidade visual premium                  | **Parcial**                         | Sistema editorial aplicado e revisado em 8 larguras. **Sem logotipo e sem fotos**, os espaços de imagem mostram o texto alternativo. Comparação com o Behance impossível (403)                                                           |
| 3   | Responsividade                            | OK                                  | 320, 375, 390, 430, 768, 1024, 1440 e 1920 px: nenhuma rolagem horizontal, corte, sobreposição ou alvo de toque abaixo de 44 px (site, painel e 404). Foto de teste enquadrada sem distorção em 3:2 e 4:5                                |
| 4   | Links e botões                            | OK                                  | 28/28 no navegador: 5 links do menu (celular e desktop), 5 links do WhatsApp com `noopener noreferrer`, marca, skip link, links da 404 e todos os botões do painel. Nenhum `href="#"` (teste)                                            |
| 5   | Conteúdo real, sem invenções              | OK, com ressalva                    | Política editorial bloqueia anos, números, certificações, garantias, preços, depoimentos e dados pessoais (teste). Os textos do hero, da empresa e da abordagem foram **redigidos a partir do briefing e aguardam validação do cliente** |
| 6   | Painel limitado a textos, imagens e cores | OK                                  | 85 campos (68 textos, 3 imagens, 14 cores); número do WhatsApp, links e estrutura fixos no código. Edição de texto, cor e imagem testada no navegador                                                                                    |
| 7   | Impossível criar/excluir seções e itens   | OK                                  | Serviço novo, seção nova, serviço removido e propriedade desconhecida são recusados no painel (navegador), no `content:import`, no `validate:publish` e no escopo do PR (`conteudo/*` que altera código → recusado)                      |
| 8   | Persistência após publicação              | OK (local)                          | Ponta a ponta numa cópia do projeto: editar → salvar → recarregar → exportar → `content:import` → `validate:publish` → build → o site mostra título, cor e imagem novos, e um navegador limpo abre o painel com o conteúdo publicado     |
| 9   | Segurança do fluxo de publicação          | OK (local) / **Pendente** no GitHub | Workflows com permissões mínimas, actions fixadas por SHA, sem `pull_request_target` nem segredos, ruleset versionado (testes). **Aplicação real no GitHub ainda não feita**                                                             |
| 10  | SEO, acessibilidade e performance         | OK                                  | Lighthouse mobile 99/100/96/100 e desktop 100/100/96/100; CLS 0. Boas práticas fica em 96 só pelo favicon ausente                                                                                                                        |
| 11  | Build de produção                         | OK                                  | `npm run check` (lint + 280 testes + build); build com `BASE_PATH=/repo` e com domínio personalizado                                                                                                                                     |
| 12  | Compatibilidade com GitHub Pages          | OK (local) / **Pendente** no GitHub | Caminhos relativos, base path automático, `/admin` → `/admin/`, 404 com `<base>` em subpastas, `.nojekyll`, sem SPA. **O deploy real ainda não foi executado**                                                                           |

## 3. O que foi feito nesta revisão

### Implementado ou revisado

- **GitHub Actions** (revisados, sem mudança de comportamento nesta etapa):
  - `validate.yml` em todo PR: somente leitura; escopo do PR `conteudo/*`, `validate:publish`, lint, testes e build;
  - `pages.yml` em push na `main`: revalida, gera com `BASE_PATH` e `SITE_URL` vindos de `configure-pages` e publica
    só `dist/`.
- **Base path, painel, domínio e fallback:** documentados em `publicacao.md` §6 e cobertos por testes. O domínio
  personalizado não foi informado; com publicação por Actions, ele é configurado em _Settings → Pages_ e não exige
  arquivo `CNAME`.
- **Documentação de entrega:**
  - `README.md` revisado (índice de documentos; trechos desatualizados sobre o painel corrigidos);
  - `docs/manual-admin.md`: manual do cliente, reescrito a partir do antigo `ADMIN_GUIDE.md`;
  - `docs/publicacao.md`: antigo `PUBLISHING.md`, com a nova seção de endereços e domínio;
  - este documento.

  Os nomes antigos foram substituídos (não duplicados), e todas as referências no código, nos testes e nos
  documentos foram atualizadas.

- **Testes novos:** build com domínio personalizado sem base path (canonical, sitemap e 404 em `/`), 404 de site de
  projeto e painel como página real.

### Testado

| Tipo                       | Resultado                                                                                                                                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Testes automatizados       | **280/280** (`node --test`): schema, validação, importação/exportação, migração, painel, publicação, escopo do PR com git real, build, SEO, CSP                                                                              |
| Lint e formatação          | ESLint e Prettier sem problemas (inclui a sintaxe YAML dos workflows)                                                                                                                                                        |
| Validações de conteúdo     | `validate:content`, `validate:publish` e `docs:schema --check` aprovados                                                                                                                                                     |
| Dependências               | `npm audit`: 0 vulnerabilidades                                                                                                                                                                                              |
| Ponta a ponta (navegador)  | 19/19: edição, prévia com HTML escapado, cor, imagem (validação, otimização, enquadramento, alt), rascunho persistente, exportação de 3 arquivos, importação fora do escopo recusada, publicação simulada, painel limpo, 404 |
| PR de conteúdo (git real)  | PR legítimo aprovado (escopo e `validate:publish`); PR `conteudo/*` alterando `src/js/main.js` recusado; JSON sem um serviço recusado no import                                                                              |
| Links e botões             | 28/28                                                                                                                                                                                                                        |
| Responsividade             | 18 combinações de página × largura sem problemas                                                                                                                                                                             |
| Movimento e acessibilidade | 15/15: animações só sem `reduce`; menu por teclado com Escape; Trusted Types; todos os campos com rótulo; alvos ≥ 44 px                                                                                                      |
| Lighthouse                 | Ver item 10 acima                                                                                                                                                                                                            |

### Corrigido

- **Nesta revisão:**
  - README com trechos desatualizados ("o painel ficará…", "etapa 7");
  - documentação de publicação sem orientação para domínio personalizado e fallback;
  - lacuna de teste para o build com domínio próprio.

  Nenhum defeito de código foi encontrado nesta rodada.

- **Na rodada anterior** (detalhes em `PROJECT_AUDIT.md` §14):
  - cabeçalho quebrando em 320 px;
  - CTAs no celular;
  - alinhamento da seção Empresa;
  - alvos de toque do painel;
  - navegação do painel no celular;
  - CSS bloqueante;
  - ausência de canonical, sitemap, robots e JSON-LD;
  - actions sem SHA;
  - Trusted Types.

## 4. Pendências que impedem a entrega final

| Pendência                                           | Por que bloqueia                                                                           | Responsável         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------- |
| **Logotipo oficial** (SVG ou PNG grande)            | Hoje o cabeçalho mostra o nome em texto; sem ele não há favicon nem `og:image`             | Cliente             |
| **Fotografias com direito de uso** (hero e empresa) | Os espaços de imagem mostram só o texto alternativo; a proposta premium depende delas      | Cliente             |
| **Validação dos textos**                            | Hero, empresa, abordagem, área e contato foram redigidos a partir do briefing              | Cliente             |
| **Repositório no GitHub e configuração única**      | Deploy, ruleset, check obrigatório e ambiente nunca rodaram no GitHub                      | Responsável técnico |
| **Domínio personalizado** (se houver)               | Sem ele, o site fica em `usuario.github.io/repo`, e `robots.txt`/sitemap não valem na raiz | Cliente + técnico   |

## 5. O que depende de configuração manual

Tudo em `publicacao.md` §3 e §6:

1. Criar o repositório e enviar o projeto (sem `dist/` e `node_modules/`).
2. _Settings → Pages → Source: GitHub Actions_.
3. Aplicar o ruleset: `gh api repos/OWNER/REPO/rulesets --method POST --input .github/rulesets/proteger-main.json`.
4. Restringir o ambiente `github-pages` à `main` e, opcionalmente, exigir aprovação.
5. Permissões do Actions: somente leitura, e sem permissão para criar ou aprovar PRs.
6. Papéis: Write para quem edita e Admin só para o responsável técnico; 2FA obrigatório.
7. Preencher `REPOSITORY` em `src/lib/site.js`, para o painel mostrar os links de envio.
8. Domínio personalizado (DNS e _Settings → Pages_), se houver.
9. Executar o checklist de `publicacao.md` §5 no GitHub real.

## 6. Riscos residuais

- **O site não é invulnerável.**
  - Sem cabeçalhos HTTP próprios, ele pode ser embutido por terceiros (clickjacking; risco baixo, porque não há
    ações autenticadas), e HSTS e `nosniff` dependem do GitHub.
  - Trusted Types só protege a página pública, e só no Chromium.
- **O painel é público.** Não tem senha, por decisão consciente: uma senha em JavaScript seria falsa. Ele só altera o
  navegador de quem o usa; a autorização real é a do GitHub. Se o cliente exigir login no painel ou publicação com um
  clique, será preciso um serviço externo com autenticação, o que depende de nova autorização.
- **A política editorial é heurística.** Ela não substitui a leitura humana do PR.
- **Com uma única pessoa no repositório,** não há revisão por outra pessoa; a proteção é o check e a aprovação do
  ambiente.
- **Actions fixadas por SHA** não recebem correções sozinhas; atualize periodicamente.
- **Não testado:**
  - Safari/iOS e Firefox reais;
  - leitores de tela reais (NVDA, VoiceOver);
  - Lighthouse no site publicado;
  - o site com as fotografias definitivas.

## 7. Situação final

| Aspecto                                                    | Situação                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------------- |
| Código, build e testes                                     | Concluído e verificado                                            |
| Painel (edição restrita, rascunho, exportação, importação) | Concluído e verificado                                            |
| Fluxo de publicação                                        | Implementado e verificado localmente; **não executado no GitHub** |
| Conteúdo                                                   | **Pendente**: logotipo, fotos e validação dos textos pelo cliente |
| Entrega ao cliente                                         | **Não pronta**: depende das pendências do §4                      |

Quando as pendências forem resolvidas:

1. Integrar logotipo e fotos pelo painel ou pelo repositório.
2. Rodar `npm run check`.
3. Executar o checklist de `publicacao.md` §5 no GitHub.
4. Repetir o Lighthouse e a revisão visual no endereço publicado.
5. Só então declarar a entrega concluída.

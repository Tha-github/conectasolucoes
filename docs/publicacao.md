# Publicação de conteúdo — Conecta Soluções

Como alterações feitas no painel (`/admin/`) chegam ao site público no GitHub Pages **sem backend próprio**.

## 0. Fluxo atual: login e "Publicar no site" (desde 29/10/2026)

Por decisão da responsável pelo projeto, o painel publica direto, no mesmo padrão do site da Weiri. É uma **exceção
registrada no `CLAUDE.md` §7**; as seções 1 a 4 abaixo descrevem o fluxo anterior (Pull Request), que continua
funcionando como alternativa e como plano de recuperação.

**Como funciona**

1. O painel pede a **senha**. Com ela, o navegador decifra a chave do GitHub guardada em `content/acesso.json`
   (publicada em `admin/acesso.json`), cifrada com AES-256-GCM e chave derivada por PBKDF2-SHA256 com 600 mil
   iterações. A chave decifrada fica só na memória da aba; **Sair** ou fechar a aba a descarta.
2. **Publicar no site** confere se o `content.json` do GitHub ainda é o que o painel carregou (senão recusa, para não
   sobrescrever outra publicação) e grava, **num único commit na `main`**, o `content/content.json` e as imagens novas
   em `src/assets/img/`. O código só aceita esses caminhos (`src/lib/access.js → isPublishablePath`).
3. O push dispara o workflow **Publicar no GitHub Pages**, que roda `validate:publish`, lint, testes e build antes do
   deploy. Conteúdo recusado ali **não vai ao ar**: o site continua como estava, e o erro aparece em _Actions_.
4. O painel consulta o site a cada 15 s e avisa quando a mudança aparece (normalmente em 1 a 3 minutos).

**Configuração (uma vez, pelo responsável técnico)**

1. GitHub → _Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token_.
   - _Token name_: `Painel Conecta Soluções`; _Expiration_: o maior prazo aceito (**anote a data**).
   - _Repository access_: **Only select repositories** → `conectasolucoes`.
   - _Repository permissions_: **Contents: Read and write**. Nenhuma outra (sem _Workflows_, sem _Administration_).
2. Abra `https://tha-github.github.io/conectasolucoes/admin/`. Sem `acesso.json`, aparece a configuração inicial:
   cole a chave, defina a senha (mínimo de 10 caracteres; use uma frase longa) e confirme. O painel confere a chave,
   grava o arquivo cifrado no repositório (commit "Painel: configuração do acesso") e entra.
3. Passe a senha ao cliente por um canal privado. A chave **não precisa ser guardada**: ela já está cifrada no site.
4. Antes de trabalhar no repositório pelo computador, rode `git pull`: cada publicação do painel é um commit na
   `main`.

- **Trocar a senha:** no painel, **Trocar senha** (regrava o arquivo cifrado; vale após o próximo deploy).
- **Chave venceu ou foi revogada:** na tela de senha, **Reconfigurar acesso** e cole uma chave nova.
- **Suspeita de vazamento da senha:** revogue o token no GitHub **imediatamente** e reconfigure com chave e senha
  novas. Revogar o token invalida o acesso na hora, mesmo para quem tiver a senha antiga.

**Riscos e limites (honestos)**

- `admin/acesso.json` é público. Quem baixá-lo pode tentar senhas **offline, sem limite de tentativas**. Senha curta
  ou comum pode ser descoberta; por isso o mínimo de 10 caracteres e a recomendação de frase longa.
- Quem descobrir a senha consegue o token e, com ele, **alterar arquivos deste repositório** (só ele; sem permissão de
  workflows). A lista fechada de caminhos protege o uso normal do painel, não um atacante que já tenha o token.
- O "login" não é autenticação de servidor: não há sessão, bloqueio por tentativas nem registro de acesso. O
  histórico de commits ("Painel: …") mostra o que foi publicado e quando.
- **Ruleset da `main`:** o `.github/rulesets/proteger-main.json` (seção 3) exige Pull Request e **bloquearia as
  publicações do painel**. Não aplique o ruleset como está enquanto este fluxo estiver em uso. Se quiser proteger a
  `main` contra force-push e exclusão, aplique só essas duas regras.

## 1. Análise: por que o painel não gravava direto no GitHub (fluxo anterior)

| Opção                                              | Por que não serve (sem servidor)                                                                                                                                                                                                                                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **OAuth App, fluxo web**                           | A troca do `code` por token exige o `client_secret`, que não pode estar no front-end público. O endpoint de token não atende chamadas cross-origin do navegador: há relatos de erro de CORS, e a documentação diz que não há suporte a preflight. Na prática, isso exige um proxy ou servidor intermediário. |
| **OAuth device flow**                              | Feito para dispositivos sem navegador (CLIs). Os endpoints também não são chamáveis por JavaScript de outra origem, então exigiria proxy.                                                                                                                                                                    |
| **GitHub App (token de usuário ou de instalação)** | O token de usuário cai na mesma troca OAuth. O token de instalação exige assinar um JWT com a **chave privada** do app, que precisa ficar em servidor.                                                                                                                                                       |
| **Personal Access Token colado no painel**         | É um segredo de longa duração no navegador. Ficaria exposto a XSS, extensões e ao histórico, e é vetado pelo `CLAUDE.md` §7 ("não implemente escrita direta no repositório por token no navegador").                                                                                                         |
| **CMS Git-based (Decap/Netlify CMS etc.)**         | Para GitHub, dependem de um servidor de autenticação OAuth intermediário (Netlify, serverless próprio). Isso é intermediário externo, não autorizado.                                                                                                                                                        |
| **GitHub Pages**                                   | Só serve arquivos estáticos. Não executa código, não guarda segredos e não permite cabeçalhos próprios.                                                                                                                                                                                                      |

**Conclusão (até 29/10/2026):** publicação direta segura a partir do navegador exige um componente de servidor ou um
intermediário. Em 29/10/2026 a responsável pelo projeto autorizou a exceção descrita na seção 0 (token fine-grained
cifrado pela senha), conhecendo os riscos acima.

**Fluxo adotado:** o painel faz edição local, prévia e exportação. A autenticação acontece **no próprio github.com**,
quando a pessoa autorizada abre um Pull Request com a conta dela, que tem 2FA. O CI valida tudo, e a branch `main`
protegida só aceita o merge com a validação verde. O deploy roda no GitHub Actions depois do merge.

> Se um dia for exigida publicação com um clique a partir do painel, a solução é um serviço externo confiável:
> uma função serverless que faça a troca OAuth e grave via GitHub App com permissões mínimas, ou um CMS com
> autenticação real. Isso exige decisão e autorização do responsável, além de revisão de segurança, antes de ser
> implementado.

## 2. Arquitetura do fluxo

```
Painel (/admin/, navegador)          github.com (identidade + permissões)         GitHub Actions
───────────────────────────          ────────────────────────────────────         ───────────────
editar → prévia → exportar   ──►     branch conteudo/AAAA-MM-DD                    validate.yml (PR, somente leitura)
content.json + imagens              commit com conta autenticada (2FA)   ──►     • escopo do PR de conteúdo
                                     Pull Request para main                       • schema + imagens + política
                                                                                  • lint, testes, build
                                     ruleset: main só por PR,            ◄──      status "validar"
                                     check "validar" obrigatório
                                     merge (squash)                       ──►     pages.yml (push na main)
                                                                                  • revalida tudo → build
                                                                                  • deploy (ambiente github-pages,
                                                                                    aprovação opcional)
```

**Barreiras contra alterações não autorizadas:**

1. **Identidade:** só quem tem permissão de escrita no repositório consegue criar branches e abrir PRs internos. PRs
   de forks não têm acesso de escrita, e o CI deles roda sem segredos.
2. **Ruleset da `main`** (`.github/rulesets/proteger-main.json`):
   - sem push direto, porque a branch exige Pull Request;
   - sem force-push e sem exclusão;
   - histórico linear (squash);
   - check `validar` obrigatório e atualizado com a `main`;
   - **sem exceções** (`bypass_actors` vazio). Os administradores também seguem a regra.
3. **Validação no PR** (`.github/workflows/validate.yml`), só com `contents: read`:
   - **Escopo:** branches `conteudo/*` só podem modificar `content/content.json` e adicionar ou substituir imagens em
     `src/assets/img/` **referenciadas** pelo conteúdo. São recusados código, templates, CSS, workflows, exclusões,
     renomeações e links simbólicos (`scripts/check-content-scope.mjs`).
   - **Conteúdo** (`npm run validate:publish`):
     - schema estrito, sem propriedades desconhecidas, com 21 serviços fixos, limites, cores e contraste (incluindo
       as cores de mensagens);
     - arquivos de imagem: existência, formato real, KB, dimensões e SVG seguro;
     - **política editorial** (`src/lib/policy.js`): serviço não pode mudar de significado; não pode haver anos de
       mercado, números, certificações, garantias, preços, depoimentos/clientes nem dados pessoais (e-mail, CNPJ,
       CPF, endereço, telefone, links).
   - Lint, testes e build completos.
   - O resumo do job lista os campos alterados, para facilitar a revisão.
4. **Publicação** (`.github/workflows/pages.yml`):
   - roda só em push na `main`, com permissões padrão `{}`;
   - o job de build tem apenas `contents: read`;
   - o deploy tem apenas `pages: write` e `id-token: write`;
   - **revalida** conteúdo, lint e testes antes de gerar o site;
   - o ambiente `github-pages` pode exigir aprovação manual.

Alterações de **código** (fora de `conteudo/*`) também precisam de PR e do check `validar`, mas o escopo delas não é
limitado. Elas devem ser revisadas pelo responsável técnico.

## 3. Configuração única (responsável técnico, após criar o repositório)

Pré-requisitos:

- repositório criado, com a `main` como branch padrão;
- `gh` CLI autenticado com uma conta **admin** do repositório.

Substitua `OWNER/REPO` pelos valores reais.

1. **Pages:** _Settings → Pages → Build and deployment → Source: **GitHub Actions**_.
2. **Ruleset da `main`:**
   ```sh
   gh api repos/OWNER/REPO/rulesets --method POST --input .github/rulesets/proteger-main.json
   ```
   Confira em _Settings → Rules → Rulesets_. O check `validar` só aparece como opção depois que o workflow rodar
   pela primeira vez num PR. Se a API recusar algum campo, ajuste conforme a documentação atual dos
   [rulesets](https://docs.github.com/en/rest/repos/rules), mantendo as mesmas regras.
3. **Ambiente `github-pages`** (_Settings → Environments → github-pages_):
   - em _Deployment branches and tags_, deixe **apenas `main`**;
   - opcional, para exigir **aprovação antes de publicar**: em _Required reviewers_, adicione o responsável. Cada
     deploy fica aguardando aprovação em _Actions_. Em repositórios privados, esse recurso pode depender do plano do
     GitHub.
4. **Permissões padrão do Actions** (_Settings → Actions → General → Workflow permissions_):
   - marque **Read repository contents**;
   - **desmarque** "Allow GitHub Actions to create and approve pull requests".
5. **Pessoas:**
   - quem edita conteúdo recebe papel **Write**, que permite branch e PR, mas não muda regras;
   - só o responsável técnico fica como **Admin**;
   - exija **2FA** na organização ou conta.
6. **Revisão humana obrigatória (quando houver 2+ pessoas):** no ruleset, troque
   `required_approving_review_count` para `1`. Opcionalmente, crie `.github/CODEOWNERS` com o usuário real do
   responsável e ative `require_code_owner_review`. Com uma única pessoa, mantenha `0`: o GitHub não permite aprovar o
   próprio PR. Nesse caso, use a aprovação do ambiente (item 3).
7. **Links no painel:** `REPOSITORY` em `src/lib/site.js` já aponta para `Tha-github/conectasolucoes` (29/10/2026).
   O painel oferece os links de envio do GitHub depois de exportar. Isso não é credencial: o GitHub exige login no
   envio. Se o repositório mudar de nome ou dono, atualize `owner` e `name`.

## 4. Processo exato para publicar alterações (administrador)

Quem publica precisa de conta no GitHub com papel **Write** (ou superior) no repositório.

1. **No painel** (`/admin/`):
   1. edite os textos, as imagens e as cores e confira a prévia;
   2. clique em **Exportar JSON** e, na mensagem, em **Baixar como content.json (para o GitHub)**;
   3. se trocou imagens, baixe também cada arquivo de imagem indicado, **sem renomear**.
2. **No GitHub**, enviando o conteúdo:
   1. abra o link **Enviar content.json no GitHub** que aparece no painel, ou navegue até a pasta `content/` do
      repositório e use _Add file → Upload files_;
   2. arraste o `content.json`, que substitui o atual;
   3. em _Commit changes_, escolha **"Create a new branch for this commit and start a pull request"**;
   4. dê à branch um nome começando com **`conteudo/`**, por exemplo `conteudo/2026-10-28-textos-hero`;
   5. confirme.
3. **Se houver imagens novas:**
   1. na **mesma branch** (selecione-a no seletor de branches), entre em `src/assets/img/` (ou use o link **Enviar
      imagens no GitHub** e troque para a branch);
   2. use _Upload files_ e arraste as imagens;
   3. em _Commit changes_, escolha **commit direto na branch `conteudo/…`**.
4. **No Pull Request:**
   1. aguarde o check **validar**;
   2. se ficar **vermelho**, abra _Details_: o resumo diz o que foi recusado, por exemplo
      `area.title: máximo de 40 caracteres` ou `src/js/main.js: fora do escopo`. Corrija no painel, exporte de novo e
      envie outro commit na mesma branch;
   3. se ficar **verde**, confira a lista **"Campos alterados"** no resumo do check e a prévia do painel.
5. **Merge:** clique em **Squash and merge**. O botão só fica disponível com o check verde.
6. **Publicação:** o workflow **Publicar no GitHub Pages** roda automaticamente. Se o ambiente exigir aprovação, o
   responsável aprova em _Actions → (execução) → Review deployments_. Em poucos minutos, por causa do cache do GitHub
   Pages, o site mostra a alteração.

**Alternativa local** (responsável técnico):

1. `git switch -c conteudo/AAAA-MM-DD`;
2. `npm run content:import -- arquivo.json`;
3. copiar as imagens para `src/assets/img/`;
4. `npm run check`;
5. commit, push e Pull Request. O resto é igual.

## 5. O que foi testado

Localmente, com `npm test` (`tests/publishing.test.mjs`):

- **`validate:publish` recusa** cada um destes casos:
  - propriedade desconhecida;
  - serviço a mais ou removido;
  - seção nova;
  - URL de imagem externa;
  - imagem inexistente ou pequena demais;
  - SVG com script;
  - texto acima do limite;
  - cor sem contraste;
  - serviço descaracterizado;
  - afirmação não confirmada;
  - dado pessoal;
  - versão antiga do schema;
  - JSON malformado.

  Também **aprova** uma edição legítima com imagem nova. O CLI sai com código 1 e explica o motivo.

- **Escopo do PR**, testado como função e numa **simulação com git real** num repositório temporário:
  - uma branch `conteudo/*` legítima passa;
  - uma que altera código, apaga arquivos ou envia imagem não usada é barrada;
  - casos adicionais também são recusados: workflow, schema, `package.json`, nome e subpasta de imagem inválidos,
    link simbólico e mudança de tipo.
- **Configuração versionada:**
  - nenhum workflow usa `pull_request_target`, segredos ou `contents: write`;
  - a validação de PR é somente leitura, sem credencial persistida e sem expressões interpoladas em comandos;
  - a publicação roda só da `main`, com permissões mínimas por job e revalidação antes do build;
  - o ruleset exige PR e o check `validar`, que corresponde ao nome do job, sem exceções;
  - os links do painel só existem com o repositório configurado e válido.

**Só pode ser verificado no GitHub** (checklist após o item 3):

- [ ] `git push origin main` direto é **recusado**.
- [ ] Um PR `conteudo/teste` com `src/js/main.js` alterado fica com `validar` **vermelho**, e o merge fica
      **bloqueado**.
- [ ] Um PR com `content.json` inválido, por exemplo um serviço a mais, fica **vermelho** e bloqueado.
- [ ] Um PR válido fica **verde** e, depois do merge, publica. Com reviewers no ambiente, o deploy aguarda aprovação.
- [ ] `gh api repos/OWNER/REPO/rulesets` lista "Proteger main" com `enforcement: active`.
- [ ] As actions, fixadas por SHA de commit desde 29/10/2026 (`checkout` v4.4.0, `setup-node` v4.4.0,
      `configure-pages` v5.0.0, `upload-pages-artifact` v3.0.1, `deploy-pages` v4.0.5; o comentário ao lado do SHA
      indica a versão), rodam sem avisos de descontinuação. Para atualizar, troque o SHA e o comentário juntos;
      `tests/audit.test.mjs` recusa referência que não seja SHA.
- [ ] No site publicado, `index.html` tem `<link rel="canonical">` com a URL do Pages (vinda de
      `configure-pages` → `SITE_URL`) e existe `sitemap.xml`.

## 6. Endereços: base path, painel, domínio personalizado e 404

| Tema                      | Como funciona                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Base path**             | `actions/configure-pages` informa `base_path`: `/nome-do-repo` em site de projeto e vazio com domínio próprio ou em `usuario.github.io`. Todas as páginas usam caminhos relativos, e o base path só entra no `<base>` da 404. Não é preciso configurar nada.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **URL pública**           | `configure-pages` também informa `base_url`, que o build recebe como `SITE_URL` e usa em `canonical`, `og:url`, `sitemap.xml` e `robots.txt`. Com domínio próprio, ela passa a ser o domínio automaticamente.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Painel (`/admin/`)**    | É a página real `admin/index.html`, sem roteamento no navegador. O GitHub Pages redireciona `/admin` para `/admin/`; o servidor local reproduz isso (301).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Fallback (404)**        | O GitHub Pages serve `404.html` em qualquer endereço inexistente, inclusive em subpastas (`/repo/admin/x/y`). O `<base>` faz CSS, menu e o botão "Voltar para a página inicial" apontarem para a raiz do site. Não há SPA, então não existe rota que dependa de fallback.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Domínio personalizado** | **Ainda não foi informado.** Quando houver: (1) no provedor de DNS, crie `CNAME www → usuario.github.io` e, para o domínio raiz, os registros `A`/`AAAA` indicados na [documentação do GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site); (2) em _Settings → Pages → Custom domain_, informe o domínio e marque **Enforce HTTPS** quando o certificado ficar pronto; (3) recomendado: verifique o domínio em _Settings → Pages_ da conta/organização, para evitar sequestro de domínio. Com publicação por Actions, **não é preciso arquivo `CNAME`** no repositório: o domínio fica nas configurações. O próximo deploy já usa o domínio no canonical e no sitemap. |

Testado localmente (`tests/build.test.mjs`, `tests/audit.test.mjs` e ponta a ponta no navegador): site de projeto em
`/repo`, domínio personalizado sem base path, redirecionamento de `/admin`, 404 em subpasta e canonical com o domínio.

## 7. Limitações

- Não há publicação com um clique a partir do painel, nem login no painel (seção 1).
- Quem edita precisa de conta no GitHub com acesso de escrita, ou enviar os arquivos ao responsável técnico.
- Enviar `content.json` e imagens pela interface web gera dois commits na branch, o que é aceitável com o squash no
  merge.
- A política editorial é heurística. Ela barra os casos previstos, mas não substitui a leitura humana do PR. Quando o
  cliente confirmar um dado (por exemplo, uma certificação), a regra correspondente em `src/lib/policy.js` deve ser
  ajustada pelo responsável técnico.
- O cache do GitHub Pages pode levar alguns minutos para refletir a publicação.

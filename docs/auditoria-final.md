# Auditoria final — Conecta Soluções

Revisão de entrega · 29/10/2026 (após o **redesign estrutural**, `PROJECT_AUDIT.md` §17) · Escopo: site público,
painel `/admin/`, build, testes, GitHub Actions, publicação e documentação.

## Situação em uma frase

**Redesign estrutural implementado e verificado localmente, mas ainda não pronto para a entrega final ao
cliente:** as fotografias são ilustrativas (domínio público), os textos novos (selo, características, botões)
aguardam validação e a proteção da `main` (ruleset) ainda não foi aplicada. Detalhes em
[§4](#4-pendências-que-impedem-a-entrega-final).

## 1. Fontes usadas na revisão

- `CLAUDE.md` (regras e informações confirmadas, §3), o histórico em `PROJECT_AUDIT.md` e a especificação de redesign
  enviada pelo cliente (descrição textual da referência Merlot Residence).
- O formulário Google e a página do Behance **não foram lidos**: o formulário não foi fornecido e o Behance recusa
  acesso automatizado (HTTP 403).

## 2. Verificação item a item

Legenda: **OK** = verificado nesta revisão · **Parcial** = verificado com ressalva · **Pendente** = depende de algo
externo.

| #   | Item                                      | Situação         | Evidência                                                                                                                                                                                                             |
| --- | ----------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Fidelidade ao briefing                    | OK               | 21 serviços na ordem do `CLAUDE.md`, incluindo rebobinagem de motores; WhatsApp `5591980958661`; Região Norte (testes)                                                                                                |
| 2   | Qualidade visual premium                  | OK, com ressalva | Sistema v3 (`DESIGN_SYSTEM.md`): composição da referência adaptada (hero em camadas, mosaico, cartões vinho). Símbolo oficial no ar; **fotos ilustrativas** (CC0/domínio público) até o cliente enviar fotos próprias |
| 3   | Responsividade                            | OK               | 320, 375, 390, 430, 768, 1024, 1440 e 1920 px: sem rolagem horizontal (medido no navegador). Enquadramento com imagem de teste em 390, 768, 1440 e 1920 px, sem distorção                                             |
| 4   | Links e botões                            | OK               | Todos os WhatsApp com `noopener noreferrer` e aviso de nova aba; nenhum `href="#"` (testes); `/admin` → `/admin/` (301) no site publicado                                                                             |
| 5   | Conteúdo real, sem invenções              | OK, com ressalva | Política editorial bloqueia anos, números, certificações, preços e depoimentos (teste). Textos do hero, empresa e abordagem **aguardam validação do cliente**                                                         |
| 6   | Painel limitado a textos, imagens e cores | OK               | 85 campos; nenhum controle novo cria, remove ou reordena itens. O redesign só acrescentou indicadores visuais de alteração                                                                                            |
| 7   | Impossível criar/excluir seções e itens   | OK               | Recusado no painel, no `content:import`, no `validate:publish` e no escopo do PR (testes)                                                                                                                             |
| 8   | Painel publicado                          | OK               | No endereço público: 88 controles, 13 áreas, prévia com os 21 serviços, status "Igual ao conteúdo publicado", ações habilitadas                                                                                       |
| 9   | Segurança                                 | OK / **Parcial** | HTML digitado aparece como texto na prévia (0 elementos criados); cor sem contraste recusada; sem segredos no repositório; `npm audit` 0. **Ruleset da `main` ainda não aplicado**                                    |
| 10  | SEO, acessibilidade e performance         | OK               | Lighthouse no build de produção (servidor local): celular 98/100/96/100, desktop 100/100/96/100, CLS 0. Boas práticas 96 só pelo `favicon.ico` ausente                                                                |
| 11  | Build e testes                            | OK               | `npm run check` (lint + 283 testes + build), `validate:publish`, `docs:schema --check`; no CI, o workflow "Publicar" repetiu tudo e passou                                                                            |
| 12  | GitHub Pages                              | OK               | Deploy via Actions concluído; `/`, `/admin/`, CSS, fontes, `sitemap.xml` e `robots.txt` respondem 200; URL inexistente responde 404 com a página estilizada (base path correto)                                       |

## 3. O que foi feito nesta revisão

- **Redesign** do site e do painel (detalhes e decisões em `PROJECT_AUDIT.md` §16 e `DESIGN_SYSTEM.md`): Cormorant
  Garamond + Manrope, paleta da especificação com contraste AA validado, hero com fotografia sangrando até a borda,
  composições assimétricas, cabeçalho com estado ao rolar, menu móvel editorial, painel com menu lateral e contadores
  de alteração.
- **SEO:** Twitter Cards, `og:image` condicionado a fotografia publicada, `theme-color`.
- **Publicação:** repositório `Tha-github/conectasolucoes` inicializado com a `main`, Pages habilitado em modo "GitHub
  Actions", `REPOSITORY` configurado em `src/lib/site.js`.
- **Testes novos:** Twitter Card/`og:image`, estado do cabeçalho sem mudança de altura, fontes do sistema v2, links do
  painel com o repositório configurado.

### Corrigido durante a revisão

- Cascata do menu móvel (o estilo de desktop anulava o de celular).
- Rótulos dos botões do painel quebrando em duas linhas a 375 px.
- Primeira execução do deploy falhou porque o Pages ainda não estava habilitado; habilitado e reexecutado com sucesso.

## 4. Pendências que impedem a entrega final

| Pendência                                         | Por que bloqueia                                                                     | Responsável         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------- |
| **Fotografias próprias** (hero, mosaico, contato) | As 11 fotos atuais são ilustrativas (CC0/domínio público, `CREDITOS_IMAGENS.md`)     | Cliente             |
| **Validação dos textos**                          | Selo, 6 características, botões e demais textos foram redigidos a partir do briefing | Cliente             |
| **Logotipo para fundo escuro** (opcional)         | O logotipo horizontal tem texto azul-marinho; no vinho, usa-se só o símbolo          | Cliente             |
| **Proteção da `main`**                            | Sem o ruleset, é possível enviar direto para a `main` sem passar pelo PR validado    | Responsável técnico |

## 5. Configuração manual restante

Em `publicacao.md` §3:

1. Aplicar o ruleset:
   `gh api repos/Tha-github/conectasolucoes/rulesets --method POST --input .github/rulesets/proteger-main.json`.
   Depois disso, toda mudança (inclusive do responsável técnico) entra por Pull Request.
2. Restringir o ambiente `github-pages` à `main` e, opcionalmente, exigir aprovação.
3. Permissões do Actions: somente leitura, sem permissão para criar ou aprovar PRs.
4. Atualizar as actions fixadas por SHA para versões em Node 24 (o GitHub já avisa que Node 20 está depreciado; hoje
   elas funcionam forçadas em Node 24).
5. Domínio personalizado, se houver (`publicacao.md` §6).

## 6. Riscos residuais

- **O painel é público e não tem senha**, por decisão consciente (senha em JavaScript seria falsa). Ele só altera o
  navegador de quem o usa; a autorização real é a do GitHub. Login ou publicação com um clique exigiriam um serviço
  externo com autenticação, o que depende de nova autorização.
- **Sem cabeçalhos HTTP próprios** no GitHub Pages: CSP por `<meta>` (sem `frame-ancestors`), HSTS e `nosniff`
  dependem do GitHub.
- **`robots.txt` e `sitemap.xml`** num site de projeto ficam em `/conectasolucoes/`, onde os buscadores não os
  procuram; envie o sitemap no Google Search Console ou use domínio próprio.
- **A política editorial é heurística** e não substitui a leitura humana do PR.
- **Não testado:** Safari/iOS e Firefox reais, leitores de tela reais (NVDA, VoiceOver), Lighthouse no endereço
  publicado e o site com as fotografias definitivas.

## 7. Situação final

| Aspecto                      | Situação                                                                    |
| ---------------------------- | --------------------------------------------------------------------------- |
| Código, build e testes       | Concluído e verificado (local e CI)                                         |
| Redesign do site e do painel | Concluído e verificado                                                      |
| Publicação                   | **Publicado** em https://tha-github.github.io/conectasolucoes/ e verificado |
| Proteção da `main`           | **Pendente** (ruleset)                                                      |
| Conteúdo                     | **Pendente**: logotipo, fotos e validação dos textos pelo cliente           |
| Entrega ao cliente           | **Não pronta**: depende das pendências do §4                                |

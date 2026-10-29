# Schema de conteúdo editável — Conecta Soluções

Versão do schema: **2**. Código: `src/lib/schema.js`. Conteúdo publicado: `content/content.json`.

## 1. Regra central

O usuário final pode alterar **somente** valores de três tipos, em chaves que já existem:

1. **Textos**;
2. **Imagens**, isto é, o arquivo e o texto alternativo de campos de imagem existentes;
3. **Cores** da paleta, com chaves fixas.

Ele **não pode** criar, remover, reordenar ou duplicar seções, serviços, links, botões, campos, itens de navegação ou
qualquer outro elemento estrutural. O schema garante isso de três formas:

- todos os grupos são **objetos com chaves fixas**, sem nenhum array;
- propriedades **desconhecidas são rejeitadas**, e propriedades **ausentes também**;
- serviços (`SERVICE_IDS`, 21) e itens da abordagem (`APPROACH_IDS`, 4) são objetos indexados por ID. A **ordem e a
  quantidade vêm do código**, não do JSON: reordenar chaves no arquivo não muda a página, e acrescentar ou remover uma
  chave é erro.

## 2. O que fica fora do conteúdo editável

| Item                                                                                                 | Onde é definido                              |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Seções, ordem e âncoras (`inicio`, `sobre`, `servicos`, `abordagem`, `atuacao`, `contato`)           | `src/pages/index.html`, `PAGE_SECTIONS`      |
| IDs, quantidade e ordem dos serviços e dos itens da abordagem                                        | `SERVICE_IDS`, `APPROACH_IDS` em `schema.js` |
| Destinos de links: âncoras, página inicial, WhatsApp                                                 | templates e `src/lib/site.js`                |
| Número do WhatsApp `(91) 98095-8661`, URL `wa.me/5591980958661` e mensagem pré-preenchida            | `src/lib/site.js`                            |
| Separadores e símbolos fixos: `©`, ano (gerado no build), `:` após "WhatsApp", `\|` no título da 404 | templates                                    |
| Layout, classes, componentes, tokens não cromáticos (tipografia, espaço, grid)                       | `src/css/`                                   |
| Proporções e enquadramento das imagens                                                               | `src/css/sections.css`                       |
| Regras de validação e limites                                                                        | `schema.js` / `validate.js`                  |

Um teste (`tests/content-layer.test.mjs`) renderiza a página com um marcador único em cada campo de texto e verifica
que **todo texto visível e todo atributo `alt`, `aria-label`, `title` e `meta` vêm do conteúdo**. As únicas exceções
são os itens fixos listados acima.

## 3. Tipos e validação

### Texto

- Deve ser uma string de uma linha, sem `\n`, `\r` ou `\t`.
- Tamanho mínimo de 1 caractere (sem contar espaços) e máximo definido por campo, conforme o espaço no layout. O
  painel deve exibir `atual/limite` usando `field.maxLength` (`fieldAt(caminho)` em `validate.js`).
- São rejeitados caracteres de controle e caracteres invisíveis ou de direção de texto (U+200B–200F, U+202A–202E,
  U+2066–2069, U+FEFF).
- **Sempre renderizado como texto:** o template escapa `& < > " '`, e o conteúdo nunca é reprocessado como template.
  `<b>`, `<script>` ou `{{…}}` digitados aparecem literalmente. Não existe `innerHTML` no código; ESLint e um teste
  bloqueiam essa API.

### Imagem: `{ "src": string | null, "alt": string, "focus": "center" | "top" | "bottom" | "left" | "right" }`

- `focus` é o enquadramento (`object-position`). A lista é fechada e vira uma classe CSS fixa
  (`.media__img--focus-*`), sem estilo inline. Só os campos com `focal: true` (destaque e empresa) aceitam valores
  diferentes de `"center"`.
- **Metadados do campo** (`schema.js`), usados pelo painel:
  - `frames`: as molduras reais do site, com a proporção de cada uma;
  - `target`: a caixa máxima da imagem otimizada;
  - `formats`.
- **Envio pelo painel** (`checkOriginalUpload` em `admin-model.js` e `processImage` em `js/admin/image-editor.js`):
  - só **raster** (JPEG, PNG, WebP, AVIF), nunca SVG;
  - original até 15 MB e 8000 px por lado;
  - tipo real pelos bytes;
  - **decodificação real**, que recusa arquivo corrompido;
  - redução proporcional até `target`;
  - reencodificação em WebP, que remove metadados;
  - o resultado final precisa caber em `maxBytes` e nas dimensões do campo.

- `src` deve ser `null` (imagem pendente, que mostra o texto alternativo) ou um caminho
  `assets/img/<nome>.<ext>`, com nome em minúsculas, números e hífens, **sem subpastas**.
- São rejeitados:
  - protocolos (`javascript:`, `data:`, `http(s):`, `file:`, `//`…);
  - caminhos absolutos;
  - `..`, `\`, `%`, query strings;
  - maiúsculas;
  - extensões fora da lista.

  `data:` não é necessário, porque toda imagem é um arquivo versionado.

- A extensão precisa estar entre os formatos aceitos pelo campo.
- **Arquivo** (verificado no build e no `content:import`, em `src/lib/image-meta.js`):
  - existe com a grafia exata;
  - o formato real, lido pelos bytes, corresponde à extensão;
  - tamanho e dimensões estão dentro dos limites do campo.
- **AVIF** tem as dimensões lidas da caixa `ispe`. Um ISOBMFF de outro tipo (HEIC, MP4) é recusado.
- **SVG** (apenas no logotipo, e **só pelo repositório**) é recusado se contiver `<script>`, `<foreignObject>`, atributos `on…`, `javascript:`,
  `DOCTYPE`/`ENTITY`, `href`/`url()` externos ou `@import`.
- `alt`: obrigatório, com até 160 caracteres (logo: 60). Deve descrever a imagem real.

### Cor

- Chaves fixas (14) no formato `#RRGGBB`. Não há nomes de cor, `rgb()`, `var()`, `;`, CSS livre, classes nem
  seletores. Elas viram apenas `--color-<chave>` em `css/theme.css`.
- **Contraste obrigatório:** pares texto/fundo ≥ 4,5:1 e bordas/foco ≥ 3:1 (`CONTRAST_PAIRS`). Uma combinação que
  quebre algum par é rejeitada, mesmo com cada cor válida isoladamente.

## 4. Versões, migração e valores padrão

- `schemaVersion` é obrigatório.
  - Uma versão **mais nova** que a do site é recusada ("atualize o site antes de importar").
  - Uma versão **antiga** passa pelas migrações explícitas de `src/lib/migrate.js`, em sequência; depois de migrar, a
    validação continua estrita.
  - **v1 → v2:** as imagens ganharam `focus`, com o valor `"center"`. O teste usa o arquivo v1 real em
    `tests/fixtures/content-v1.json`. Rascunhos e exportações v1 são migrados automaticamente. No repositório, o
    `validate:publish` exige a versão atual, e o painel sempre exporta nela.
- **Para mudar o schema de forma incompatível:**
  1. incremente `SCHEMA_VERSION`;
  2. registre `MIGRATIONS[n]`;
  3. adicione um teste com um arquivo da versão anterior;
  4. rode `npm run docs:schema`.
- **Defaults seguros** (`src/lib/defaults.js → resolveWithDefaults`) valem só para o **rascunho local**, que pode ter
  sido salvo por uma versão anterior do painel ou corrompido no navegador:
  - cada campo ausente, inválido ou de tipo errado volta ao valor padrão (`content.json` publicado);
  - propriedades desconhecidas são descartadas;
  - se as cores, juntas, não tiverem contraste, a paleta padrão inteira é restaurada;
  - uma versão desconhecida descarta o rascunho.

  Toda substituição é **relatada** (`issues`) para o painel mostrar ao usuário.

- **Importação e build são estritos:** dados inválidos são **rejeitados com mensagens por campo**, por exemplo
  `- hero.title: máximo de 80 caracteres (atual: 93)`. Nunca há correção silenciosa.

## 5. Persistência e publicação (site estático)

| Ação                                            | Onde fica                                                                  | Quem vê                              |
| ----------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------ |
| Editar e salvar rascunho (`src/lib/storage.js`) | `localStorage` deste navegador, chave `conecta-solucoes:rascunho-conteudo` | **Só quem editou, neste navegador.** |
| Exportar (`exportContent`)                      | Arquivo `.json` baixado, no mesmo formato de `content/content.json`        | Ninguém, até ser integrado           |
| Publicar                                        | Repositório → GitHub Actions → GitHub Pages                                | Todos os visitantes                  |

> **Salvar ou exportar não publica nada.** O GitHub Pages serve arquivos estáticos: sem backend, o navegador do editor
> não tem como alterar o site para outros visitantes. O rascunho local também pode ser apagado pelo navegador
> (limpeza de dados, navegação privada) e é compartilhado com outros sites em `<usuario>.github.io`, por isso é tratado
> como não confiável e revalidado ao ser lido.

**Procedimento de publicação:** um Pull Request numa branch `conteudo/…`, validado pelo CI e protegido por ruleset. O
passo a passo está em [`publicacao.md`](publicacao.md).

- O CI repete aqui as mesmas validações: schema, arquivos de imagem e **política editorial** (`src/lib/policy.js`).
- O escopo do PR fica limitado a `content/content.json` e às imagens referenciadas.
- Localmente, `npm run validate:publish` faz a mesma verificação.

**Publicação automática pelo painel não está implementada e não deve ser feita com token no navegador:** qualquer
token embutido no front-end fica público, e o fluxo OAuth do GitHub exige um servidor para a troca do código por
token. Ela exige um serviço confiável externo, uma decisão de arquitetura que depende de autorização do cliente
(CLAUDE.md §7).

## 6. Inventário de campos

Gerado a partir de `schema.js` e `content.json`. Um teste falha se esta seção ficar desatualizada.

<!-- prettier-ignore-start -->
<!-- inventario:inicio (gerado por npm run docs:schema; não edite à mão) -->

Total de campos editáveis: **119**.

#### `(raiz)` — Controle

| Caminho | Campo | Regra |
| ------- | ----- | ----- |
| `schemaVersion` | Versão do schema | fixo: `3` |

#### `meta` — Metadados (busca e compartilhamento)

| Caminho | Campo | Regra |
| ------- | ----- | ----- |
| `meta.title` | Metadados (busca e compartilhamento) › Título da página | texto, 1–70 caracteres, uma linha |
| `meta.description` | Metadados (busca e compartilhamento) › Descrição para buscadores | texto, 1–160 caracteres, uma linha |

#### `brand` — Marca

| Caminho | Campo | Regra |
| ------- | ----- | ----- |
| `brand.name` | Marca › Nome da empresa | texto, 1–40 caracteres, uma linha |
| `brand.tagline` | Marca › Área de atuação (rodapé) | texto, 1–80 caracteres, uma linha |
| `brand.region` | Marca › Região de atendimento (rodapé) | texto, 1–60 caracteres, uma linha |
| `brand.logo` | Marca › Logotipo (cabeçalho) | imagem: svg/png/webp/avif, até 200 KB, 120×32 a 2000×1000 px; alt até 60 |

#### `a11y` — Textos de acessibilidade

| Caminho | Campo | Regra |
| ------- | ----- | ----- |
| `a11y.skipLink` | Textos de acessibilidade › Link "pular para o conteúdo" | texto, 1–40 caracteres, uma linha |
| `a11y.newTab` | Textos de acessibilidade › Aviso de link em nova aba (leitores de tela) | texto, 1–40 caracteres, uma linha |

#### `nav` — Navegação

| Caminho | Campo | Regra |
| ------- | ----- | ----- |
| `nav.label` | Navegação › Nome da navegação (leitores de tela) | texto, 1–30 caracteres, uma linha |
| `nav.menu` | Navegação › Botão do menu (celular) | texto, 1–16 caracteres, uma linha |
| `nav.about` | Navegação › Link: Empresa | texto, 1–18 caracteres, uma linha |
| `nav.services` | Navegação › Link: Serviços | texto, 1–18 caracteres, uma linha |
| `nav.approach` | Navegação › Link: Abordagem | texto, 1–18 caracteres, uma linha |
| `nav.area` | Navegação › Link: Atuação | texto, 1–18 caracteres, uma linha |
| `nav.contact` | Navegação › Link: Contato | texto, 1–18 caracteres, uma linha |
| `nav.cta` | Navegação › Botão do cabeçalho | texto, 1–18 caracteres, uma linha |

#### `hero` — Destaque principal

| Caminho | Campo | Regra |
| ------- | ----- | ----- |
| `hero.eyebrow` | Destaque principal › Rótulo | texto, 1–50 caracteres, uma linha |
| `hero.title` | Destaque principal › Título principal (parte em branco) | texto, 1–80 caracteres, uma linha |
| `hero.titleAccent` | Destaque principal › Título principal (parte em dourado; pode ficar vazio) | texto, 0–60 caracteres, uma linha |
| `hero.text` | Destaque principal › Texto de apoio | texto, 1–220 caracteres, uma linha |
| `hero.cta` | Destaque principal › Botão | texto, 1–32 caracteres, uma linha |
| `hero.image` | Destaque principal › Imagem principal do destaque | imagem: webp/jpg/png/avif, até 800 KB, 600×1200 a 4000×4000 px; alt até 160 |
| `hero.detail` | Destaque principal › Imagem em primeiro plano do destaque | imagem: webp/jpg/png/avif, até 600 KB, 600×750 a 4000×4000 px; alt até 160 |
| `hero.seal.label` | Destaque principal › Selo circular › Linha superior | texto, 1–20 caracteres, uma linha |
| `hero.seal.title` | Destaque principal › Selo circular › Destaque | texto, 1–24 caracteres, uma linha |
| `hero.seal.text` | Destaque principal › Selo circular › Linha inferior | texto, 1–30 caracteres, uma linha |

#### `about` — Empresa

| Caminho | Campo | Regra |
| ------- | ----- | ----- |
| `about.eyebrow` | Empresa › Rótulo | texto, 1–40 caracteres, uma linha |
| `about.title` | Empresa › Título (parte leve) | texto, 1–80 caracteres, uma linha |
| `about.titleAccent` | Empresa › Título (parte em destaque; pode ficar vazio) | texto, 0–60 caracteres, uma linha |
| `about.text` | Empresa › Texto de apresentação | texto, 1–500 caracteres, uma linha |
| `about.cta` | Empresa › Botão | texto, 1–32 caracteres, uma linha |
| `about.image` | Empresa › Mosaico: imagem 1 | imagem: webp/jpg/png/avif, até 600 KB, 480×640 a 4000×4000 px; alt até 160 |
| `about.gallery.scada` | Empresa › Mosaico: demais imagens (fixas: 7) › Mosaico: imagem 2 | imagem: webp/jpg/png/avif, até 600 KB, 480×640 a 4000×4000 px; alt até 160 |
| `about.gallery.protecao` | Empresa › Mosaico: demais imagens (fixas: 7) › Mosaico: imagem 3 | imagem: webp/jpg/png/avif, até 600 KB, 480×640 a 4000×4000 px; alt até 160 |
| `about.gallery.paineis` | Empresa › Mosaico: demais imagens (fixas: 7) › Mosaico: imagem 4 | imagem: webp/jpg/png/avif, até 600 KB, 480×640 a 4000×4000 px; alt até 160 |
| `about.gallery.supervisao` | Empresa › Mosaico: demais imagens (fixas: 7) › Mosaico: imagem 5 | imagem: webp/jpg/png/avif, até 600 KB, 480×640 a 4000×4000 px; alt até 160 |
| `about.gallery.transformador` | Empresa › Mosaico: demais imagens (fixas: 7) › Mosaico: imagem 6 | imagem: webp/jpg/png/avif, até 600 KB, 480×640 a 4000×4000 px; alt até 160 |
| `about.gallery.infraestrutura` | Empresa › Mosaico: demais imagens (fixas: 7) › Mosaico: imagem 7 | imagem: webp/jpg/png/avif, até 600 KB, 480×640 a 4000×4000 px; alt até 160 |
| `about.gallery.subestacao` | Empresa › Mosaico: demais imagens (fixas: 7) › Mosaico: imagem 8 | imagem: webp/jpg/png/avif, até 600 KB, 480×640 a 4000×4000 px; alt até 160 |
| `about.facts.area.label` | Empresa › Características (fixas: 6) › Característica 01 › Rótulo | texto, 1–24 caracteres, uma linha |
| `about.facts.area.value` | Empresa › Características (fixas: 6) › Característica 01 › Valor em destaque | texto, 1–32 caracteres, uma linha |
| `about.facts.regiao.label` | Empresa › Características (fixas: 6) › Característica 02 › Rótulo | texto, 1–24 caracteres, uma linha |
| `about.facts.regiao.value` | Empresa › Características (fixas: 6) › Característica 02 › Valor em destaque | texto, 1–32 caracteres, uma linha |
| `about.facts.servicos.label` | Empresa › Características (fixas: 6) › Característica 03 › Rótulo | texto, 1–24 caracteres, uma linha |
| `about.facts.servicos.value` | Empresa › Características (fixas: 6) › Característica 03 › Valor em destaque | texto, 1–32 caracteres, uma linha |
| `about.facts.ciclo.label` | Empresa › Características (fixas: 6) › Característica 04 › Rótulo | texto, 1–24 caracteres, uma linha |
| `about.facts.ciclo.value` | Empresa › Características (fixas: 6) › Característica 04 › Valor em destaque | texto, 1–32 caracteres, uma linha |
| `about.facts.motores.label` | Empresa › Características (fixas: 6) › Característica 05 › Rótulo | texto, 1–24 caracteres, uma linha |
| `about.facts.motores.value` | Empresa › Características (fixas: 6) › Característica 05 › Valor em destaque | texto, 1–32 caracteres, uma linha |
| `about.facts.contato.label` | Empresa › Características (fixas: 6) › Característica 06 › Rótulo | texto, 1–24 caracteres, uma linha |
| `about.facts.contato.value` | Empresa › Características (fixas: 6) › Característica 06 › Valor em destaque | texto, 1–32 caracteres, uma linha |

#### `services` — Serviços

| Caminho | Campo | Regra |
| ------- | ----- | ----- |
| `services.eyebrow` | Serviços › Rótulo | texto, 1–40 caracteres, uma linha |
| `services.title` | Serviços › Título (parte leve) | texto, 1–60 caracteres, uma linha |
| `services.titleAccent` | Serviços › Título (parte em destaque; pode ficar vazio) | texto, 0–40 caracteres, uma linha |
| `services.intro` | Serviços › Introdução | texto, 1–220 caracteres, uma linha |
| `services.cta` | Serviços › Botão | texto, 1–32 caracteres, uma linha |
| `services.items.automacao-industrial.title` | Serviços › Lista de serviços (fixa: 21 itens) › Serviço 01 › Nome do serviço | texto, 1–50 caracteres, uma linha |
| `services.items.automacao-cag-hvac.title` | Serviços › Lista de serviços (fixa: 21 itens) › Serviço 02 › Nome do serviço | texto, 1–50 caracteres, uma linha |
| `services.items.automacao-subestacoes.title` | Serviços › Lista de serviços (fixa: 21 itens) › Serviço 03 › Nome do serviço | texto, 1–50 caracteres, uma linha |
| `services.items.sistemas-scada.title` | Serviços › Lista de serviços (fixa: 21 itens) › Serviço 04 › Nome do serviço | texto, 1–50 caracteres, uma linha |
| `services.items.clp-plc-ihm.title` | Serviços › Lista de serviços (fixa: 21 itens) › Serviço 05 › Nome do serviço | texto, 1–50 caracteres, uma linha |
| `services.items.inversores-frequencia.title` | Serviços › Lista de serviços (fixa: 21 itens) › Serviço 06 › Nome do serviço | texto, 1–50 caracteres, uma linha |
| `services.items.instrumentacao-industrial.title` | Serviços › Lista de serviços (fixa: 21 itens) › Serviço 07 › Nome do serviço | texto, 1–50 caracteres, uma linha |
| `services.items.redes-industriais.title` | Serviços › Lista de serviços (fixa: 21 itens) › Serviço 08 › Nome do serviço | texto, 1–50 caracteres, uma linha |
| `services.items.fibra-optica-industrial.title` | Serviços › Lista de serviços (fixa: 21 itens) › Serviço 09 › Nome do serviço | texto, 1–50 caracteres, uma linha |
| `services.items.paineis-eletricos-automacao.title` | Serviços › Lista de serviços (fixa: 21 itens) › Serviço 10 › Nome do serviço | texto, 1–50 caracteres, uma linha |
| `services.items.retrofit-modernizacao.title` | Serviços › Lista de serviços (fixa: 21 itens) › Serviço 11 › Nome do serviço | texto, 1–50 caracteres, uma linha |
| `services.items.manutencao-preventiva-corretiva.title` | Serviços › Lista de serviços (fixa: 21 itens) › Serviço 12 › Nome do serviço | texto, 1–50 caracteres, uma linha |
| `services.items.termografia-inspecoes.title` | Serviços › Lista de serviços (fixa: 21 itens) › Serviço 13 › Nome do serviço | texto, 1–50 caracteres, uma linha |
| `services.items.eficiencia-energetica.title` | Serviços › Lista de serviços (fixa: 21 itens) › Serviço 14 › Nome do serviço | texto, 1–50 caracteres, uma linha |
| `services.items.projetos-engenharia.title` | Serviços › Lista de serviços (fixa: 21 itens) › Serviço 15 › Nome do serviço | texto, 1–50 caracteres, uma linha |
| `services.items.laudos-documentacao.title` | Serviços › Lista de serviços (fixa: 21 itens) › Serviço 16 › Nome do serviço | texto, 1–50 caracteres, uma linha |
| `services.items.comissionamento-startup.title` | Serviços › Lista de serviços (fixa: 21 itens) › Serviço 17 › Nome do serviço | texto, 1–50 caracteres, uma linha |
| `services.items.monitoramento-remoto-telemetria.title` | Serviços › Lista de serviços (fixa: 21 itens) › Serviço 18 › Nome do serviço | texto, 1–50 caracteres, uma linha |
| `services.items.integracao-sistemas.title` | Serviços › Lista de serviços (fixa: 21 itens) › Serviço 19 › Nome do serviço | texto, 1–50 caracteres, uma linha |
| `services.items.treinamento-suporte.title` | Serviços › Lista de serviços (fixa: 21 itens) › Serviço 20 › Nome do serviço | texto, 1–50 caracteres, uma linha |
| `services.items.rebobinagem-motores.title` | Serviços › Lista de serviços (fixa: 21 itens) › Serviço 21 › Nome do serviço | texto, 1–50 caracteres, uma linha |

#### `approach` — Abordagem

| Caminho | Campo | Regra |
| ------- | ----- | ----- |
| `approach.eyebrow` | Abordagem › Rótulo | texto, 1–40 caracteres, uma linha |
| `approach.title` | Abordagem › Título (parte leve) | texto, 1–60 caracteres, uma linha |
| `approach.titleAccent` | Abordagem › Título (parte em destaque; pode ficar vazio) | texto, 0–40 caracteres, uma linha |
| `approach.text` | Abordagem › Texto de apresentação | texto, 1–240 caracteres, uma linha |
| `approach.items.ciclo-completo.title` | Abordagem › Itens (fixos: 4) › Item 01 › Título do item | texto, 1–40 caracteres, uma linha |
| `approach.items.ciclo-completo.text` | Abordagem › Itens (fixos: 4) › Item 01 › Texto | texto, 1–200 caracteres, uma linha |
| `approach.items.visao-integrada.title` | Abordagem › Itens (fixos: 4) › Item 02 › Título do item | texto, 1–40 caracteres, uma linha |
| `approach.items.visao-integrada.text` | Abordagem › Itens (fixos: 4) › Item 02 › Texto | texto, 1–200 caracteres, uma linha |
| `approach.items.modernizacao.title` | Abordagem › Itens (fixos: 4) › Item 03 › Título do item | texto, 1–40 caracteres, uma linha |
| `approach.items.modernizacao.text` | Abordagem › Itens (fixos: 4) › Item 03 › Texto | texto, 1–200 caracteres, uma linha |
| `approach.items.registro-tecnico.title` | Abordagem › Itens (fixos: 4) › Item 04 › Título do item | texto, 1–40 caracteres, uma linha |
| `approach.items.registro-tecnico.text` | Abordagem › Itens (fixos: 4) › Item 04 › Texto | texto, 1–200 caracteres, uma linha |

#### `area` — Área de atuação

| Caminho | Campo | Regra |
| ------- | ----- | ----- |
| `area.eyebrow` | Área de atuação › Rótulo | texto, 1–40 caracteres, uma linha |
| `area.title` | Área de atuação › Título (parte em branco) | texto, 1–40 caracteres, uma linha |
| `area.titleAccent` | Área de atuação › Título (parte em dourado; pode ficar vazio) | texto, 0–30 caracteres, uma linha |
| `area.text` | Área de atuação › Texto | texto, 1–260 caracteres, uma linha |
| `area.cta` | Área de atuação › Botão | texto, 1–32 caracteres, uma linha |

#### `contact` — Contato

| Caminho | Campo | Regra |
| ------- | ----- | ----- |
| `contact.eyebrow` | Contato › Rótulo | texto, 1–40 caracteres, uma linha |
| `contact.title` | Contato › Título (parte leve) | texto, 1–80 caracteres, uma linha |
| `contact.titleAccent` | Contato › Título (parte em destaque; pode ficar vazio) | texto, 0–50 caracteres, uma linha |
| `contact.text` | Contato › Texto | texto, 1–220 caracteres, uma linha |
| `contact.cta` | Contato › Botão | texto, 1–32 caracteres, uma linha |
| `contact.whatsappLabel` | Contato › Rótulo do número | texto, 1–20 caracteres, uma linha |
| `contact.image` | Contato › Imagem da faixa do contato | imagem: webp/jpg/png/avif, até 600 KB, 1600×600 a 4000×4000 px; alt até 160 |

#### `notFound` — Página 404

| Caminho | Campo | Regra |
| ------- | ----- | ----- |
| `notFound.eyebrow` | Página 404 › Rótulo | texto, 1–30 caracteres, uma linha |
| `notFound.title` | Página 404 › Título | texto, 1–50 caracteres, uma linha |
| `notFound.text` | Página 404 › Texto | texto, 1–160 caracteres, uma linha |
| `notFound.cta` | Página 404 › Link para a página inicial | texto, 1–40 caracteres, uma linha |

#### `theme` — Tema

| Caminho | Campo | Regra |
| ------- | ----- | ----- |
| `theme.colors.background` | Tema › Cores (chaves fixas, formato #RRGGBB) › Fundo da página | cor `#RRGGBB` + contraste |
| `theme.colors.surface` | Tema › Cores (chaves fixas, formato #RRGGBB) › Superfície (cartões, campos) | cor `#RRGGBB` + contraste |
| `theme.colors.surfaceAlt` | Tema › Cores (chaves fixas, formato #RRGGBB) › Superfície alternativa (faixas, imagens pendentes) | cor `#RRGGBB` + contraste |
| `theme.colors.text` | Tema › Cores (chaves fixas, formato #RRGGBB) › Texto principal | cor `#RRGGBB` + contraste |
| `theme.colors.textMuted` | Tema › Cores (chaves fixas, formato #RRGGBB) › Texto secundário | cor `#RRGGBB` + contraste |
| `theme.colors.border` | Tema › Cores (chaves fixas, formato #RRGGBB) › Divisórias | cor `#RRGGBB` + contraste |
| `theme.colors.borderStrong` | Tema › Cores (chaves fixas, formato #RRGGBB) › Bordas de controles | cor `#RRGGBB` + contraste |
| `theme.colors.primary` | Tema › Cores (chaves fixas, formato #RRGGBB) › Cor de ação (botões, selo e detalhes) | cor `#RRGGBB` + contraste |
| `theme.colors.onPrimary` | Tema › Cores (chaves fixas, formato #RRGGBB) › Texto sobre a cor de ação | cor `#RRGGBB` + contraste |
| `theme.colors.accent` | Tema › Cores (chaves fixas, formato #RRGGBB) › Destaque no claro (títulos, ícones, foco) | cor `#RRGGBB` + contraste |
| `theme.colors.dark` | Tema › Cores (chaves fixas, formato #RRGGBB) › Fundo de destaque (hero, atuação, rodapé) | cor `#RRGGBB` + contraste |
| `theme.colors.onDark` | Tema › Cores (chaves fixas, formato #RRGGBB) › Texto sobre fundo escuro | cor `#RRGGBB` + contraste |
| `theme.colors.onDarkMuted` | Tema › Cores (chaves fixas, formato #RRGGBB) › Texto secundário sobre fundo escuro | cor `#RRGGBB` + contraste |
| `theme.colors.accentOnDark` | Tema › Cores (chaves fixas, formato #RRGGBB) › Destaque sobre fundo escuro (títulos, foco) | cor `#RRGGBB` + contraste |

<!-- inventario:fim -->
<!-- prettier-ignore-end -->

## 7. Testes relacionados

- `tests/validate.test.mjs`: tipos, limites, propriedades desconhecidas, URLs de imagem inválidas, cores, contraste.
- `tests/content-layer.test.mjs`:
  - procedência de todo texto exibido;
  - limites no máximo exato e no máximo + 1 para **todos** os campos;
  - formatos de imagem por campo;
  - migração;
  - defaults;
  - rascunho local (incluindo armazenamento indisponível ou cheio);
  - exportação e importação;
  - leitura de dimensões e segurança de SVG;
  - verificação dos arquivos de imagem no build;
  - inventário em dia.

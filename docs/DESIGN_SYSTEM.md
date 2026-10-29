# Sistema visual — Conecta Soluções

Versão 3.1 · 29/10/2026 (redesign estrutural; paleta da marca azul `#086EF7` e verde-água `#1AB3AA`). Arquivos: `src/css/tokens.css`, `fonts.css`, `base.css`, `layout.css`,
`components.css`, `sections.css`, `admin.css`, `src/partials/geometry.html` e `content/content.json`
(`theme.colors`).

A versão 2 (redesign editorial: Cormorant Garamond, oliva e grafite, arestas retas) foi substituída: mudava cores e
fontes, mas mantinha a mesma estrutura de página. O histórico está em `PROJECT_AUDIT.md`.

## 1. Direção de arte

**Adaptação da composição da landing page Merlot Residence (Behance) à Conecta Soluções.** A referência foi usada
**só como layout**: proporções, posicionamentos, hierarquia e linguagem gráfica, a partir das capturas de tela
enviadas pelo cliente. Nenhum asset, texto ou imagem da referência foi copiado. Textos, fotos e informações são da
Conecta Soluções ou de bancos de domínio público (`CREDITOS_IMAGENS.md`).

- **Ritmo da página:** faixas horizontais alternando o **azul da marca** (hero, atuação, contato, rodapé) e **bege**
  (empresa, serviços, abordagem), com títulos em dois pesos e botões **verde-água** em cápsula. Na v3 original eram
  vinho e dourado, como na referência; o cliente pediu trocar vinho → `#086EF7` e marrom/dourado → `#1AB3AA`.
- **Como "residencial" vira "industrial":** o edifício da referência vira uma estrutura de subestação; a família em
  primeiro plano vira uma sala elétrica (sem pessoas inventadas); os interiores do mosaico viram instalações
  (supervisão, proteção, painéis, transformadores, motores); "Localização" vira a rosa dos ventos da Região Norte;
  o formulário final vira um painel de WhatsApp (o site não tem backend).
- **Limites mantidos:** sem gradientes, `backdrop-filter`, carrosséis, contadores ou números inventados. A textura da
  referência é substituída por planos geométricos SVG de baixo contraste (teste automatizado bloqueia gradientes).
- **Marca:** logotipo oficial (`logotipo-site.png`, cópia reduzida e não editada de `logotipo.png`) no **cabeçalho
  claro**, onde o texto azul-marinho tem leitura; favicon gerado de `icone.png`. No hero azul não há símbolo: a
  metade azul dele desapareceria no fundo, e a marca não pode ser recolorida (CLAUDE.md §2).

## 2. Cores

Três camadas:

1. **Primitivos editáveis** (`content.json → theme.colors`), emitidos como `--color-*` em `css/theme.css`.
2. **Cores de estado fixas** (`tokens.css`), não editáveis.
3. **Papéis semânticos** (`--bg`, `--fg`, `--heading-fg`, `--heading-accent`, `--action-*`, `--focus-color`…),
   redefinidos em `.theme-dark`. Os componentes usam **somente** esta camada.

| Token (`theme.colors`) | Valor     | Papel                                                                          |
| ---------------------- | --------- | ------------------------------------------------------------------------------ |
| `background`           | `#F2EDE3` | Bege claro: fundo da página e do cabeçalho                                     |
| `surface`              | `#FBF8F2` | Cabeçalho após rolar, menu móvel, painel, campos                               |
| `surfaceAlt`           | `#E8DFD0` | Bege mais fechado: faixa de Serviços e cartão do Contato                       |
| `text`                 | `#00142C` | Texto principal (azul-marinho do texto do logotipo)                            |
| `textMuted`            | `#4A5568` | Texto secundário                                                               |
| `border`               | `#DDD3C4` | Filetes                                                                        |
| `borderStrong`         | `#7A8494` | Bordas de controles (≥ 3:1)                                                    |
| `primary`              | `#1AB3AA` | **Verde-água** da marca: botões, selo, placas numeradas e filetes decorativos  |
| `onPrimary`            | `#00142C` | Texto sobre o verde-água (branco daria só 2,6:1)                               |
| `accent`               | `#0759C9` | Azul dos títulos e ícones no claro e anel de foco (`#086EF7` dá 3,9:1 no bege) |
| `dark`                 | `#086EF7` | **Azul da marca**: hero, atuação, cartões, painel do contato, rodapé           |
| `onDark`               | `#FFFFFF` | Texto sobre o azul                                                             |
| `onDarkMuted`          | `#FFFFFF` | Texto secundário sobre o azul (nenhum tom mais suave atinge 4,5:1)             |
| `accentOnDark`         | `#FFFFFF` | Destaque dos títulos e foco no azul (verde-água sobre azul dá só 1,8:1)        |

As duas cores pedidas foram usadas **exatamente** onde passam no contraste AA: `#086EF7` como fundo (com branco,
4,58:1) e `#1AB3AA` como fundo de botão e selo (com azul-marinho, 7,1:1) e em elementos decorativos. Onde elas não
passam como **texto**, entram tons equivalentes: `#0759C9` para azul sobre bege e branco (em peso 600) para o destaque
dos títulos sobre o azul.

| Par (validado no build, nos testes e no painel)           | Mínimo | Atual              |
| --------------------------------------------------------- | ------ | ------------------ |
| `text` sobre `background` / `surface` / `surfaceAlt`      | 4,5    | 15,8 / 17,4 / 14,0 |
| `textMuted` sobre `background` / `surface` / `surfaceAlt` | 4,5    | 6,5 / 7,1 / 5,7    |
| `accent` sobre `background` / `surface` / `surfaceAlt`    | 4,5    | 5,5 / 6,0 / 4,8    |
| `onPrimary` sobre `primary`                               | 4,5    | 7,1                |
| `onDark` / `onDarkMuted` / `accentOnDark` sobre `dark`    | 4,5    | 4,6                |
| `onDark` sobre `accent` (ícones)                          | 3      | 6,4                |
| `borderStrong` sobre `background` / `surface`             | 3      | 3,2 / 3,6          |

**A cor nunca é o único indicador:** a parte em destaque dos títulos também muda de peso (300 → 600); links em texto
são sublinhados; erro de campo tem borda grossa, ícone e texto.

## 3. Tipografia

| Papel             | Família                | Configuração                                         | Arquivo |
| ----------------- | ---------------------- | ---------------------------------------------------- | ------- |
| Títulos, números  | **Outfit** (variável)  | Parte leve 300, destaque 600; selo 700 em caixa alta | 32 KB   |
| Texto e interface | **Manrope** (variável) | 400–700; rótulos em caixa alta com tracking 0,2em    | 25 KB   |
| Códigos (painel)  | Mono do sistema        | Sem arquivo                                          | —       |

- **Por que:** a Outfit é a sans geométrica de traço fino mais próxima da voz da referência; a Manrope mantém a
  leitura confortável no corpo. Ambas OFL 1.1, auto-hospedadas (CSP `font-src 'self'`), com `preload` e
  `font-display: swap`. Total de 57 KB (antes 102 KB).
- **Títulos em duas partes:** `título` + `<span class="title-accent">destaque</span>`. No claro, ambos em azul, o
  destaque mais pesado; no escuro, ambos brancos, o destaque mais pesado. Destaque vazio some (`:empty`).
- **Escala** (360 → 1440 px): título do hero 36–62 px; `--text-display` 44–92 px (Atuação); `--text-3xl` 32–56 px
  (`h2`); `--text-xl` 20–26 px (títulos dos cartões); corpo 16–17 px.

## 4. Espaço, grid e containers

- **Espaço** (base 4 px): `--space-1` … `--space-11`. Entre seções: `--space-section` (80–160 px).
- **Container:** 80rem (1280 px) + `--gutter` (20–72 px). O hero e o mosaico fogem do container quando a composição
  pede (o mosaico encosta na borda esquerda).
- **Breakpoints:** `sm` 40em (640 px), `md` 64em (1024 px). Abaixo de 64em as composições de duas colunas empilham.

## 5. Formas, profundidade e movimento

- **Raios:** botões em cápsula (`--radius-button`); imagens do mosaico 4–14 px; cartões 22 px; controles do painel
  6 px.
- **Sombras:** só onde há sobreposição real (foto em primeiro plano, selo, cartão do Contato), menu móvel e diálogos.
- **Movimento** (só com `prefers-reduced-motion: no-preference`): entrada escalonada do texto do hero; as camadas da
  composição surgem em sequência (foto → primeiro plano → selo, sem deslocamento); demais blocos acompanham a
  rolagem (`animation-timeline: view()`), sem JavaScript e sem estado oculto em navegadores sem suporte.
- **Cabeçalho:** claro (bege), com o logotipo oficial, fixo; ao rolar ganha superfície e sombra leve, sem mudar de altura (teste).

## 6. Seções (`src/css/sections.css`)

| Seção     | Fundo        | Composição                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero      | Azul         | Desktop: texto em 45% (nome, rótulo, título em duas cores, texto, botão). À direita, composição quadrada em camadas: (1) geometria diagonal SVG, (2) moldura verde-água inclinada, (3) foto principal em recorte vertical com aresta diagonal, (4) foto em primeiro plano no canto inferior direito, (5) selo circular verde-água. Celular/tablet: mesma composição, proporcional, abaixo do texto (unidades `cqi`) |
| Empresa   | Bege         | Mosaico 4 × 2 de recortes 3:4 encostado à esquerda (49%); à direita (51%) rótulo, título azul em dois pesos, texto, 6 características em grade 3 × 2 (2 colunas no celular) com ícone branco em quadrado azul, botão verde-água                                                                                                                                                                                     |
| Serviços  | Bege fechado | Título centralizado em dois pesos; 21 serviços com número em círculo azul, em 3/2/1 colunas; botão centralizado                                                                                                                                                                                                                                                                                                     |
| Abordagem | Bege         | Título e texto à esquerda; 4 cartões azuis em 2 × 2, cada um com placa numerada verde-água (no lugar da foto da referência), título e texto brancos                                                                                                                                                                                                                                                                 |
| Atuação   | Azul         | Geometria diagonal; título display branco em dois pesos, texto e botão à esquerda; rosa dos ventos em filetes verde-água à direita                                                                                                                                                                                                                                                                                  |
| Contato   | Foto + azul  | Faixa fotográfica panorâmica (12:5; 3:2 no celular); cartão bege sobreposto com título e texto à esquerda e painel azul com o número e o botão do WhatsApp à direita                                                                                                                                                                                                                                                |
| Rodapé    | Azul         | Nome, área, região, WhatsApp e linha legal                                                                                                                                                                                                                                                                                                                                                                          |

## 7. Imagens

Molduras espelhadas em `src/lib/schema.js` (`frames`, usadas na prévia do painel). Arquivos em `src/assets/img/`,
WebP, dimensionados para a exibição em 2×.

| Imagem                   | Moldura                | Arquivo atual     | Mínimo   |
| ------------------------ | ---------------------- | ----------------- | -------- |
| Destaque principal       | ≈ 1:2, aresta diagonal | 720×1440, 136 KB  | 600×1200 |
| Destaque, primeiro plano | 4:5                    | 600×750, 35 KB    | 600×750  |
| Mosaico (8)              | 3:4                    | 480×640, 19–64 KB | 480×640  |
| Faixa do Contato         | 12:5 (3:2 no celular)  | 1920×800, 240 KB  | 1600×600 |
| Logotipo (cabeçalho)     | altura 30–44 px        | 375×112, 32 KB    | 120×32   |

- O hero carrega com `loading="eager"` e a foto principal com `fetchpriority="high"`; mosaico e faixa, `lazy`.
- Texto alternativo obrigatório em todas as imagens (logotipo: "Conecta Soluções").
- Política: preferir fotos reais da Conecta com autorização; até lá, imagens de domínio público/CC0 genéricas, sem
  marcas, clientes ou rostos identificáveis, registradas em `CREDITOS_IMAGENS.md`.

## 8. Pendências

- Fotografias reais de serviços da Conecta Soluções para substituir as ilustrativas.
- Versão do logotipo horizontal para fundo escuro (texto claro), se o cliente quiser usá-lo inteiro no cabeçalho.
- Validação, pelo cliente, dos textos novos: selo ("Atendimento · Região Norte · do Brasil"), as 6 características e
  os botões das seções.

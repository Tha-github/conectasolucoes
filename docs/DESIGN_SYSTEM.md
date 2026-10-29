# Sistema visual — Conecta Soluções

Versão 2 · 29/10/2026 (redesign editorial). Arquivos: `src/css/tokens.css`, `fonts.css`, `base.css`, `layout.css`,
`components.css`, `sections.css`, `admin.css` e `content/content.json` (`theme.colors`).

A versão 1 (27/10/2026: Archivo expandida, IBM Plex, destaque cobre) foi substituída. O histórico está em
`PROJECT_AUDIT.md`.

## 1. Direção de arte

**Ideia central: apresentação editorial de arquitetura aplicada à engenharia.** A referência é a linguagem das landing
pages de empreendimentos de alto padrão (Merlot Residence): fotografia como protagonista, serifa editorial em grande
escala, tons neutros e naturais, composição assimétrica e muito espaço negativo.

- **Referência.** A página do Behance recusa acesso automatizado (HTTP 403), então **nenhum elemento dela foi visto
  nem reproduzido**. A direção segue a especificação descrita pelo cliente: paleta off-white, bege, grafite e verde
  oliva, Cormorant Garamond com Manrope, grid editorial e transições suaves.
- **Como "residencial premium" vira "industrial premium":**
  - fotografias técnicas (painéis, motores, instrumentação) no lugar de interiores;
  - um só destaque, um latão discreto (`accent`), usado em filetes e numeração;
  - verde oliva profundo para ações;
  - numerais em itálico serifado em vez de ícones;
  - arestas retas (raio 0) e quase nenhuma sombra.
- **Evitado de propósito:** gradientes, glassmorphism/`backdrop-filter`, parallax, carrosséis, cartões flutuantes,
  selos e contadores. Um teste automatizado bloqueia gradientes, `backdrop-filter`, `@import` e URLs externas no CSS.
- **Logotipo:** ainda não recebido. O cabeçalho mostra "Conecta Soluções" em Cormorant, sem desenho de marca.

## 2. Cores

Há três camadas:

1. **Primitivos editáveis** (`content.json → theme.colors`), emitidos como `--color-*` em `css/theme.css`.
2. **Cores de estado fixas** (`tokens.css`), não editáveis porque carregam significado funcional.
3. **Papéis semânticos** (`--bg`, `--fg`, `--line`, `--action-*`, `--focus-color`…), redefinidos em `.theme-dark`. Os
   componentes usam **somente** esta camada.

### Paleta

| Token (`theme.colors`) | Valor     | Papel                                                    |
| ---------------------- | --------- | -------------------------------------------------------- |
| `background`           | `#F5F3EE` | Off-white quente: fundo da página                        |
| `surface`              | `#FBFAF7` | Cabeçalho após rolar, menu móvel, campos e grupos        |
| `surfaceAlt`           | `#E9E5DD` | Bege claro: faixa da Abordagem, prancha de imagem        |
| `text`                 | `#242722` | Grafite: texto principal                                 |
| `textMuted`            | `#5C5E55` | Texto secundário (o `#77786F` da referência dá só 4,0:1) |
| `border`               | `#D7D4CB` | Bege acinzentado: filetes decorativos                    |
| `borderStrong`         | `#77786F` | Cinza oliva: bordas de controles (≥ 3:1)                 |
| `primary`              | `#343E35` | Verde oliva profundo: botão principal e anel de foco     |
| `onPrimary`            | `#F5F3EE` | Texto sobre `primary`                                    |
| `accent`               | `#6B5A3E` | Latão discreto: filetes dos rótulos, numeração           |
| `dark`                 | `#252B26` | Verde escuro: faixa de Atuação e rodapé                  |
| `onDark`               | `#F5F3EE` | Texto sobre `dark`                                       |
| `onDarkMuted`          | `#B3B2A7` | Texto secundário sobre `dark`                            |
| `accentOnDark`         | `#C9BFA6` | Destaque e anel de foco sobre `dark`                     |

O "grafite" `#242722` da referência é o `text`; o "verde oliva profundo" `#343E35` é o `primary`; o "verde escuro"
`#252B26` é o `dark`. Todas continuam editáveis no painel.

| Estado (fixo)     | Valor     | Uso                        |
| ----------------- | --------- | -------------------------- |
| `--color-error`   | `#A3261C` | Mensagens e bordas de erro |
| `--color-success` | `#1E6B3B` | Confirmações               |
| `--color-warning` | `#8A5B00` | Avisos (painel)            |

### Contraste (verificado no build, nos testes e no painel)

`src/lib/schema.js → CONTRAST_PAIRS`. Uma cor editada no painel que quebre algum par é **rejeitada**.

| Par                                                       | Mínimo | Atual              |
| --------------------------------------------------------- | ------ | ------------------ |
| `text` sobre `background` / `surface` / `surfaceAlt`      | 4,5    | 13,6 / 14,5 / 12,0 |
| `textMuted` sobre `background` / `surface` / `surfaceAlt` | 4,5    | 5,9 / 6,3 / 5,2    |
| `accent` sobre `background` / `surface`                   | 4,5    | 6,0 / 6,4          |
| `onPrimary` sobre `primary`                               | 4,5    | 10,0               |
| `onDark` / `onDarkMuted` / `accentOnDark` sobre `dark`    | 4,5    | 13,0 / 6,8 / 7,9   |
| `borderStrong` sobre `background` / `surface`             | 3      | 4,0 / 4,3          |
| `primary` sobre `background` / `surface` (foco)           | 3      | 10,0 / 10,7        |
| Cores de estado sobre `background` / `surface`            | 4,5    | ≥ 5,3              |

**A cor nunca é o único indicador:** links em texto sempre sublinhados; item ativo da navegação com sublinhado mais
grosso; erro de campo com borda mais grossa, ícone "!" e texto; campo alterado no painel com o botão "Restaurar padrão"
e o contador da área em texto.

## 3. Tipografia

| Papel             | Família                           | Configuração                                                         | Arquivo |
| ----------------- | --------------------------------- | -------------------------------------------------------------------- | ------- |
| Títulos           | **Cormorant Garamond** (variável) | Peso 300–500, tracking negativo, entrelinha 0,98–1,04                | 38 KB   |
| Numerais, ênfase  | **Cormorant Garamond** itálico    | Numeração 01–21 e 01–04, texto alternativo das pranchas              | 39 KB   |
| Texto e interface | **Manrope** (variável)            | Peso 400–700; rótulos e botões em caixa alta com tracking 0,14–0,2em | 25 KB   |
| Códigos (painel)  | Mono do sistema                   | `ui-monospace`, Consolas — sem arquivo                               | —       |

- **Por que:** a Cormorant dá a voz editorial e "de arquitetura" pedida, com contraste alto entre hastes. A Manrope é
  geométrica, neutra e muito legível em corpo pequeno e em caixa alta espaçada. Dois sistemas bem diferentes evitam
  variações de peso desnecessárias.
- **Privacidade e licença:** auto-hospedadas (SIL OFL 1.1, licenças copiadas para `assets/fonts/`). A CSP
  `font-src 'self'` impede Google Fonts ou qualquer terceiro.
- **Performance:** 102 KB em woff2 (antes 147 KB), só subconjunto latino. A Cormorant normal e a Manrope recebem
  `preload`; o itálico carrega sob demanda.
- **Fallback:** `font-display: swap`; Garamond/Times/Georgia para títulos e `system-ui` para texto.

### Escala fluida (360 → 1440 px)

| Token / uso                | Faixa      | Uso                                         |
| -------------------------- | ---------- | ------------------------------------------- |
| `--text-display`           | 52–112 px  | Título da faixa de Atuação                  |
| título do hero (`clamp`)   | 44–92 px   | `h1` do hero (metade da largura no desktop) |
| `--text-4xl`               | 44–96 px   | `h1` genérico, título do Contato            |
| `--text-3xl`               | 38–70 px   | `h2`, nome no rodapé                        |
| `--text-2xl`               | 28–44 px   | `h3`, número do WhatsApp, grupos do painel  |
| `--text-xl`                | 22–30 px   | Títulos menores                             |
| `--text-lg`                | 17–20 px   | `.lead`, texto da Empresa                   |
| `--text-base`              | 16–17 px   | Corpo                                       |
| `--text-xs` / `--text-2xs` | 13 / 11 px | Botões / rótulos em caixa alta              |

Entrelinha 1,7 no corpo; medida de leitura 62ch; `text-wrap: balance` nos títulos e `pretty` nos parágrafos.

## 4. Espaço, grid e containers

- **Espaço** (base 4 px): `--space-1` … `--space-11` (160 px). Entre seções: `--space-section`, de 80 a 160 px.
- **Containers:** `.container` 80rem (1280 px), `--narrow` 48rem, `--wide` 96rem. Margem lateral (`--gutter`) de 20 a
  72 px.
- **Grid:** 4 colunas no celular, 8 a partir de 40em, 12 a partir de 64em.
- **Breakpoints:** `sm` 40em (640px), `md` 64em (1024px), `lg` 80em (1280px).

## 5. Formas, profundidade e movimento

- **Raios:** 0 em botões, campos e cartões (`--radius-control`). Pílula só no contador do painel.
- **Bordas:** filetes de 1 px; 2 px para ênfase (erro, item ativo).
- **Sombras:** só a sombra leve do cabeçalho após rolar, do menu móvel e dos diálogos do painel.
- **Animações** (todas dentro de `@media (prefers-reduced-motion: no-preference)`, verificado por teste):
  - entrada do texto do hero (opacidade + 12 px, 700 ms, escalonada em 80 ms);
  - fotografia do hero: opacidade e escala de 1,04 → 1 em 1,4 s, dentro da moldura (sem deslocamento);
  - surgimento dos blocos ao rolar (`animation-timeline: view()`), só com suporte nativo; sem suporte, o conteúdo
    aparece direto (sem JavaScript nem estado inicial oculto);
  - abertura do menu móvel (opacidade + 8 px).
- **Microinterações:** botão principal escurece; secundário inverte (fundo grafite); seta do ícone desloca 3 px;
  links da navegação ganham sublinhado. Hover só em `@media (hover: hover)` (teste).
- **Cabeçalho ao rolar:** `js/header.js` alterna `data-scrolled`. No topo, sem filete; ao rolar, superfície sólida,
  filete e sombra leve. A altura nunca muda (teste), então não há salto de layout. Sem JavaScript, fica no estado
  sólido.
- **`prefers-reduced-motion: reduce`:** nenhuma animação é declarada, as durações vão a zero e uma regra global anula
  transições e rolagem suave.

## 6. Componentes-base

| Componente         | Classes                                                         | Observações                                                                                                                    |
| ------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Botão              | `.button` + `--primary` / `--secondary` / `--sm` / `--lg`       | Caixa alta, tracking 0,14em, 52 px (44 px no `--sm`), raio 0                                                                   |
| Rótulo editorial   | `.eyebrow`                                                      | Manrope 11 px, caixa alta 0,2em, precedido por filete em `accent`                                                              |
| Numeração          | `.index`, contadores CSS de serviços e abordagem                | Cormorant itálico; decorativa (a `<ol>` já informa a posição)                                                                  |
| Navegação          | `.site-nav__link`                                               | Caixa alta no desktop; Cormorant 28 px no menu móvel                                                                           |
| Mídia              | `.media`, `.media__img`, `.media-fallback`                      | Proporção fixa (sem CLS); foco por classe (CSP sem estilo inline)                                                              |
| Prancha (fallback) | `.media-fallback`                                               | Imagem ausente: tom `surfaceAlt`, moldura interna fina e o texto alternativo em itálico — reserva o lugar sem simular uma foto |
| Campo              | `.field`, `.field__control`, `.field__message--error/--success` | Usado no painel                                                                                                                |
| Cabeçalho/rodapé   | `.site-header`, `.brand`, `.site-footer` (`theme-dark`)         | Logo ausente → nome em texto                                                                                                   |

- Alvo mínimo de toque 44 px. Foco: anel sólido de 3 px com afastamento de 3 px, em `primary` no claro e
  `accentOnDark` no escuro.
- **Menu em telas pequenas (< 64em):** padrão _disclosure_ (`aria-expanded`, Escape fecha e devolve o foco, clicar
  fora fecha). Só é recolhido sob `@media (scripting: enabled)`; sem JavaScript os links aparecem em linha.

### Seções (`src/css/sections.css`)

| Seção     | Composição                                                                                                                                                                                                 |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero      | Desktop: texto na metade esquerda; fotografia sangrando até a borda direita na altura da primeira dobra (linhas nomeadas do grid, sem `100vw`). Celular 4:5 e tablet 3:2, de ponta a ponta abaixo do texto |
| Empresa   | Retrato 4:5 em 5 colunas; texto a partir da 7ª, ancorado na base (3:2 no tablet)                                                                                                                           |
| Serviços  | Cabeçalho fixo (sticky) em 4 colunas à esquerda; índice 01–21 em duas colunas à direita, com filetes                                                                                                       |
| Abordagem | Faixa `surfaceAlt`; 4 itens com numerais itálicos grandes, em 1, 2 ou 4 colunas                                                                                                                            |
| Atuação   | `theme-dark`; título em escala display, texto à direita com filete                                                                                                                                         |
| Contato   | Título grande em 7 colunas; botão e número do WhatsApp (Cormorant) em 4 colunas                                                                                                                            |
| Rodapé    | `theme-dark`; nome em escala de título, área e contato, linha legal                                                                                                                                        |

### Painel (`src/css/admin.css`)

Mesmas fontes, tokens e componentes. Cabeçalho discreto com status e ações; **menu lateral** de áreas (≥ 64em) com
contador de campos alterados; editor; **prévia** ao lado (≥ 90em) ou abaixo. No celular, as áreas viram uma faixa
rolável e as ações uma grade 2 × 2.

## 7. Imagens

As molduras de cada imagem também estão em `src/lib/schema.js` (`frames`), usadas na prévia do painel:

| Imagem   | Celular | Tablet | Computador                       |
| -------- | ------- | ------ | -------------------------------- |
| Destaque | 4:5     | 3:2    | altura da primeira dobra (≈ 1:1) |
| Empresa  | 4:5     | 3:2    | 4:5                              |

- **Arquivos:** WebP ou JPEG em `src/assets/img/`, nomes em minúsculas e hífens; lado maior até 2400 px no hero e
  1800 px na Empresa; mire em menos de 300 KB.
- **Texto alternativo:** descreva o que a foto mostra ("Técnico inspecionando painel elétrico com câmera
  termográfica").
- **Política de fotografia:** preferir fotos reais da Conecta com autorização. Na falta delas, banco de imagens com
  licença comercial, **genéricas** (sem marcas, placas, uniformes ou instalações reconhecíveis), sem sugerir clientes ou
  equipe. Registrar fonte, licença e autor em `docs/`.
- **Situação:** nenhuma fotografia foi incluída. Não havia fotos do cliente e os bancos de imagem consultados
  bloquearam acesso automatizado neste ambiente. O layout foi verificado com uma imagem sintética de teste (não
  publicada) em 390, 768, 1440 e 1920 px: sem distorção e com sangria correta.

## 8. Pendências

- Logotipo oficial: revisar `primary`/`accent` a partir dele (o build bloqueia combinações sem contraste) e gerar o
  favicon (hoje o único motivo de "Boas práticas" 96 no Lighthouse).
- Fotografias do hero e da Empresa: é delas que depende a maior parte do efeito premium.

// Schema do conteúdo editável. Define chaves, tipos, limites e ordem.
// Somente o código altera este arquivo; o painel e o content.json apenas
// fornecem valores para as chaves aqui declaradas. Inventário legível em
// docs/CONTENT_SCHEMA.md (gerado por `npm run docs:schema`).
//
// Qualquer mudança incompatível exige incrementar SCHEMA_VERSION e registrar
// uma migração em src/lib/migrate.js.

// v2: imagens ganharam "focus" (enquadramento). Migração em migrate.js.
// v3: redesign estrutural — destaques de título, selo e imagem de detalhe do
// hero, mosaico e características da Empresa, botões e imagem do Contato.
export const SCHEMA_VERSION = 3;

/** Caminhos de imagem aceitos: arquivos versionados em src/assets/img (sem subpastas). */
export const IMAGE_PATH_PATTERN = /^assets\/img\/[a-z0-9][a-z0-9-]*\.(?:webp|jpe?g|png|avif|svg)$/;

/**
 * Enquadramento de imagens (object-position). Lista fechada: vira classe CSS
 * fixa (sem estilo inline, compatível com a CSP).
 */
export const FOCUS_POSITIONS = Object.freeze(['center', 'top', 'bottom', 'left', 'right']);
export const FOCUS_LABELS = Object.freeze({
  center: 'Centro',
  top: 'Topo',
  bottom: 'Base',
  left: 'Esquerda',
  right: 'Direita',
});

export const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/**
 * Serviços na ordem definida pelo cliente (CLAUDE.md §3).
 * O ID é fixo; o título exibido vem do content.json.
 */
export const SERVICE_IDS = Object.freeze([
  'automacao-industrial',
  'automacao-cag-hvac',
  'automacao-subestacoes',
  'sistemas-scada',
  'clp-plc-ihm',
  'inversores-frequencia',
  'instrumentacao-industrial',
  'redes-industriais',
  'fibra-optica-industrial',
  'paineis-eletricos-automacao',
  'retrofit-modernizacao',
  'manutencao-preventiva-corretiva',
  'termografia-inspecoes',
  'eficiencia-energetica',
  'projetos-engenharia',
  'laudos-documentacao',
  'comissionamento-startup',
  'monitoramento-remoto-telemetria',
  'integracao-sistemas',
  'treinamento-suporte',
  'rebobinagem-motores',
]);

/** Itens da seção "Abordagem" (quantidade e ordem fixas). */
export const APPROACH_IDS = Object.freeze(['ciclo-completo', 'visao-integrada', 'modernizacao', 'registro-tecnico']);

/**
 * Mosaico da seção "Empresa": about.image ocupa a 1ª posição e estas 7 imagens
 * as seguintes (quantidade e ordem fixas; o painel só substitui as imagens).
 */
export const GALLERY_IDS = Object.freeze([
  'scada',
  'protecao',
  'paineis',
  'supervisao',
  'transformador',
  'infraestrutura',
  'subestacao',
]);

/** Características da seção "Empresa" (grade 3 × 2; ícones fixos no template). */
export const FACT_IDS = Object.freeze(['area', 'regiao', 'servicos', 'ciclo', 'motores', 'contato']);

/**
 * Inventário de seções da página inicial, na ordem aprovada (PROJECT_AUDIT §9).
 * IDs são âncoras fixas da navegação; verificado em teste.
 */
export const PAGE_SECTIONS = Object.freeze(['inicio', 'sobre', 'servicos', 'abordagem', 'atuacao', 'contato']);

/** Contraste mínimo WCAG 2.x AA: texto (1.4.3) e componentes/foco (1.4.11). */
export const MIN_CONTRAST_TEXT = 4.5;
export const MIN_CONTRAST_UI = 3;

/**
 * Pares [frente, fundo, mínimo] do tema. Validado em testes e no build:
 * uma cor editada que quebre qualquer par é rejeitada.
 */
export const CONTRAST_PAIRS = Object.freeze([
  ['text', 'background', MIN_CONTRAST_TEXT],
  ['text', 'surface', MIN_CONTRAST_TEXT],
  ['text', 'surfaceAlt', MIN_CONTRAST_TEXT],
  ['textMuted', 'background', MIN_CONTRAST_TEXT],
  ['textMuted', 'surface', MIN_CONTRAST_TEXT],
  ['textMuted', 'surfaceAlt', MIN_CONTRAST_TEXT],
  ['accent', 'background', MIN_CONTRAST_TEXT],
  ['accent', 'surface', MIN_CONTRAST_TEXT],
  ['accent', 'surfaceAlt', MIN_CONTRAST_TEXT],
  // Ícones claros sobre os quadrados em destaque (características e serviços).
  ['onDark', 'accent', MIN_CONTRAST_UI],
  ['onPrimary', 'primary', MIN_CONTRAST_TEXT],
  ['onDark', 'dark', MIN_CONTRAST_TEXT],
  ['onDarkMuted', 'dark', MIN_CONTRAST_TEXT],
  ['accentOnDark', 'dark', MIN_CONTRAST_TEXT],
  // Bordas de campos e botões. O anel de foco usa `accent` no claro (já ≥ 4,5
  // acima) e `accentOnDark` no escuro; `primary` é fundo de botão com texto
  // `onPrimary`, então não precisa contrastar com a página.
  ['borderStrong', 'background', MIN_CONTRAST_UI],
  ['borderStrong', 'surface', MIN_CONTRAST_UI],
]);

/**
 * Cores de estado fixas (não editáveis; espelhadas em src/css/tokens.css).
 * Também precisam de contraste de texto sobre os fundos editáveis.
 */
export const STATUS_COLORS = Object.freeze({ error: '#a3261c', success: '#1e6b3b', warning: '#8a5b00' });
export const STATUS_BACKGROUNDS = Object.freeze(['background', 'surface']);

/**
 * @typedef {{ kind: 'text', label: string, minLength: number, maxLength: number, multiline: boolean }} TextField
 * @typedef {{ kind: 'color', label: string }} ColorField
 * @typedef {{ label: string, ratio: string }} ImageFrame  moldura em que a imagem aparece no site (CSS aspect-ratio)
 * @typedef {{
 *   kind: 'image', label: string, formats: string[], maxBytes: number,
 *   minWidth: number, minHeight: number, maxWidth: number, maxHeight: number,
 *   altRequired: boolean, altMaxLength: number,
 *   focal: boolean, frames: ImageFrame[], target: { width: number, height: number }
 * }} ImageField
 *   focal: aceita enquadramento (focus); frames: molduras para a prévia do painel;
 *   target: caixa máxima da imagem otimizada pelo painel (proporção preservada).
 * @typedef {{ kind: 'object', label: string, fields: Record<string, Field> }} ObjectField
 * @typedef {{ kind: 'literal', label: string, value: unknown }} LiteralField
 * @typedef {TextField | ColorField | ImageField | ObjectField | LiteralField} Field
 */

/** @returns {TextField} */
const text = (label, maxLength, { minLength = 1, multiline = false } = {}) => ({
  kind: 'text',
  label,
  minLength,
  maxLength,
  multiline,
});

/** @returns {ColorField} */
const color = (label) => ({ kind: 'color', label });

/** @returns {ImageField} */
const image = (
  label,
  {
    formats = ['webp', 'jpg', 'png', 'avif'],
    maxBytes = 600_000,
    minWidth = 800,
    minHeight = 600,
    maxWidth = 4000,
    maxHeight = 4000,
    altRequired = true,
    altMaxLength = 160,
    focal = false,
    frames = [],
    target = { width: 2400, height: 2400 },
  } = {},
) => ({
  kind: 'image',
  label,
  formats,
  maxBytes,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  altRequired,
  altMaxLength,
  focal,
  frames,
  target,
});

/** @returns {ObjectField} */
const object = (label, fields) => ({ kind: 'object', label, fields });

/** @returns {LiteralField} */
const literal = (label, value) => ({ kind: 'literal', label, value });

/** @type {ObjectField} */
export const contentSchema = object('Conteúdo', {
  schemaVersion: literal('Versão do schema', SCHEMA_VERSION),
  meta: object('Metadados (busca e compartilhamento)', {
    title: text('Título da página', 70),
    description: text('Descrição para buscadores', 160),
  }),
  brand: object('Marca', {
    name: text('Nome da empresa', 40),
    tagline: text('Área de atuação (rodapé)', 80),
    region: text('Região de atendimento (rodapé)', 60),
    // Logotipo horizontal do cabeçalho (fundo claro). SVG só pelo repositório
    // (validado no CI); o painel envia apenas formatos raster.
    logo: image('Logotipo (cabeçalho)', {
      formats: ['svg', 'png', 'webp', 'avif'],
      maxBytes: 200_000,
      minWidth: 120,
      minHeight: 32,
      maxWidth: 2000,
      maxHeight: 1000,
      altMaxLength: 60,
      target: { width: 800, height: 400 },
    }),
  }),
  a11y: object('Textos de acessibilidade', {
    skipLink: text('Link "pular para o conteúdo"', 40),
    newTab: text('Aviso de link em nova aba (leitores de tela)', 40),
  }),
  // Rótulos dos links e do botão do menu (destinos são fixos no código).
  nav: object('Navegação', {
    label: text('Nome da navegação (leitores de tela)', 30),
    menu: text('Botão do menu (celular)', 16),
    about: text('Link: Empresa', 18),
    services: text('Link: Serviços', 18),
    approach: text('Link: Abordagem', 18),
    area: text('Link: Atuação', 18),
    contact: text('Link: Contato', 18),
    cta: text('Botão do cabeçalho', 18),
  }),
  hero: object('Destaque principal', {
    eyebrow: text('Rótulo', 50),
    title: text('Título principal (parte em branco)', 80),
    titleAccent: text('Título principal (parte em dourado; pode ficar vazio)', 60, { minLength: 0 }),
    text: text('Texto de apoio', 220),
    cta: text('Botão', 32),
    // Molduras de src/css/sections.css: .hero__photo é um recorte vertical de
    // aprox. 1:2 (com aresta diagonal) em todas as telas; .hero__detail, 4:5.
    image: image('Imagem principal do destaque', {
      maxBytes: 800_000,
      minWidth: 600,
      minHeight: 1200,
      focal: true,
      frames: [{ label: 'Recorte vertical (todas as telas)', ratio: '1 / 2' }],
      target: { width: 900, height: 1800 },
    }),
    detail: image('Imagem em primeiro plano do destaque', {
      minWidth: 600,
      minHeight: 750,
      focal: true,
      frames: [{ label: 'Todas as telas', ratio: '4 / 5' }],
      target: { width: 720, height: 900 },
    }),
    seal: object('Selo circular', {
      label: text('Linha superior', 20),
      title: text('Destaque', 24),
      text: text('Linha inferior', 30),
    }),
  }),
  about: object('Empresa', {
    eyebrow: text('Rótulo', 40),
    title: text('Título (parte leve)', 80),
    titleAccent: text('Título (parte em destaque; pode ficar vazio)', 60, { minLength: 0 }),
    text: text('Texto de apresentação', 500),
    cta: text('Botão', 32),
    // .about__tile: mosaico 4 × 2 de recortes verticais 3:4.
    image: image('Mosaico: imagem 1', {
      minWidth: 480,
      minHeight: 640,
      focal: true,
      frames: [{ label: 'Mosaico (todas as telas)', ratio: '3 / 4' }],
      target: { width: 600, height: 800 },
    }),
    gallery: object(
      'Mosaico: demais imagens (fixas: 7)',
      Object.fromEntries(
        GALLERY_IDS.map((id, i) => [
          id,
          image(`Mosaico: imagem ${i + 2}`, {
            minWidth: 480,
            minHeight: 640,
            focal: true,
            frames: [{ label: 'Mosaico (todas as telas)', ratio: '3 / 4' }],
            target: { width: 600, height: 800 },
          }),
        ]),
      ),
    ),
    facts: object(
      'Características (fixas: 6)',
      Object.fromEntries(
        FACT_IDS.map((id, i) => [
          id,
          object(`Característica ${String(i + 1).padStart(2, '0')}`, {
            label: text('Rótulo', 24),
            value: text('Valor em destaque', 32),
          }),
        ]),
      ),
    ),
  }),
  services: object('Serviços', {
    eyebrow: text('Rótulo', 40),
    title: text('Título (parte leve)', 60),
    titleAccent: text('Título (parte em destaque; pode ficar vazio)', 40, { minLength: 0 }),
    intro: text('Introdução', 220),
    cta: text('Botão', 32),
    items: object(
      'Lista de serviços (fixa: 21 itens)',
      Object.fromEntries(
        SERVICE_IDS.map((id, i) => [
          id,
          object(`Serviço ${String(i + 1).padStart(2, '0')}`, { title: text('Nome do serviço', 50) }),
        ]),
      ),
    ),
  }),
  approach: object('Abordagem', {
    eyebrow: text('Rótulo', 40),
    title: text('Título (parte leve)', 60),
    titleAccent: text('Título (parte em destaque; pode ficar vazio)', 40, { minLength: 0 }),
    text: text('Texto de apresentação', 240),
    items: object(
      'Itens (fixos: 4)',
      Object.fromEntries(
        APPROACH_IDS.map((id, i) => [
          id,
          object(`Item ${String(i + 1).padStart(2, '0')}`, {
            title: text('Título do item', 40),
            text: text('Texto', 200),
          }),
        ]),
      ),
    ),
  }),
  area: object('Área de atuação', {
    eyebrow: text('Rótulo', 40),
    // Exibido em escala display: limites curtos para não quebrar o layout.
    title: text('Título (parte em branco)', 40),
    titleAccent: text('Título (parte em dourado; pode ficar vazio)', 30, { minLength: 0 }),
    text: text('Texto', 260),
    cta: text('Botão', 32),
  }),
  contact: object('Contato', {
    eyebrow: text('Rótulo', 40),
    title: text('Título (parte leve)', 80),
    titleAccent: text('Título (parte em destaque; pode ficar vazio)', 50, { minLength: 0 }),
    text: text('Texto', 220),
    cta: text('Botão', 32),
    whatsappLabel: text('Rótulo do número', 20),
    // .contact__band: faixa panorâmica acima do cartão de contato.
    image: image('Imagem da faixa do contato', {
      maxBytes: 600_000,
      minWidth: 1600,
      minHeight: 600,
      focal: true,
      frames: [
        { label: 'Computador', ratio: '12 / 5' },
        { label: 'Celular', ratio: '3 / 2' },
      ],
      target: { width: 2400, height: 1000 },
    }),
  }),
  notFound: object('Página 404', {
    eyebrow: text('Rótulo', 30),
    title: text('Título', 50),
    text: text('Texto', 160),
    cta: text('Link para a página inicial', 40),
  }),
  theme: object('Tema', {
    // Papéis documentados em docs/DESIGN_SYSTEM.md.
    colors: object('Cores (chaves fixas, formato #RRGGBB)', {
      background: color('Fundo da página'),
      surface: color('Superfície (cartões, campos)'),
      surfaceAlt: color('Superfície alternativa (faixas, imagens pendentes)'),
      text: color('Texto principal'),
      textMuted: color('Texto secundário'),
      border: color('Divisórias'),
      borderStrong: color('Bordas de controles'),
      primary: color('Cor de ação (botões, selo e detalhes)'),
      onPrimary: color('Texto sobre a cor de ação'),
      accent: color('Destaque no claro (títulos, ícones, foco)'),
      dark: color('Fundo de destaque (hero, atuação, rodapé)'),
      onDark: color('Texto sobre fundo escuro'),
      onDarkMuted: color('Texto secundário sobre fundo escuro'),
      accentOnDark: color('Destaque sobre fundo escuro (títulos, foco)'),
    }),
  }),
});

/**
 * Formatos de imagem por extensão do arquivo.
 * @param {string} src
 */
export const imageFormatOf = (src) => {
  const ext = src.slice(src.lastIndexOf('.') + 1).toLowerCase();
  return ext === 'jpeg' ? 'jpg' : ext;
};

/**
 * Percorre o schema chamando visit(field, path) para cada campo editável (folhas).
 * @param {(field: Field, path: string) => void} visit
 */
export function walkSchema(visit, field = contentSchema, path = '') {
  if (field.kind === 'object') {
    for (const [key, child] of Object.entries(field.fields)) walkSchema(visit, child, path ? `${path}.${key}` : key);
  } else {
    visit(field, path);
  }
}

/**
 * @typedef {{ src: string | null, alt: string, focus: 'center' | 'top' | 'bottom' | 'left' | 'right' }} ImageValue
 * @typedef {object} Content
 * @property {typeof SCHEMA_VERSION} schemaVersion
 * @property {{ title: string, description: string }} meta
 * @property {{ name: string, tagline: string, region: string, logo: ImageValue }} brand
 * @property {{ skipLink: string, newTab: string }} a11y
 * @property {Record<string, string>} nav
 * @property {{
 *   eyebrow: string, title: string, titleAccent: string, text: string, cta: string,
 *   image: ImageValue, detail: ImageValue, seal: { label: string, title: string, text: string }
 * }} hero
 * @property {{
 *   eyebrow: string, title: string, titleAccent: string, text: string, cta: string, image: ImageValue,
 *   gallery: Record<string, ImageValue>, facts: Record<string, { label: string, value: string }>
 * }} about
 * @property {{ eyebrow: string, title: string, titleAccent: string, intro: string, cta: string, items: Record<string, { title: string }> }} services
 * @property {{ eyebrow: string, title: string, titleAccent: string, text: string, items: Record<string, { title: string, text: string }> }} approach
 * @property {{ eyebrow: string, title: string, titleAccent: string, text: string, cta: string }} area
 * @property {{ eyebrow: string, title: string, titleAccent: string, text: string, cta: string, whatsappLabel: string, image: ImageValue }} contact
 * @property {{ eyebrow: string, title: string, text: string, cta: string }} notFound
 * @property {{ colors: Record<string, string> }} theme
 */

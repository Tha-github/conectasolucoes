// Motor de templates mínimo. Todo valor inserido é escapado; não existe
// forma de injetar HTML a partir do conteúdo.
//
// Sintaxe:
//   {{> nome}}                            insere src/partials/nome.html
//   {{content.brand.name}}                texto escapado do conteúdo
//   {{build.root}}                        valor fornecido pelo build
//   {{image content.brand.logo width=200 height=56 class=x loading=eager}}

const TOKEN = /\{\{\s*([^{}]+?)\s*\}\}/g;
const PARTIAL = /\{\{>\s*([a-z0-9-]+)\s*\}\}/g;
const MAX_PARTIAL_DEPTH = 5;

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa texto para uso em conteúdo e em atributos entre aspas. */
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

const IMAGE_ATTRS = {
  width: /^\d{1,4}$/,
  height: /^\d{1,4}$/,
  class: /^[a-z0-9_-]+(?: [a-z0-9_-]+)*$/,
  loading: /^(?:lazy|eager)$/,
  fetchpriority: /^(?:high|low|auto)$/,
};

function lookup(context, path) {
  if (!/^(?:content|build)(?:\.[A-Za-z0-9-]+)+$/.test(path)) {
    throw new Error(`Marcação inválida: "${path}"`);
  }
  let node = context;
  for (const key of path.split('.')) {
    if (node === null || typeof node !== 'object' || !Object.hasOwn(node, key)) {
      throw new Error(`Chave inexistente no template: "${path}"`);
    }
    node = node[key];
  }
  return node;
}

/**
 * Marcação usada quando a imagem não existe. Mantém o mesmo espaço e expõe o
 * texto alternativo. Deve corresponder a createMediaFallback em js/media-fallback.js.
 */
export function mediaFallbackHtml({ alt, className = '' }) {
  const cls = escapeHtml(['media-fallback', className].filter(Boolean).join(' '));
  if (!alt) return `<span class="${cls}" aria-hidden="true"></span>`;
  const safeAlt = escapeHtml(alt);
  return `<span class="${cls}" role="img" aria-label="${safeAlt}"><span class="media-fallback__text">${safeAlt}</span></span>`;
}

function renderImage(args, context, resolveImage) {
  const [path, ...rest] = args;
  const img = lookup(context, path);
  if (img === null || typeof img !== 'object' || !('src' in img) || !('alt' in img)) {
    throw new Error(`"${path}" não é uma imagem`);
  }
  const attrs = {};
  for (const pair of rest) {
    const [name, value] = pair.split('=');
    if (!Object.hasOwn(IMAGE_ATTRS, name) || !IMAGE_ATTRS[name].test(value ?? '')) {
      throw new Error(`Atributo de imagem inválido em "${path}": ${pair}`);
    }
    attrs[name] = value;
  }
  // Enquadramento: só valores da lista fechada viram classe (o schema já valida).
  if (/^(?:top|bottom|left|right)$/.test(img.focus ?? '')) {
    attrs.class = [attrs.class, `media__img--focus-${img.focus}`].filter(Boolean).join(' ');
  }
  if (!img.src) return mediaFallbackHtml({ alt: img.alt, className: attrs.class });

  const root = context.build?.root ?? '';
  const url = resolveImage?.(img.src) ?? root + img.src;
  const parts = [
    `src="${escapeHtml(url)}"`,
    `alt="${escapeHtml(img.alt)}"`,
    attrs.width && `width="${attrs.width}"`,
    attrs.height && `height="${attrs.height}"`,
    attrs.class && `class="${attrs.class}"`,
    `loading="${attrs.loading ?? 'lazy'}"`,
    attrs.fetchpriority && `fetchpriority="${attrs.fetchpriority}"`,
    'decoding="async"',
    'data-media-fallback',
  ];
  return `<img ${parts.filter(Boolean).join(' ')}>`;
}

/** Expande {{> parcial}} recursivamente. */
export function expandPartials(source, partials, depth = 0) {
  if (depth > MAX_PARTIAL_DEPTH) throw new Error('Parciais aninhados demais (possível ciclo)');
  return source.replace(PARTIAL, (_, name) => {
    if (!Object.hasOwn(partials, name)) throw new Error(`Parcial inexistente: "${name}"`);
    return expandPartials(partials[name].replace(/\r?\n$/, ''), partials, depth + 1);
  });
}

/**
 * Renderiza um template.
 * @param {string} source
 * @param {{
 *   context: Record<string, unknown>,
 *   partials?: Record<string, string>,
 *   resolveImage?: (src: string) => string | null | undefined,
 * }} options  resolveImage permite à prévia do painel apontar imagens ainda não
 *   integradas ao repositório para URLs blob:; null/undefined usa root + src.
 */
export function renderTemplate(source, { context, partials = {}, resolveImage }) {
  const expanded = expandPartials(source, partials);
  if (expanded.replace(TOKEN, '').includes('{{')) {
    throw new Error('Marcação "{{" sem fechamento no template');
  }
  return expanded.replace(TOKEN, (_, expr) => {
    const args = expr.split(/\s+/);
    if (args[0] === 'image') return renderImage(args.slice(1), context, resolveImage);
    if (args.length !== 1) throw new Error(`Marcação inválida: "${expr}"`);
    const value = lookup(context, args[0]);
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error(`"${args[0]}" não é um texto`);
    }
    return escapeHtml(value);
  });
}

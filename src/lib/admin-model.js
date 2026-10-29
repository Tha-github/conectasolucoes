// Lógica do painel sem DOM (testável em Node). O painel só altera valores de
// folhas existentes no schema; nunca cria, remove ou reordena chaves.

import { checkImageFile, readImageMeta } from './image-meta.js';
import { walkSchema } from './schema.js';
import { fieldAt } from './validate.js';

/** MIME aceito por formato de imagem do schema. */
export const MIME_BY_FORMAT = Object.freeze({
  webp: 'image/webp',
  jpg: 'image/jpeg',
  png: 'image/png',
  avif: 'image/avif',
  svg: 'image/svg+xml',
});

/** Caminhos de todos os campos editáveis (texto, cor, imagem), na ordem do schema. */
export function editablePaths() {
  const paths = [];
  walkSchema((field, path) => {
    if (field.kind !== 'literal') paths.push(path);
  });
  return paths;
}

export const getAt = (obj, path) =>
  path.split('.').reduce((node, key) => (node && Object.hasOwn(node, key) ? node[key] : undefined), obj);

/**
 * Devolve uma cópia do conteúdo com o valor de um campo existente alterado.
 * Lança erro para caminhos que não sejam campos editáveis do schema.
 * @template T
 * @param {T} content
 * @param {string} path
 * @param {unknown} value
 * @returns {T}
 */
export function setValue(content, path, value) {
  const field = fieldAt(path);
  if (!field || field.kind === 'object' || field.kind === 'literal') {
    throw new Error(`Campo não editável: ${path}`);
  }
  const copy = structuredClone(content);
  const keys = path.split('.');
  const last = keys.pop();
  const parent = keys.reduce((node, key) => node[key], copy);
  if (!parent || !Object.hasOwn(parent, last)) throw new Error(`Campo inexistente no conteúdo: ${path}`);
  parent[last] = structuredClone(value);
  return copy;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Nome legível de um caminho, para mensagens: "Destaque principal › Título principal".
 * Aceita subcaminhos de imagem (".src", ".alt") e caminhos desconhecidos (devolvidos como estão).
 */
export function labelForPath(path) {
  const keys = path.split('.');
  const suffix = { src: 'arquivo', alt: 'texto alternativo' }[keys.at(-1)];
  const base = suffix && fieldAt(keys.slice(0, -1).join('.'))?.kind === 'image' ? keys.slice(0, -1) : keys;
  const labels = [];
  for (let i = 1; i <= base.length; i++) {
    const field = fieldAt(base.slice(0, i).join('.'));
    if (!field) return path || 'Arquivo';
    labels.push(field.label);
  }
  if (base !== keys) labels.push(suffix);
  return labels.join(' › ');
}

/** Campos editáveis cujo valor difere entre dois conteúdos. */
export const changedPaths = (a, b) => editablePaths().filter((path) => !same(getAt(a, path), getAt(b, path)));

const time = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/**
 * Mensagens de status do painel. Textos fixos exigidos:
 * "Rascunho salvo neste navegador", "Arquivo exportado", "Alterações ainda não publicadas".
 * @param {{ draft: unknown, published: unknown, saved?: { content: unknown, at: string } | null, exported?: { content: unknown, at: string } | null }} state
 * @returns {{ kind: 'saved' | 'unsaved' | 'exported' | 'unpublished' | 'published', text: string }[]}
 */
export function statusMessages({ draft, published, saved = null, exported = null }) {
  const messages = [];
  if (saved && same(saved.content, draft)) {
    messages.push({ kind: 'saved', text: `Rascunho salvo neste navegador (${time(saved.at)})` });
  } else if (!same(draft, saved ? saved.content : published)) {
    messages.push({ kind: 'unsaved', text: 'Alterações não salvas neste navegador' });
  }
  if (exported && same(exported.content, draft)) {
    messages.push({ kind: 'exported', text: `Arquivo exportado (${time(exported.at)})` });
  }
  messages.push(
    same(draft, published)
      ? { kind: 'published', text: 'Igual ao conteúdo publicado' }
      : { kind: 'unpublished', text: 'Alterações ainda não publicadas' },
  );
  return messages;
}

/**
 * Nome do arquivo para uma imagem enviada pelo painel, dentro de assets/img/.
 * Ex.: hero.image + webp → assets/img/hero-image-20261028-143005.webp
 */
export function uploadedImagePath(fieldPath, format, date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const stamp =
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  const slug = fieldPath.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `assets/img/${slug}-${stamp}.${format}`;
}

/**
 * Limites do arquivo ORIGINAL escolhido no painel (antes da otimização).
 * O arquivo final ainda precisa caber nos limites do campo (maxBytes etc.).
 * maxDimension evita decodificar imagens gigantes ("bombas" de descompressão).
 */
export const UPLOAD_LIMITS = Object.freeze({ maxBytes: 15_000_000, maxDimension: 8000 });

/** Formatos que o painel aceita enviar: só raster (SVG apenas pelo repositório, validado no CI). */
export const uploadFormats = (field) => field.formats.filter((format) => format !== 'svg');

const sentence = (text) => `${text[0].toUpperCase()}${text.slice(1)}${text.endsWith('.') ? '' : '.'}`;

/**
 * Primeira barreira do envio: tamanho (antes de ler), MIME declarado, tipo REAL
 * pelos bytes (não pela extensão), cabeçalho legível e dimensões.
 * @param {{ size: number, type: string }} file
 * @param {Uint8Array | null} bytes null para checar só tamanho/MIME (antes de ler o arquivo)
 * @param {import('./schema.js').ImageField} field
 * @returns {{ ok: true, format: string, width: number, height: number } | { ok: false, errors: string[] }}
 */
export function checkOriginalUpload(file, bytes, field) {
  const formats = uploadFormats(field);
  const errors = [];
  if (file.size > UPLOAD_LIMITS.maxBytes) {
    errors.push(
      `O arquivo tem ${(file.size / 1e6).toFixed(1)} MB; o máximo para envio é ${UPLOAD_LIMITS.maxBytes / 1e6} MB.`,
    );
  }
  if (file.size === 0) errors.push('O arquivo está vazio.');
  const declared = Object.keys(MIME_BY_FORMAT).find((f) => MIME_BY_FORMAT[f] === file.type);
  if (!declared || !formats.includes(declared)) {
    errors.push(`Tipo de arquivo não aceito. Use: ${formats.map((f) => f.toUpperCase()).join(', ')}.`);
  }
  if (errors.length > 0) return { ok: false, errors };
  if (!bytes) return { ok: true, format: declared, width: 0, height: 0 };

  let meta;
  try {
    meta = readImageMeta(bytes);
  } catch (error) {
    return { ok: false, errors: [`Arquivo inválido ou corrompido: ${error.message}.`] };
  }
  if (meta.format !== declared) {
    return {
      ok: false,
      errors: [
        `O conteúdo do arquivo é ${meta.format.toUpperCase()}, mas ele se apresenta como ${declared.toUpperCase()}.`,
      ],
    };
  }
  if (meta.width > UPLOAD_LIMITS.maxDimension || meta.height > UPLOAD_LIMITS.maxDimension) {
    errors.push(
      `${meta.width}×${meta.height} px é grande demais para processar; máximo ${UPLOAD_LIMITS.maxDimension} px por lado.`,
    );
  }
  if (meta.width < field.minWidth || meta.height < field.minHeight) {
    errors.push(`${meta.width}×${meta.height} px; mínimo ${field.minWidth}×${field.minHeight} px para este espaço.`);
  }
  return errors.length > 0
    ? { ok: false, errors }
    : { ok: true, format: meta.format, width: meta.width, height: meta.height };
}

/**
 * Tamanho de saída: cabe na caixa target do campo, mantendo a proporção
 * (nunca amplia; nunca distorce).
 * @returns {{ width: number, height: number, resize: boolean }}
 */
export function planResize(width, height, field) {
  const scale = Math.min(1, field.target.width / width, field.target.height / height);
  if (scale >= 1) return { width, height, resize: false };
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    resize: true,
  };
}

/**
 * Escolhe entre o original e a versão otimizada. Prefere a otimizada (menor,
 * sem metadados); usa o original só se ele já couber no campo sem redimensionar.
 * @param {{ bytes: Uint8Array, format: string } } original
 * @param {{ bytes: Uint8Array, format: string } | null} optimized null se o navegador não otimizou
 * @param {boolean} needsResize
 * @param {import('./schema.js').ImageField} field
 * @returns {{ ok: true, choice: 'optimized' | 'original' } | { ok: false, errors: string[] }}
 */
export function chooseOutput(original, optimized, needsResize, field) {
  const fits = (candidate) =>
    candidate &&
    uploadFormats(field).includes(candidate.format) &&
    checkImageFile(candidate.bytes, `x.${candidate.format}`, field).length === 0;
  if (optimized && fits(optimized)) return { ok: true, choice: 'optimized' };
  if (!needsResize && fits(original)) return { ok: true, choice: 'original' };
  const problems = optimized
    ? checkImageFile(optimized.bytes, `x.${optimized.format}`, field)
    : ['este navegador não conseguiu otimizar a imagem; reduza o arquivo antes de enviar'];
  return { ok: false, errors: problems.map(sentence) };
}

/**
 * Normaliza a cor digitada: aceita "#RGB", "#RRGGBB", com ou sem "#", em
 * qualquer caixa. Devolve "#RRGGBB" ou null se inválida.
 */
export function normalizeHex(input) {
  const raw = String(input ?? '')
    .trim()
    .replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) return `#${[...raw].map((ch) => ch + ch).join('')}`.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`.toUpperCase();
  return null;
}

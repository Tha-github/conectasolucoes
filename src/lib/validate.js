// Validação estrita do conteúdo. Sem DOM: roda no build, nos testes e no navegador.

import {
  COLOR_PATTERN,
  CONTRAST_PAIRS,
  FOCUS_POSITIONS,
  IMAGE_PATH_PATTERN,
  MIN_CONTRAST_TEXT,
  STATUS_BACKGROUNDS,
  STATUS_COLORS,
  contentSchema,
  imageFormatOf,
} from './schema.js';
import { contrastRatio } from './color.js';

/** Tamanho máximo aceito para um JSON de conteúdo (bytes aproximados em UTF-16). */
export const MAX_CONTENT_JSON_LENGTH = 200_000;

// Caracteres de controle (exceto \n e \t) e controles bidirecionais/invisíveis
// que permitem disfarçar texto. Intervalos [início, fim] de pontos de código.
const FORBIDDEN_RANGES = [
  [0x00, 0x08],
  [0x0b, 0x1f],
  [0x7f, 0x7f],
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2066, 0x2069],
  [0xfeff, 0xfeff],
];

const hasForbiddenChars = (value) =>
  [...value].some((ch) => {
    const code = ch.codePointAt(0);
    return FORBIDDEN_RANGES.some(([start, end]) => code >= start && code <= end);
  });

/**
 * @typedef {{ path: string, message: string }} ValidationError
 * @typedef {{ ok: true, value: import('./schema.js').Content } | { ok: false, errors: ValidationError[] }} ValidationResult
 */

const isPlainObject = (value) =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

function checkText(field, value, path, errors) {
  if (typeof value !== 'string') {
    errors.push({ path, message: 'deve ser um texto' });
    return;
  }
  const trimmed = value.trim();
  if (trimmed.length < field.minLength) {
    errors.push({
      path,
      message: field.minLength === 1 ? 'não pode ficar vazio' : `mínimo de ${field.minLength} caracteres`,
    });
  }
  if (value.length > field.maxLength) {
    errors.push({ path, message: `máximo de ${field.maxLength} caracteres (atual: ${value.length})` });
  }
  if (hasForbiddenChars(value)) {
    errors.push({ path, message: 'contém caracteres de controle não permitidos' });
  }
  if (!field.multiline && /[\n\r\t]/.test(value)) {
    errors.push({ path, message: 'não aceita quebras de linha' });
  }
}

function checkImage(field, value, path, errors) {
  if (!isPlainObject(value)) {
    errors.push({ path, message: 'deve ser um objeto { src, alt, focus }' });
    return;
  }
  for (const key of Object.keys(value)) {
    if (!['src', 'alt', 'focus'].includes(key)) {
      errors.push({ path: `${path}.${key}`, message: 'propriedade desconhecida' });
    }
  }
  if (!Object.hasOwn(value, 'focus')) {
    errors.push({ path: `${path}.focus`, message: 'campo obrigatório ausente' });
  } else if (!FOCUS_POSITIONS.includes(value.focus)) {
    errors.push({ path: `${path}.focus`, message: `deve ser um de: ${FOCUS_POSITIONS.join(', ')}` });
  } else if (!field.focal && value.focus !== 'center') {
    errors.push({ path: `${path}.focus`, message: 'esta imagem não aceita enquadramento (use "center")' });
  }
  const { src, alt } = value;
  if (src !== null && (typeof src !== 'string' || !IMAGE_PATH_PATTERN.test(src))) {
    errors.push({
      path: `${path}.src`,
      message: 'deve ser null ou um caminho em assets/img/ (minúsculas, .webp, .jpg, .png, .avif ou .svg)',
    });
  } else if (src !== null && !field.formats.includes(imageFormatOf(src))) {
    errors.push({
      path: `${path}.src`,
      message: `formato não aceito neste campo (aceitos: ${field.formats.join(', ')})`,
    });
  }
  checkText(
    { kind: 'text', minLength: field.altRequired ? 1 : 0, maxLength: field.altMaxLength, multiline: false },
    alt,
    `${path}.alt`,
    errors,
  );
}

function checkField(field, value, path, errors) {
  switch (field.kind) {
    case 'literal':
      if (value !== field.value) errors.push({ path, message: `deve ser ${JSON.stringify(field.value)}` });
      return;
    case 'text':
      checkText(field, value, path, errors);
      return;
    case 'color':
      if (typeof value !== 'string' || !COLOR_PATTERN.test(value)) {
        errors.push({ path, message: 'deve ser uma cor no formato #RRGGBB' });
      }
      return;
    case 'image':
      checkImage(field, value, path, errors);
      return;
    case 'object': {
      if (!isPlainObject(value)) {
        errors.push({ path, message: 'deve ser um objeto' });
        return;
      }
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(field.fields, key)) {
          errors.push({ path: path ? `${path}.${key}` : key, message: 'propriedade desconhecida' });
        }
      }
      for (const [key, child] of Object.entries(field.fields)) {
        const childPath = path ? `${path}.${key}` : key;
        if (!Object.hasOwn(value, key)) {
          errors.push({ path: childPath, message: 'campo obrigatório ausente' });
          continue;
        }
        checkField(child, value[key], childPath, errors);
      }
      return;
    }
    default:
      throw new Error(`Tipo de campo desconhecido no schema: ${field.kind}`);
  }
}

/**
 * Valida um único valor contra um campo do schema (ex.: no painel, a cada digitação).
 * @param {import('./schema.js').Field} field
 * @param {unknown} value
 * @param {string} path
 * @returns {ValidationError[]}
 */
export function validateField(field, value, path) {
  /** @type {ValidationError[]} */
  const errors = [];
  checkField(field, value, path, errors);
  return errors;
}

/**
 * Localiza o campo do schema por caminho ("hero.title"); null se não existir.
 * @param {string} path
 * @returns {import('./schema.js').Field | null}
 */
export function fieldAt(path) {
  let field = contentSchema;
  for (const key of path.split('.')) {
    if (field.kind !== 'object' || !Object.hasOwn(field.fields, key)) return null;
    field = field.fields[key];
  }
  return field;
}

/**
 * Erros de contraste das cores do tema (pares em CONTRAST_PAIRS).
 * @param {Record<string, string>} colors
 */
export function contrastErrors(colors) {
  /** @type {ValidationError[]} */
  const errors = [];
  checkContrast(colors, errors);
  return errors;
}

function checkContrast(colors, errors) {
  for (const [fg, bg, min] of CONTRAST_PAIRS) {
    if (!COLOR_PATTERN.test(colors[fg] ?? '') || !COLOR_PATTERN.test(colors[bg] ?? '')) continue;
    const ratio = contrastRatio(colors[fg], colors[bg]);
    if (ratio < min) {
      errors.push({
        path: `theme.colors.${fg}`,
        message: `contraste insuficiente sobre "${bg}": ${ratio.toFixed(2)}:1 (mínimo ${min}:1)`,
      });
    }
  }
  // Mensagens de erro/sucesso/aviso usam cores fixas sobre fundos editáveis.
  for (const bg of STATUS_BACKGROUNDS) {
    if (!COLOR_PATTERN.test(colors[bg] ?? '')) continue;
    for (const [name, hex] of Object.entries(STATUS_COLORS)) {
      const ratio = contrastRatio(hex, colors[bg]);
      if (ratio < MIN_CONTRAST_TEXT) {
        errors.push({
          path: `theme.colors.${bg}`,
          message: `deixa ilegíveis as mensagens de ${name === 'error' ? 'erro' : name === 'success' ? 'sucesso' : 'aviso'}: ${ratio.toFixed(2)}:1 (mínimo ${MIN_CONTRAST_TEXT}:1)`,
        });
      }
    }
  }
}

/**
 * Valida um objeto de conteúdo já desserializado.
 * @param {unknown} value
 * @returns {ValidationResult}
 */
export function validateContent(value) {
  /** @type {ValidationError[]} */
  const errors = [];
  checkField(contentSchema, value, '', errors);
  if (errors.length === 0) checkContrast(/** @type {any} */ (value).theme.colors, errors);
  return errors.length === 0 ? { ok: true, value: /** @type {any} */ (value) } : { ok: false, errors };
}

/**
 * Desserializa e valida um JSON de conteúdo de origem não confiável.
 * @param {string} json
 * @returns {ValidationResult}
 */
export function parseContent(json) {
  if (typeof json !== 'string') return { ok: false, errors: [{ path: '', message: 'entrada deve ser texto JSON' }] };
  if (json.length > MAX_CONTENT_JSON_LENGTH) {
    return { ok: false, errors: [{ path: '', message: `arquivo excede ${MAX_CONTENT_JSON_LENGTH} caracteres` }] };
  }
  let data;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, errors: [{ path: '', message: 'JSON inválido' }] };
  }
  return validateContent(data);
}

/** Formata erros para exibição em texto simples. */
export const formatErrors = (errors) => errors.map((e) => `- ${e.path || '(raiz)'}: ${e.message}`).join('\n');

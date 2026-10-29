// Recuperação tolerante: usada para dados que não podem simplesmente ser
// recusados sem perder trabalho (ex.: rascunho salvo no navegador por uma
// versão anterior do painel). Cada campo inválido, ausente ou desconhecido é
// substituído pelo valor padrão correspondente, e cada substituição é relatada.
//
// Importação e build continuam estritos (validate.js): ali, dados inválidos são
// rejeitados com mensagens, não corrigidos silenciosamente.

import { contentSchema } from './schema.js';
import { migrateContent } from './migrate.js';
import { contrastErrors, validateContent, validateField } from './validate.js';

/**
 * @typedef {{ path: string, message: string }} Issue
 * @typedef {{ value: import('./schema.js').Content, issues: Issue[] }} Resolved
 */

const isPlainObject = (value) =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

const join = (path, key) => (path ? `${path}.${key}` : key);

function resolveField(field, value, fallback, path, issues) {
  if (field.kind === 'literal') return field.value;

  if (field.kind === 'object') {
    if (!isPlainObject(value)) {
      issues.push({
        path: path || '(raiz)',
        message: value === undefined ? 'ausente; usando padrão' : 'inválido; usando padrão',
      });
      return structuredClone(fallback);
    }
    for (const key of Object.keys(value)) {
      if (!Object.hasOwn(field.fields, key)) issues.push({ path: join(path, key), message: 'desconhecido; ignorado' });
    }
    const out = {};
    for (const [key, child] of Object.entries(field.fields)) {
      out[key] = resolveField(
        child,
        Object.hasOwn(value, key) ? value[key] : undefined,
        fallback[key],
        join(path, key),
        issues,
      );
    }
    return out;
  }

  // Folhas (texto, cor, imagem): mantém o valor só se for válido por inteiro.
  if (value === undefined) {
    issues.push({ path, message: 'ausente; usando padrão' });
    return structuredClone(fallback);
  }
  const errors = validateField(field, value, path);
  if (errors.length > 0) {
    issues.push({ path, message: `${errors[0].message}; usando padrão` });
    return structuredClone(fallback);
  }
  return structuredClone(value);
}

/**
 * Combina dados não confiáveis com o conteúdo padrão, campo a campo.
 * O resultado é sempre válido (se `defaults` for válido).
 * @param {unknown} data
 * @param {import('./schema.js').Content} defaults conteúdo padrão já validado
 * @returns {Resolved}
 */
export function resolveWithDefaults(data, defaults) {
  /** @type {Issue[]} */
  const issues = [];
  const migrated = migrateContent(data);
  if (!migrated.ok) {
    issues.push(...migrated.errors.map((e) => ({ path: e.path || '(raiz)', message: `${e.message}; usando padrão` })));
  }

  // Versão desconhecida: nada é reaproveitado, pois o significado dos campos pode ter mudado.
  const value = /** @type {import('./schema.js').Content} */ (
    migrated.ok ? resolveField(contentSchema, migrated.value, defaults, '', issues) : structuredClone(defaults)
  );

  // Cores válidas isoladamente podem formar pares sem contraste: volta à paleta padrão inteira.
  if (contrastErrors(value.theme.colors).length > 0) {
    issues.push({ path: 'theme.colors', message: 'combinação sem contraste mínimo; usando a paleta padrão' });
    value.theme.colors = structuredClone(defaults.theme.colors);
  }

  const check = validateContent(value);
  if (!check.ok) throw new Error('Conteúdo padrão inválido: corrija content/content.json');
  return { value, issues };
}

// Exportação e importação do conteúdo em JSON.
//
// O arquivo exportado tem exatamente o formato de content/content.json.
// Importar valida (e migra, se for de versão anterior) mas NÃO publica nada:
// a publicação exige integrar o arquivo ao repositório e fazer novo deploy
// (docs/CONTENT_SCHEMA.md §5).

import { migrateContent } from './migrate.js';
import { MAX_CONTENT_JSON_LENGTH, validateContent } from './validate.js';

/**
 * Serializa conteúdo válido para exportação. Lança erro se for inválido.
 * @param {unknown} content
 * @returns {string}
 */
export function exportContent(content) {
  const result = validateContent(content);
  if (!result.ok) throw new Error('Conteúdo inválido não pode ser exportado');
  return `${JSON.stringify(result.value, null, 2)}\n`;
}

/** Nome sugerido para o arquivo exportado: conecta-conteudo-AAAA-MM-DD.json */
export const exportFileName = (date = new Date()) => `conecta-conteudo-${date.toISOString().slice(0, 10)}.json`;

/**
 * Lê um JSON exportado (origem não confiável): limite de tamanho, parse,
 * migração explícita e validação estrita. Nunca corrige silenciosamente.
 * @param {string} json
 * @returns {{ ok: true, value: import('./schema.js').Content, migratedFrom: number | null } | { ok: false, errors: { path: string, message: string }[] }}
 */
export function importContent(json) {
  if (typeof json !== 'string') return { ok: false, errors: [{ path: '', message: 'entrada deve ser texto JSON' }] };
  if (json.length > MAX_CONTENT_JSON_LENGTH) {
    return { ok: false, errors: [{ path: '', message: `arquivo excede ${MAX_CONTENT_JSON_LENGTH} caracteres` }] };
  }
  let data;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, errors: [{ path: '', message: 'o arquivo não é um JSON válido' }] };
  }
  const migrated = migrateContent(data);
  if (!migrated.ok) return migrated;
  const result = validateContent(migrated.value);
  if (!result.ok) return result;
  return {
    ok: true,
    value: result.value,
    migratedFrom: migrated.from === result.value.schemaVersion ? null : migrated.from,
  };
}

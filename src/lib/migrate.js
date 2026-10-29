// Migração explícita entre versões do schema de conteúdo.
//
// Para uma mudança incompatível no schema:
//   1. incremente SCHEMA_VERSION em schema.js;
//   2. registre aqui MIGRATIONS[versãoAnterior] = (dados) => dadosNaNovaVersão;
//   3. adicione um teste com um arquivo da versão anterior.
// Cada função recebe uma cópia e deve devolver o objeto com schemaVersion + 1.
// O resultado final ainda passa pela validação estrita (sem propriedades extras).

import { SCHEMA_VERSION } from './schema.js';

/** @type {Readonly<Record<number, (data: Record<string, unknown>) => Record<string, unknown>>>} */
/** Campos de imagem da versão 1 (fixos naquela versão; não derivar do schema atual). */
const V1_IMAGE_PATHS = [
  ['brand', 'logo'],
  ['hero', 'image'],
  ['about', 'image'],
];

export const MIGRATIONS = Object.freeze({
  // v1 → v2: imagens ganham "focus" (enquadramento). Valor neutro: "center".
  // Defensiva: dados não confiáveis; estruturas inesperadas ficam como estão
  // e a validação posterior aponta o problema.
  1: (data) => {
    for (const [group, key] of V1_IMAGE_PATHS) {
      const img = data[group]?.[key];
      if (img && typeof img === 'object' && !Array.isArray(img) && !Object.hasOwn(img, 'focus')) {
        img.focus = 'center';
      }
    }
    return { ...data, schemaVersion: 2 };
  },
});

/**
 * @typedef {{ path: string, message: string }} MigrationError
 * @typedef {{ ok: true, value: Record<string, unknown>, from: number } | { ok: false, errors: MigrationError[] }} MigrationResult
 */

const fail = (message) => ({ ok: false, errors: [{ path: 'schemaVersion', message }] });

/**
 * Leva dados de qualquer versão suportada até a versão atual.
 * Não valida o conteúdo; use validateContent no resultado.
 * @param {unknown} data
 * @param {{ migrations?: typeof MIGRATIONS, target?: number }} [options]
 * @returns {MigrationResult}
 */
export function migrateContent(data, { migrations = MIGRATIONS, target = SCHEMA_VERSION } = {}) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, errors: [{ path: '', message: 'o conteúdo deve ser um objeto JSON' }] };
  }
  const from = /** @type {Record<string, unknown>} */ (data).schemaVersion;
  if (!Number.isInteger(from) || /** @type {number} */ (from) < 1) {
    return fail('ausente ou inválida (esperado um número inteiro a partir de 1)');
  }
  if (/** @type {number} */ (from) > target) {
    return fail(`versão ${from} é mais nova que a suportada (${target}); atualize o site antes de importar`);
  }

  let current = structuredClone(/** @type {Record<string, unknown>} */ (data));
  for (let version = /** @type {number} */ (from); version < target; version++) {
    const step = Object.hasOwn(migrations, version) ? migrations[version] : null;
    if (!step) return fail(`não há migração da versão ${version} para ${version + 1}`);
    current = step(structuredClone(current));
    if (current?.schemaVersion !== version + 1) {
      return fail(`a migração ${version} → ${version + 1} não atualizou schemaVersion`);
    }
  }
  return { ok: true, value: current, from: /** @type {number} */ (from) };
}

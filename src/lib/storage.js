// Rascunho local do painel (localStorage).
//
// ATENÇÃO: o rascunho existe apenas neste navegador, nesta origem. Não é
// enviado a lugar nenhum, não aparece para outros visitantes e pode ser apagado
// pelo navegador. Sites de projeto em <usuario>.github.io compartilham a mesma
// origem; por isso a chave tem prefixo próprio e tudo o que é lido é tratado
// como entrada não confiável (revalidado e recuperado com defaults).

import { SCHEMA_VERSION } from './schema.js';
import { resolveWithDefaults } from './defaults.js';
import { MAX_CONTENT_JSON_LENGTH, validateContent } from './validate.js';

export const DRAFT_KEY = 'conecta-solucoes:rascunho-conteudo';

/**
 * @typedef {Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>} StorageLike
 * @typedef {{ status: 'none', value: import('./schema.js').Content, issues: [] }
 *   | { status: 'ok' | 'repaired', value: import('./schema.js').Content, savedAt: string | null, issues: { path: string, message: string }[] }
 *   | { status: 'error', value: import('./schema.js').Content, issues: { path: string, message: string }[] }} DraftLoad
 */

/**
 * Salva o rascunho. Só aceita conteúdo válido.
 * @param {StorageLike | null | undefined} storage
 * @param {unknown} content
 * @returns {{ ok: true, savedAt: string } | { ok: false, reason: 'invalid' | 'unavailable' | 'quota', message: string }}
 */
export function saveDraft(storage, content, now = new Date()) {
  const check = validateContent(content);
  if (!check.ok) return { ok: false, reason: 'invalid', message: 'O rascunho tem campos inválidos e não foi salvo.' };
  if (!storage) {
    return { ok: false, reason: 'unavailable', message: 'O armazenamento local não está disponível neste navegador.' };
  }
  const savedAt = now.toISOString();
  try {
    storage.setItem(DRAFT_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, savedAt, content: check.value }));
    return { ok: true, savedAt };
  } catch (error) {
    const quota = error instanceof Error && /quota/i.test(error.name + error.message);
    return {
      ok: false,
      reason: quota ? 'quota' : 'unavailable',
      message: quota
        ? 'Espaço de armazenamento local esgotado. Exporte o conteúdo para não perder as alterações.'
        : 'Não foi possível salvar no armazenamento local (navegação privada ou bloqueio de dados).',
    };
  }
}

/**
 * Carrega o rascunho, recuperando campos inválidos com o conteúdo padrão.
 * Nunca lança exceção.
 * @param {StorageLike | null | undefined} storage
 * @param {import('./schema.js').Content} defaults
 * @returns {DraftLoad}
 */
export function loadDraft(storage, defaults) {
  let raw;
  try {
    raw = storage ? storage.getItem(DRAFT_KEY) : null;
  } catch {
    return {
      status: 'error',
      value: structuredClone(defaults),
      issues: [{ path: '', message: 'armazenamento local indisponível' }],
    };
  }
  if (raw === null) return { status: 'none', value: structuredClone(defaults), issues: [] };

  const corrupt = (message) => ({ status: 'error', value: structuredClone(defaults), issues: [{ path: '', message }] });
  if (typeof raw !== 'string' || raw.length > MAX_CONTENT_JSON_LENGTH + 1000) {
    return corrupt('rascunho grande demais; ignorado');
  }

  let envelope;
  try {
    envelope = JSON.parse(raw);
  } catch {
    return corrupt('rascunho corrompido (JSON inválido); ignorado');
  }
  if (typeof envelope !== 'object' || envelope === null || !('content' in envelope)) {
    return corrupt('rascunho em formato desconhecido; ignorado');
  }

  const { value, issues } = resolveWithDefaults(envelope.content, defaults);
  const savedAt =
    typeof envelope.savedAt === 'string' && !Number.isNaN(Date.parse(envelope.savedAt)) ? envelope.savedAt : null;
  return { status: issues.length === 0 ? 'ok' : 'repaired', value, savedAt, issues };
}

/**
 * Remove o rascunho local.
 * @param {StorageLike | null | undefined} storage
 */
export function clearDraft(storage) {
  try {
    storage?.removeItem(DRAFT_KEY);
    return true;
  } catch {
    return false;
  }
}

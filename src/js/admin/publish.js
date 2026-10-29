// Publicação pelo painel: grava content/content.json e as imagens novas num
// único commit (github.js) e acompanha o site até a mudança aparecer. O
// GitHub Actions revalida tudo (validate:publish, testes e build) antes do
// deploy: conteúdo recusado lá não chega ao site.

import { bytesToBase64, textToBase64 } from '../../lib/access.js';
import { exportContent, importContent } from '../../lib/transfer.js';

export const CONTENT_REPO_PATH = 'content/content.json';
const WATCH_INTERVAL_MS = 15_000;
const WATCH_LIMIT_MS = 6 * 60_000;

/** Texto canônico do conteúdo (mesmo formato do build), ou null se inválido. */
function canonical(text) {
  const result = typeof text === 'string' ? importContent(text) : { ok: false };
  return result.ok ? exportContent(result.value) : null;
}

/**
 * @param {ReturnType<import('./github.js').createGitHub>} github
 * @param {{
 *   draft: unknown, published: unknown,
 *   images: { src: string, blob: Blob }[],
 *   date?: Date,
 * }} input  images: só as enviadas neste navegador e referenciadas pelo rascunho
 * @returns {Promise<{ ok: true, json: string } | { ok: false, reason: 'conflict' }>}
 */
export async function publishContent(github, { draft, published, images, date = new Date() }) {
  // O que está no GitHub precisa ser o que este painel carregou; senão outra
  // publicação aconteceu no meio e seria sobrescrita sem aviso.
  const remote = canonical(await github.readText(CONTENT_REPO_PATH));
  if (remote !== exportContent(published)) return { ok: false, reason: 'conflict' };

  const json = exportContent(draft);
  const files = [{ path: CONTENT_REPO_PATH, base64: textToBase64(json) }];
  for (const { src, blob } of images) {
    files.push({ path: `src/${src}`, base64: bytesToBase64(new Uint8Array(await blob.arrayBuffer())) });
  }
  const stamp = date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  await github.commitFiles(files, `Painel: atualização do conteúdo (${stamp})`);
  return { ok: true, json };
}

/**
 * Consulta o content.json publicado até ele ficar igual ao enviado.
 * @param {string} url  content/content.json do site
 * @param {string} expected  texto canônico enviado
 * @returns {Promise<boolean>} true quando o site já mostra a mudança
 */
export async function waitForSite(url, expected, { interval = WATCH_INTERVAL_MS, limit = WATCH_LIMIT_MS } = {}) {
  const deadline = Date.now() + limit;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, interval));
    try {
      const response = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store', credentials: 'same-origin' });
      if (response.ok && canonical(await response.text()) === expected) return true;
    } catch {
      // Falha momentânea de rede: tenta de novo no próximo intervalo.
    }
  }
  return false;
}

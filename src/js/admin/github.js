// Cliente mínimo da API do GitHub usado pelo painel para publicar
// (exceção registrada no CLAUDE.md §7). O token chega já decifrado pela senha
// (lib/access.js), vive só nesta aba e nunca é gravado em armazenamento local.
// Todas as gravações formam UM commit (Git Data API) na branch configurada, e
// só para os caminhos da lista fechada isPublishablePath.

import { isPublishablePath } from '../../lib/access.js';
import { REPOSITORY } from '../../lib/site.js';

const API = 'https://api.github.com';
const TIMEOUT_MS = 30_000;

/** Erro da API com status HTTP (0 = sem conexão) e mensagem do GitHub. */
export class GitHubError extends Error {
  constructor(status, message = '', { rateLimited = false } = {}) {
    super(message);
    this.status = status;
    this.rateLimited = rateLimited;
  }
}

/**
 * @param {string} token
 * @param {{ owner: string, name: string, branch: string }} [repo]
 */
export function createGitHub(token, repo = REPOSITORY) {
  const base = `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`;

  async function request(path, { method = 'GET', body, allow404 = false } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response;
    try {
      response = await fetch(API + path, {
        method,
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          Authorization: `Bearer ${token}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new GitHubError(0, 'network');
    } finally {
      clearTimeout(timer);
    }
    if (response.status === 404 && allow404) return null;
    if (!response.ok) {
      const message = String((await response.json().catch(() => ({}))).message ?? '').slice(0, 300);
      const rateLimited =
        response.status === 429 || response.headers.get('x-ratelimit-remaining') === '0' || /rate limit/i.test(message);
      throw new GitHubError(response.status, message, { rateLimited });
    }
    return response.status === 204 ? null : response.json();
  }

  /** Confirma que o token existe e pode gravar neste repositório. */
  async function checkPush() {
    const info = await request(base);
    if (!info?.permissions?.push) throw new GitHubError(403, 'no-push');
  }

  /** Conteúdo atual (texto) de um arquivo na branch, ou null se não existir. */
  async function readText(path) {
    const file = await request(`${base}/contents/${path}?ref=${encodeURIComponent(repo.branch)}`, { allow404: true });
    if (!file || typeof file.content !== 'string') return null;
    const bytes = Uint8Array.from(atob(file.content.replace(/\s/g, '')), (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  /**
   * Grava vários arquivos num único commit, sobre o último commit da branch.
   * Se a branch avançar no meio (outro commit), tenta de novo uma vez.
   * @param {{ path: string, base64: string }[]} files
   * @param {string} message
   * @returns {Promise<string>} SHA do commit criado
   */
  async function commitFiles(files, message) {
    if (files.length === 0) throw new Error('nada para gravar');
    for (const { path } of files) {
      if (!isPublishablePath(path)) throw new Error(`caminho não permitido: ${path}`);
    }
    const ref = `${base}/git/refs/heads/${encodeURIComponent(repo.branch)}`;
    for (let attempt = 0; ; attempt++) {
      const head = await request(`${base}/git/ref/heads/${encodeURIComponent(repo.branch)}`);
      const parent = await request(`${base}/git/commits/${head.object.sha}`);
      const tree = [];
      for (const { path, base64 } of files) {
        const blob = await request(`${base}/git/blobs`, {
          method: 'POST',
          body: { content: base64, encoding: 'base64' },
        });
        tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
      }
      const newTree = await request(`${base}/git/trees`, {
        method: 'POST',
        body: { base_tree: parent.tree.sha, tree },
      });
      const commit = await request(`${base}/git/commits`, {
        method: 'POST',
        body: { message, tree: newTree.sha, parents: [head.object.sha] },
      });
      try {
        await request(ref, { method: 'PATCH', body: { sha: commit.sha, force: false } });
        return commit.sha;
      } catch (error) {
        // 422: a branch mudou entre a leitura e a gravação (não é fast-forward).
        if (!(error instanceof GitHubError) || error.status !== 422 || attempt > 0) throw error;
      }
    }
  }

  return { checkPush, readText, commitFiles };
}

/** Mensagem para o usuário, sem detalhes internos além do texto do GitHub. */
export function describeGitHubError(error) {
  const status = error instanceof GitHubError ? error.status : -1;
  if (status === 0) return 'Sem conexão com o GitHub. Verifique a internet e tente novamente.';
  if (status === 401) {
    return 'A chave de acesso do GitHub expirou ou foi revogada. Peça ao responsável técnico para reconfigurar o acesso.';
  }
  if (error?.rateLimited) return 'O GitHub limitou as solicitações por alguns minutos. Tente novamente em instantes.';
  if (status === 403 || status === 404) {
    return `O GitHub recusou a gravação: a chave não tem permissão para alterar ${REPOSITORY.owner}/${REPOSITORY.name}. No token, selecione só este repositório e "Contents: Read and write".`;
  }
  if (status === 409 || status === 422) {
    return 'O GitHub recusou a gravação (a branch pode estar protegida contra envios diretos). Veja docs/publicacao.md.';
  }
  return 'Não foi possível concluir a operação no GitHub. Tente novamente; se continuar, avise o responsável técnico.';
}

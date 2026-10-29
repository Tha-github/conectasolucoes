// Acesso do painel (exceção registrada no CLAUDE.md §7, padrão "Weiri").
//
// O token do GitHub que permite publicar fica em content/acesso.json,
// CRIPTOGRAFADO com a senha do painel: AES-256-GCM com chave derivada por
// PBKDF2-SHA256 (600 mil iterações, sal aleatório). O arquivo é público (vai
// para o site em admin/acesso.json); sem a senha, só se vê texto cifrado. O
// token decifrado existe apenas na memória da aba aberta.
//
// Limite conhecido: quem baixar o arquivo pode tentar senhas offline, sem
// limite de tentativas. Por isso a senha mínima é longa e o token deve ser
// fine-grained, restrito a este repositório e só com "Contents: Read and write".

export const ACCESS_VERSION = 1;
export const ACCESS_ITERATIONS = 600_000;
export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 200;
/** Caminho no repositório (o build copia para dist/admin/acesso.json). */
export const ACCESS_REPO_PATH = 'content/acesso.json';

/** Tokens do GitHub aceitos: fine-grained (recomendado) ou clássico. */
const TOKEN_PATTERN = /^(?:github_pat_[A-Za-z0-9_]{20,255}|ghp_[A-Za-z0-9]{36})$/;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

const encoder = new TextEncoder();

/** Bytes → base64, em blocos (evita estourar a pilha com arquivos grandes). */
export function bytesToBase64(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < view.length; i += 0x8000) binary += String.fromCharCode(...view.subarray(i, i + 0x8000));
  return btoa(binary);
}

export const base64ToBytes = (text) => Uint8Array.from(atob(text), (ch) => ch.charCodeAt(0));
export const textToBase64 = (text) => bytesToBase64(encoder.encode(text));
export const base64ToText = (text) => new TextDecoder().decode(base64ToBytes(text.replace(/\s/g, '')));

/** @param {string} token */
export const isGitHubToken = (token) => typeof token === 'string' && TOKEN_PATTERN.test(token);

/**
 * Regras da senha do painel. Devolve a mensagem de erro ou null.
 * @param {string} password
 */
export function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Use pelo menos ${MIN_PASSWORD_LENGTH} caracteres (de preferência uma frase).`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) return `Use no máximo ${MAX_PASSWORD_LENGTH} caracteres.`;
  if (/^(.)\1+$/.test(password)) return 'A senha não pode ser um único caractere repetido.';
  return null;
}

async function deriveKey(password, salt, iterations) {
  const base = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * @typedef {{ v: 1, kdf: 'PBKDF2-SHA256', iterations: number, salt: string, iv: string, data: string }} AccessFile
 */

/**
 * Cifra o token com a senha. Recusa token ou senha fora das regras.
 * @returns {Promise<AccessFile>}
 */
export async function encryptToken(token, password, { iterations = ACCESS_ITERATIONS } = {}) {
  if (!isGitHubToken(token)) throw new Error('token inválido');
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, iterations);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(token));
  return {
    v: ACCESS_VERSION,
    kdf: 'PBKDF2-SHA256',
    iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(data),
  };
}

/**
 * Decifra o token. Senha errada (ou arquivo adulterado) → null, nunca lança.
 * @param {AccessFile} file já validado por parseAccessFile
 * @returns {Promise<string | null>}
 */
export async function decryptToken(file, password) {
  try {
    const key = await deriveKey(password, base64ToBytes(file.salt), file.iterations);
    const data = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(file.iv) },
      key,
      base64ToBytes(file.data),
    );
    const token = new TextDecoder().decode(data);
    return isGitHubToken(token) ? token : null;
  } catch {
    return null;
  }
}

/**
 * Lê content/acesso.json (entrada não confiável): formato estrito, sem
 * propriedades extras, iterações nunca abaixo do padrão (um arquivo
 * adulterado não consegue enfraquecer a derivação).
 * @returns {AccessFile | null}
 */
export function parseAccessFile(text) {
  if (typeof text !== 'string' || text.length > 4000) return null;
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const keys = ['v', 'kdf', 'iterations', 'salt', 'iv', 'data'];
  if (Object.keys(value).length !== keys.length || !keys.every((key) => Object.hasOwn(value, key))) return null;
  if (value.v !== ACCESS_VERSION || value.kdf !== 'PBKDF2-SHA256') return null;
  if (!Number.isInteger(value.iterations) || value.iterations < ACCESS_ITERATIONS || value.iterations > 10_000_000) {
    return null;
  }
  for (const key of ['salt', 'iv', 'data']) {
    if (typeof value[key] !== 'string' || !BASE64.test(value[key]) || value[key].length > 2000) return null;
  }
  if (base64ToBytes(value.salt).length < 16 || base64ToBytes(value.iv).length !== 12) return null;
  return value;
}

export const serializeAccessFile = (file) => `${JSON.stringify(file, null, 2)}\n`;

/** Imagens que o painel pode enviar ao repositório (mesmo padrão do schema, sem SVG). */
const PUBLISHABLE_IMAGE = /^src\/assets\/img\/[a-z0-9][a-z0-9-]*\.(?:webp|jpe?g|png|avif)$/;

/**
 * Lista fechada do que o painel pode gravar no repositório: o conteúdo, o
 * arquivo de acesso e imagens novas. Qualquer outro caminho é recusado antes
 * de chegar à API (código, workflows e configuração ficam fora de alcance).
 * @param {string} path
 */
export const isPublishablePath = (path) =>
  path === 'content/content.json' || path === ACCESS_REPO_PATH || PUBLISHABLE_IMAGE.test(path);

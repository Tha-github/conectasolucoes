// Tela de acesso do painel: configuração inicial (token + senha), entrada com
// senha e troca de senha. O token decifrado fica só na memória desta aba;
// nada de acesso é gravado no navegador. Detalhes e limites em lib/access.js.

import {
  ACCESS_REPO_PATH,
  decryptToken,
  encryptToken,
  isGitHubToken,
  parseAccessFile,
  passwordProblem,
  serializeAccessFile,
  textToBase64,
} from '../../lib/access.js';
import { createGitHub, describeGitHubError } from './github.js';

const $ = (selector) => document.querySelector(selector);

function show(view) {
  for (const section of document.querySelectorAll('[data-auth-view]')) {
    section.hidden = section.getAttribute('data-auth-view') !== view;
  }
  const first = $(`[data-auth-view="${view}"] input`);
  first?.focus();
}

function setStatus(element, message, kind) {
  element.textContent = message;
  element.hidden = !message;
  element.dataset.kind = kind ?? '';
}

function fieldError(input, message) {
  input.setAttribute('aria-invalid', String(Boolean(message)));
  const error = document.getElementById(`${input.id}-erro`);
  if (error) {
    error.textContent = message ?? '';
    error.hidden = !message;
  }
}

function setBusy(form, busy) {
  for (const control of form.elements) control.disabled = busy;
}

async function loadAccessFile() {
  const response = await fetch(`acesso.json?v=${Date.now()}`, { cache: 'no-store', credentials: 'same-origin' });
  if (response.status === 404) return { missing: true, file: null };
  if (!response.ok) throw new Error('indisponível');
  return { missing: false, file: parseAccessFile(await response.text()) };
}

/** Grava o arquivo de acesso cifrado no repositório (um commit). */
async function saveAccess(github, file, message) {
  await github.commitFiles([{ path: ACCESS_REPO_PATH, base64: textToBase64(serializeAccessFile(file)) }], message);
}

/**
 * Mostra a tela de acesso até o painel ser destravado.
 * @returns {Promise<{ github: ReturnType<typeof createGitHub>, token: string }>}
 */
export function requireAccess() {
  return new Promise((resolve) => {
    const status = /** @type {HTMLElement} */ ($('#auth-status'));
    const loginForm = /** @type {HTMLFormElement} */ ($('#form-login'));
    const setupForm = /** @type {HTMLFormElement} */ ($('#form-setup'));
    let accessFile = null;

    const unlock = (session) => {
      $('#auth').hidden = true;
      resolve(session);
    };

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const input = /** @type {HTMLInputElement} */ (loginForm.elements.namedItem('senha'));
      fieldError(input, '');
      if (!input.value) return fieldError(input, 'Digite a senha.');
      setBusy(loginForm, true);
      setStatus(status, 'Verificando…', 'info');
      const token = accessFile ? await decryptToken(accessFile, input.value) : null;
      setBusy(loginForm, false);
      if (!token) {
        setStatus(status, '', '');
        input.value = '';
        fieldError(input, 'Senha incorreta.');
        input.focus();
        return;
      }
      input.value = '';
      setStatus(status, '', '');
      unlock({ github: createGitHub(token), token });
    });

    setupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const tokenInput = /** @type {HTMLInputElement} */ (setupForm.elements.namedItem('token'));
      const passInput = /** @type {HTMLInputElement} */ (setupForm.elements.namedItem('nova-senha'));
      const confirmInput = /** @type {HTMLInputElement} */ (setupForm.elements.namedItem('confirmar-senha'));
      const token = tokenInput.value.trim();
      const tokenError = isGitHubToken(token) ? null : 'Cole a chave completa (começa com github_pat_).';
      const passError = passwordProblem(passInput.value);
      const confirmError = passInput.value === confirmInput.value ? null : 'As senhas não conferem.';
      fieldError(tokenInput, tokenError);
      fieldError(passInput, passError);
      fieldError(confirmInput, confirmError);
      if (tokenError || passError || confirmError) return;

      setBusy(setupForm, true);
      setStatus(status, 'Conferindo a chave no GitHub e salvando o acesso cifrado…', 'info');
      try {
        const github = createGitHub(token);
        await github.checkPush();
        await saveAccess(github, await encryptToken(token, passInput.value), 'Painel: configuração do acesso');
        setupForm.reset();
        setStatus(status, '', '');
        unlock({ github, token });
      } catch (error) {
        setStatus(status, describeGitHubError(error), 'error');
      } finally {
        setBusy(setupForm, false);
      }
    });

    $('[data-auth="reconfigure"]').addEventListener('click', () => show('setup'));
    $('[data-auth="back"]').addEventListener('click', () => show(accessFile ? 'login' : 'setup'));

    loadAccessFile().then(
      ({ missing, file }) => {
        accessFile = file;
        $('[data-auth="back"]').hidden = !file;
        if (file) show('login');
        else {
          show('setup');
          if (!missing) setStatus(status, 'O arquivo de acesso está inválido. Reconfigure o acesso.', 'error');
        }
      },
      () => setStatus(status, 'Não foi possível carregar o painel. Verifique a conexão e recarregue.', 'error'),
    );
  });
}

/**
 * Troca a senha: cifra o mesmo token com a nova senha e grava no repositório.
 * @param {string} token já decifrado nesta sessão
 */
export async function changePassword(github, token, password) {
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);
  await saveAccess(github, await encryptToken(token, password), 'Painel: troca de senha');
}

// Painel de conteúdo (estático). Edita apenas valores do schema, mostra a
// prévia, salva rascunho NESTE navegador e exporta/importa JSON validado.
// Não publica nada, não chama serviços externos e não guarda credenciais.

import {
  changedPaths,
  getAt,
  labelForPath,
  setValue,
  statusMessages,
  uploadedImagePath,
} from '../../lib/admin-model.js';
import { resolveWithDefaults } from '../../lib/defaults.js';
import { renderPreview, themeCss } from '../../lib/preview.js';
import { IMAGE_PATH_PATTERN, walkSchema } from '../../lib/schema.js';
import { githubUploadUrl } from '../../lib/site.js';
import { loadDraft, saveDraft } from '../../lib/storage.js';
import { exportContent, exportFileName, importContent } from '../../lib/transfer.js';
import {
  MAX_CONTENT_JSON_LENGTH,
  contrastErrors,
  fieldAt,
  validateContent,
  validateField,
} from '../../lib/validate.js';
import { confirmDialog } from './dialog.js';
import { createForm } from './form.js';
import { createImageStore } from './image-store.js';
import { confirmImage, processImage } from './image-editor.js';

const $ = (selector) => document.querySelector(selector);
const ROOT = '../';

/** Erro com mensagem própria para o usuário (sem detalhes internos). */
class UserError extends Error {}

const state = {
  published: /** @type {any} */ (null),
  draft: /** @type {any} */ (null),
  saved: /** @type {{ content: unknown, at: string } | null} */ (null),
  exported: /** @type {{ content: unknown, at: string } | null} */ (null),
  templates: /** @type {{ page: string, partials: Record<string, string> } | null} */ (null),
  /** Imagens já existentes no site (assets/img). */
  siteImages: new Set(),
  /** Imagens enviadas neste navegador: src → { url, blob, type }. */
  localImages: new Map(),
  storage: /** @type {Storage | null} */ (null),
  imageStore: /** @type {Awaited<ReturnType<typeof createImageStore>> | null} */ (null),
};

/* ---------- Utilidades ---------- */

function safeLocalStorage() {
  try {
    const storage = window.localStorage;
    storage.getItem('teste');
    return storage;
  } catch {
    return null;
  }
}

async function fetchText(url, maxLength) {
  const response = await fetch(url, { cache: 'no-cache', credentials: 'same-origin' });
  if (!response.ok) throw new UserError(`Arquivo do painel indisponível (${response.status}).`);
  const text = await response.text();
  if (text.length > maxLength) throw new UserError('Arquivo do painel maior que o esperado.');
  return text;
}

const imagePaths = () => {
  const paths = [];
  walkSchema((field, path) => field.kind === 'image' && paths.push(path));
  return paths;
};

const clone = (value) => structuredClone(value);
const now = () => new Date().toISOString();

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/* ---------- Mensagens ---------- */

/**
 * @param {'error' | 'warning' | 'success' | 'info'} kind
 * @param {string} title
 * @param {{ items?: string[], actions?: { label: string, onClick?: () => void, href?: string, download?: string, external?: boolean }[] }} [extra]
 */
function showMessage(kind, title, { items = [], actions = [] } = {}) {
  const area = $('#messages');
  const box = document.createElement('div');
  box.className = `admin-message admin-message--${kind}`;
  box.setAttribute('role', kind === 'error' || kind === 'warning' ? 'alert' : 'status');
  const heading = document.createElement('p');
  heading.className = 'admin-message__title';
  heading.textContent = title;
  box.append(heading);
  if (items.length > 0) {
    const list = document.createElement('ul');
    list.className = 'admin-message__list';
    for (const item of items.slice(0, 12)) {
      const li = document.createElement('li');
      li.textContent = item;
      list.append(li);
    }
    if (items.length > 12) {
      const li = document.createElement('li');
      li.textContent = `… e mais ${items.length - 12}.`;
      list.append(li);
    }
    box.append(list);
  }
  const bar = document.createElement('div');
  bar.className = 'admin-message__actions';
  for (const action of actions) {
    const node = document.createElement(action.href ? 'a' : 'button');
    node.className = 'button button--secondary button--sm';
    node.textContent = action.label;
    if (action.href) {
      node.setAttribute('href', action.href);
      if (action.download) node.setAttribute('download', action.download);
      if (action.external) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
        const hint = document.createElement('span');
        hint.className = 'visually-hidden';
        hint.textContent = ' (abre em nova aba)';
        node.append(hint);
      }
    } else {
      node.setAttribute('type', 'button');
      node.addEventListener('click', action.onClick);
    }
    bar.append(node);
  }
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'admin-message__close';
  close.textContent = 'Fechar';
  close.setAttribute('aria-label', `Fechar mensagem: ${title}`);
  close.addEventListener('click', () => box.remove());
  bar.append(close);
  box.append(bar);
  area.prepend(box);
  while (area.children.length > 4) area.lastElementChild.remove();
  return box;
}

const describeErrors = (errors) => errors.map((e) => `${labelForPath(e.path)}: ${e.message}`);

/* ---------- Estado → interface ---------- */

let form;

function imageInfo(path) {
  const value = getAt(state.draft, path);
  if (!value?.src) return { url: null, status: '' };
  const local = state.localImages.get(value.src);
  if (local) {
    return {
      url: local.url,
      status: 'Imagem nova, guardada só neste navegador. Envie o arquivo ao responsável técnico junto com o JSON.',
      download: { href: local.url, name: value.src.slice('assets/img/'.length) },
    };
  }
  if (state.siteImages.has(value.src)) return { url: ROOT + value.src, status: '' };
  return {
    url: null,
    status: 'Arquivo não encontrado no site nem neste navegador: será necessário enviá-lo ao responsável técnico.',
  };
}

function refreshField(path) {
  const control = form.controls.get(path);
  if (!control) return;
  const value = getAt(state.draft, path);
  const field = fieldAt(path);
  const errors = validateField(field, value, path);
  const published = getAt(state.published, path);
  control.update({
    value,
    defaultValue: published,
    errors,
    image: field.kind === 'image' ? imageInfo(path) : undefined,
  });
  form.markChanged(path, JSON.stringify(value) !== JSON.stringify(published));
}

function refreshContrast() {
  const errors = contrastErrors(state.draft.theme.colors);
  const labels = (key) => fieldAt(`theme.colors.${key}`)?.label ?? key;
  // Aviso também junto de cada cor envolvida (frente e fundo do par).
  const notices = new Map();
  const add = (key, text) => notices.set(key, [...(notices.get(key) ?? []), text]);
  for (const e of errors) {
    const key = e.path.split('.').at(-1);
    const other = e.message.match(/sobre "(\w+)"/)?.[1];
    const ratio = e.message.match(/[\d.]+:1 \(mínimo [\d.]+:1\)/)?.[0] ?? '';
    if (other) {
      add(key, `Contraste baixo sobre "${labels(other)}": ${ratio}.`);
      add(other, `Contraste baixo com "${labels(key)}": ${ratio}.`);
    } else {
      add(key, `${e.message[0].toUpperCase()}${e.message.slice(1)}.`);
    }
  }
  for (const path of form.controls.keys()) {
    if (!path.startsWith('theme.colors.')) continue;
    const key = path.split('.').at(-1);
    form.setFieldNotice(path, notices.has(key) ? `${notices.get(key).join(' ')} A prévia usa a paleta publicada.` : '');
  }
  form.setGroupMessage(
    'theme.colors',
    errors.length === 0
      ? ''
      : `Contraste insuficiente: ${errors
          .map(
            (e) =>
              `${labels(e.path.split('.').at(-1))} — ${e.message.replace(/sobre "(\w+)"/, (_, k) => `sobre "${labels(k)}"`)}`,
          )
          .join('; ')}. A prévia usa a paleta publicada até corrigir.`,
  );
}

function refreshStatus() {
  const list = $('#status');
  const items = statusMessages(state).map(({ kind, text }) => {
    const li = document.createElement('li');
    li.className = `admin-status__item admin-status__item--${kind}`;
    li.textContent = text;
    return li;
  });
  list.replaceChildren(...items);
}

function refreshAll() {
  for (const path of form.controls.keys()) refreshField(path);
  refreshContrast();
  refreshStatus();
  schedulePreview();
}

/* ---------- Prévia ---------- */

let previewTimer;
let previewThemeUrl = null;
function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPreviewNow, 200);
}

function renderPreviewNow() {
  const frame = /** @type {HTMLIFrameElement} */ ($('#preview'));
  try {
    const { value } = resolveWithDefaults(state.draft, state.published);
    const imageUrls = new Map([...state.localImages].map(([src, image]) => [src, image.url]));
    // Cores do rascunho (já validadas como #RRGGBB) num stylesheet local.
    const themeUrl = URL.createObjectURL(new Blob([themeCss(value.theme.colors)], { type: 'text/css' }));
    const html = renderPreview(state.templates, value, { root: ROOT, imageUrls, themeUrl });
    const scrollY = frame.contentWindow?.scrollY ?? 0;
    const previous = previewThemeUrl;
    previewThemeUrl = themeUrl;
    frame.addEventListener(
      'load',
      () => {
        frame.contentWindow?.scrollTo(0, scrollY);
        if (previous) URL.revokeObjectURL(previous);
      },
      { once: true },
    );
    frame.srcdoc = html;
  } catch {
    frame.srcdoc = '<p>Não foi possível gerar a prévia.</p>';
  }
}

/* ---------- Ações ---------- */

function change(path, value) {
  state.draft = setValue(state.draft, path, value);
  refreshField(path);
  if (path.startsWith('theme.colors.')) refreshContrast();
  refreshStatus();
  schedulePreview();
}

function firstInvalid(errors) {
  const path = errors[0]?.path ?? '';
  const control =
    form.controls.get(path) ??
    form.controls.get(path.replace(/\.(src|alt)$/, '')) ??
    form.controls.get(path.replace(/\.[^.]+$/, ''));
  control?.focus();
}

function requireValid(action) {
  const result = validateContent(state.draft);
  if (result.ok) return true;
  showMessage('error', `Corrija os campos indicados antes de ${action}.`, { items: describeErrors(result.errors) });
  firstInvalid(result.errors);
  return false;
}

/** Imagens enviadas neste navegador que o rascunho referencia. */
const referencedLocalImages = () =>
  imagePaths()
    .map((path) => getAt(state.draft, path)?.src)
    .filter((src) => src && state.localImages.has(src));

async function save() {
  if (!requireValid('salvar')) return;
  const result = saveDraft(state.storage, state.draft);
  if (!result.ok) {
    showMessage('error', result.message, { actions: [{ label: 'Exportar JSON', onClick: doExport }] });
    return;
  }
  state.saved = { content: clone(state.draft), at: result.savedAt };
  // Remove do IndexedDB imagens enviadas que o rascunho salvo não usa mais.
  const keep = new Set(referencedLocalImages());
  for (const src of (await state.imageStore.keys().catch(() => [])) ?? []) {
    if (!keep.has(src)) await state.imageStore.remove(src).catch(() => {});
  }
  refreshStatus();
  showMessage('success', 'Rascunho salvo neste navegador. Nada foi publicado.');
}

function doExport() {
  if (!requireValid('exportar')) return false;
  const json = exportContent(state.draft);
  download(new Blob([json], { type: 'application/json' }), exportFileName());
  state.exported = { content: clone(state.draft), at: now() };
  refreshStatus();
  const images = referencedLocalImages();
  // Mesmo conteúdo com o nome exato do arquivo do repositório, para o Pull Request.
  const forRepository = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const uploadContent = githubUploadUrl('content');
  const uploadImages = githubUploadUrl('src/assets/img');
  showMessage(
    'success',
    images.length > 0
      ? 'Arquivo exportado. Baixe também as imagens novas e envie tudo para publicação (Pull Request no GitHub ou responsável técnico). Nada foi publicado.'
      : 'Arquivo exportado. Envie-o para publicação (Pull Request no GitHub ou responsável técnico). Nada foi publicado.',
    {
      actions: [
        { label: 'Baixar como content.json (para o GitHub)', href: forRepository, download: 'content.json' },
        ...images.map((src) => ({
          label: `Baixar ${src.slice('assets/img/'.length)}`,
          href: state.localImages.get(src).url,
          download: src.slice('assets/img/'.length),
        })),
        ...(uploadContent ? [{ label: 'Enviar content.json no GitHub', href: uploadContent, external: true }] : []),
        ...(uploadImages && images.length > 0
          ? [{ label: 'Enviar imagens no GitHub', href: uploadImages, external: true }]
          : []),
      ],
    },
  );
  return true;
}

const hasWork = () => changedPaths(state.draft, state.published).length > 0;

/** Pergunta antes de descartar o conteúdo do editor; oferece exportar antes. */
async function confirmReplace(title, text, confirmLabel) {
  if (!hasWork()) return true;
  for (;;) {
    const choice = await confirmDialog($('#confirm-dialog'), { title, text, confirmLabel });
    if (choice === 'cancel') return false;
    if (choice === 'confirm') return true;
    doExport();
  }
}

async function importFile(file) {
  if (file.size > MAX_CONTENT_JSON_LENGTH) {
    showMessage('error', 'O arquivo não foi importado: é grande demais para um conteúdo exportado por este painel.');
    return;
  }
  let text;
  try {
    text = await file.text();
  } catch {
    showMessage('error', 'Não foi possível ler o arquivo selecionado.');
    return;
  }
  const result = importContent(text);
  if (!result.ok) {
    showMessage('error', 'O arquivo não foi importado. Nada foi alterado.', { items: describeErrors(result.errors) });
    return;
  }
  const proceed = await confirmReplace(
    'Substituir o conteúdo do editor?',
    'O conteúdo do arquivo substituirá o que está no editor agora. Para guardar o conteúdo atual, exporte-o antes.',
    'Substituir pelo arquivo',
  );
  if (!proceed) return;

  state.draft = clone(result.value);
  await loadLocalImages();
  const missing = imagePaths()
    .map((path) => [path, getAt(state.draft, path)?.src])
    .filter(([, src]) => src && !state.siteImages.has(src) && !state.localImages.has(src))
    .map(([path, src]) => `${labelForPath(path)}: ${src}`);
  refreshAll();
  showMessage(
    'success',
    'Arquivo importado para o editor. Revise a prévia e salve o rascunho se quiser mantê-lo neste navegador. Nada foi publicado.',
  );
  if (missing.length > 0) {
    showMessage(
      'warning',
      'Algumas imagens do arquivo não existem no site nem neste navegador. A prévia mostra o texto alternativo; os arquivos precisarão ser enviados ao responsável técnico.',
      {
        items: missing,
      },
    );
  }
}

async function resetToPublished() {
  const proceed = await confirmReplace(
    'Restaurar o conteúdo publicado?',
    'Todos os campos voltarão aos valores publicados no site. O rascunho salvo neste navegador só muda quando você salvar.',
    'Restaurar padrão',
  );
  if (!proceed) return;
  state.draft = clone(state.published);
  refreshAll();
  showMessage(
    'info',
    'Campos restaurados para o conteúdo publicado. Salve o rascunho para manter assim neste navegador.',
  );
}

let imageBusy = false;

async function receiveImage(path, file) {
  if (imageBusy) return;
  imageBusy = true;
  const field = fieldAt(path);
  const busy = $('#busy');
  busy.textContent = 'Processando imagem…';
  try {
    const result = await processImage(file, field);
    if (!result.ok) {
      showMessage('error', `Imagem recusada (${labelForPath(path)}). Nada foi alterado.`, { items: result.errors });
      return;
    }
    const url = URL.createObjectURL(result.blob);
    const current = getAt(state.draft, path);
    const decision = await confirmImage($('#image-dialog'), {
      label: labelForPath(path),
      field,
      result,
      url,
      alt: current.alt,
      focus: current.focus,
    });
    if (!decision) {
      URL.revokeObjectURL(url);
      showMessage('info', 'Substituição de imagem cancelada. Nada foi alterado.');
      return;
    }
    const src = uploadedImagePath(path, result.format);
    if (!IMAGE_PATH_PATTERN.test(src)) {
      URL.revokeObjectURL(url);
      return;
    }
    try {
      await state.imageStore.put({ src, type: result.blob.type, blob: result.blob });
    } catch {
      showMessage(
        'warning',
        'A imagem não pôde ser guardada neste navegador e será perdida ao recarregar a página. Exporte e baixe o arquivo antes de sair.',
      );
    }
    state.localImages.set(src, { url, blob: result.blob, type: result.blob.type });
    change(path, { src, alt: decision.alt, focus: decision.focus });
    showMessage(
      'success',
      `Imagem aplicada ao rascunho (${result.width}×${result.height} px${result.optimized ? ', otimizada em WebP' : ''}). ` +
        'Ela aparece na prévia, mas só existirá no site depois de publicada.',
    );
  } finally {
    imageBusy = false;
    busy.textContent = '';
  }
}

async function loadLocalImages() {
  for (const path of imagePaths()) {
    const src = getAt(state.draft, path)?.src;
    if (!src || state.siteImages.has(src) || state.localImages.has(src)) continue;
    const record = await state.imageStore.get(src).catch(() => undefined);
    if (record?.blob instanceof Blob && record.src === src && IMAGE_PATH_PATTERN.test(src)) {
      state.localImages.set(src, { url: URL.createObjectURL(record.blob), blob: record.blob, type: record.type });
    }
  }
}

/* ---------- Inicialização ---------- */

function fatal(message) {
  $('#loading').textContent = message;
  $('#status').replaceChildren();
  const li = document.createElement('li');
  li.className = 'admin-status__item admin-status__item--unsaved';
  li.textContent = 'Painel indisponível';
  $('#status').append(li);
}

async function init() {
  let contentText, templatesText, imagesText;
  try {
    [contentText, templatesText, imagesText] = await Promise.all([
      fetchText(`${ROOT}content/content.json`, MAX_CONTENT_JSON_LENGTH),
      fetchText('preview-templates.json', 500_000),
      fetchText('images.json', 200_000),
    ]);
  } catch (error) {
    fatal(
      error instanceof UserError
        ? `Não foi possível carregar o painel: ${error.message} Recarregue a página.`
        : 'Não foi possível carregar o painel. Verifique a conexão e recarregue a página.',
    );
    return;
  }

  const published = importContent(contentText);
  let templates, manifest;
  try {
    templates = JSON.parse(templatesText);
    manifest = JSON.parse(imagesText);
  } catch {
    templates = null;
  }
  const templatesOk =
    templates &&
    typeof templates.page === 'string' &&
    templates.partials &&
    Object.values(templates.partials).every((p) => typeof p === 'string');
  if (!published.ok || !templatesOk) {
    fatal('O conteúdo publicado não pôde ser validado. Avise o responsável técnico.');
    return;
  }

  state.published = published.value;
  state.templates = templates;
  for (const image of Array.isArray(manifest?.images) ? manifest.images : []) {
    if (typeof image?.src === 'string' && IMAGE_PATH_PATTERN.test(image.src)) state.siteImages.add(image.src);
  }
  state.storage = safeLocalStorage();
  state.imageStore = await createImageStore();

  const draft = loadDraft(state.storage, state.published);
  state.draft = clone(draft.value);
  if (draft.status === 'ok') state.saved = { content: clone(draft.value), at: draft.savedAt ?? now() };
  await loadLocalImages();

  $('#loading').remove();
  form = createForm($('#editor-form'), $('#group-nav'), {
    onChange: change,
    onRestore: (path) => change(path, clone(getAt(state.published, path))),
    onImageFile: receiveImage,
  });
  refreshAll();

  if (!state.storage) {
    showMessage(
      'warning',
      'O armazenamento deste navegador está indisponível (navegação privada ou bloqueio). Você pode editar e exportar, mas não salvar rascunho.',
    );
  }
  if (!state.imageStore.persistent) {
    showMessage(
      'warning',
      'Imagens enviadas não serão mantidas ao recarregar a página neste navegador. Exporte antes de sair.',
    );
  }
  if (draft.status === 'ok') {
    showMessage('info', 'Rascunho salvo neste navegador carregado. Ele ainda não foi publicado.');
  } else if (draft.status === 'repaired') {
    showMessage(
      'warning',
      'O rascunho salvo tinha campos inválidos ou de uma versão anterior; eles voltaram ao valor publicado. Revise e salve novamente.',
      {
        items: describeErrors(draft.issues),
      },
    );
  } else if (draft.status === 'error') {
    showMessage(
      'warning',
      'O rascunho salvo neste navegador não pôde ser lido e foi ignorado. Ele continua guardado até você salvar de novo.',
    );
  }

  for (const button of document.querySelectorAll('[data-action]')) button.removeAttribute('disabled');
  $('[data-action="save"]').addEventListener('click', save);
  $('[data-action="export"]').addEventListener('click', doExport);
  $('[data-action="reset"]').addEventListener('click', resetToPublished);
  const importInput = /** @type {HTMLInputElement} */ ($('#import-file'));
  $('[data-action="import"]').addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', () => {
    const [file] = importInput.files ?? [];
    importInput.value = '';
    if (file) importFile(file);
  });

  for (const button of document.querySelectorAll('[data-preview-width]')) {
    button.addEventListener('click', () => {
      for (const other of document.querySelectorAll('[data-preview-width]'))
        other.setAttribute('aria-pressed', String(other === button));
      $('.admin-preview__viewport').setAttribute('data-width', button.getAttribute('data-preview-width'));
    });
  }

  window.addEventListener('beforeunload', (event) => {
    const unsaved = changedPaths(state.draft, state.saved ? state.saved.content : state.published).length > 0;
    if (unsaved) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
}

init();

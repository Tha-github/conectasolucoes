// Substituição de imagem no painel: valida, decodifica, otimiza e pede
// confirmação com prévia nas molduras reais do site e escolha de enquadramento.
// Nada é aplicado ao rascunho até o usuário clicar em "Aplicar".

import { checkOriginalUpload, chooseOutput, planResize } from '../../lib/admin-model.js';
import { readImageMeta } from '../../lib/image-meta.js';
import { FOCUS_LABELS, FOCUS_POSITIONS } from '../../lib/schema.js';

/** Mesmos pontos de object-position de .media__img--focus-* (components.css). */
const FOCUS_CSS = { center: '50% 50%', top: '50% 20%', bottom: '50% 80%', left: '25% 50%', right: '75% 50%' };
const WEBP_QUALITY = 0.85;

async function encodeWebp(bitmap, width, height) {
  let canvas;
  if (typeof OffscreenCanvas === 'function') {
    canvas = new OffscreenCanvas(width, height);
  } else {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return null;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  const blob =
    'convertToBlob' in canvas
      ? await canvas.convertToBlob({ type: 'image/webp', quality: WEBP_QUALITY })
      : await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY));
  // Navegadores sem codificador WebP devolvem PNG: tratado como "não otimizado".
  return blob && blob.type === 'image/webp' ? blob : null;
}

/**
 * Processa o arquivo escolhido para um campo de imagem.
 * @param {File} file
 * @param {import('../../lib/schema.js').ImageField} field
 * @returns {Promise<{ ok: false, errors: string[] } | {
 *   ok: true, blob: Blob, format: string, width: number, height: number,
 *   original: { format: string, width: number, height: number, size: number }, optimized: boolean
 * }>}
 */
export async function processImage(file, field) {
  const precheck = checkOriginalUpload(file, null, field);
  if (!precheck.ok) return precheck;

  let bytes;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { ok: false, errors: ['Não foi possível ler o arquivo selecionado.'] };
  }
  const header = checkOriginalUpload(file, bytes, field);
  if (!header.ok) return header;

  // Decodificação real: cabeçalho válido com dados corrompidos falha aqui.
  let bitmap;
  try {
    bitmap = await createImageBitmap(new Blob([bytes], { type: file.type }));
  } catch {
    return {
      ok: false,
      errors: [
        'A imagem está corrompida ou o formato não é suportado por este navegador. Tente outro arquivo ou exporte como JPEG/PNG/WebP.',
      ],
    };
  }
  try {
    // A orientação EXIF pode girar a imagem (largura e altura trocadas).
    const swapped = bitmap.width === header.height && bitmap.height === header.width;
    if (!(bitmap.width === header.width && bitmap.height === header.height) && !swapped) {
      return {
        ok: false,
        errors: ['As dimensões decodificadas não conferem com o cabeçalho do arquivo (arquivo malformado).'],
      };
    }
    const plan = planResize(bitmap.width, bitmap.height, field);
    const webp = await encodeWebp(bitmap, plan.width, plan.height).catch(() => null);
    const optimized = webp ? { bytes: new Uint8Array(await webp.arrayBuffer()), format: 'webp' } : null;
    const original = { bytes, format: header.format };
    const choice = chooseOutput(original, optimized, plan.resize || swapped, field);
    if (!choice.ok) return choice;

    const chosen = choice.choice === 'optimized' ? optimized : original;
    const meta = readImageMeta(chosen.bytes);
    return {
      ok: true,
      blob: new Blob([chosen.bytes], { type: chosen.format === 'webp' ? 'image/webp' : file.type }),
      format: chosen.format,
      width: meta.width,
      height: meta.height,
      original: { format: header.format, width: header.width, height: header.height, size: file.size },
      optimized: choice.choice === 'optimized',
    };
  } finally {
    bitmap.close();
  }
}

const kb = (bytes) => `${Math.max(1, Math.round(bytes / 1000))} KB`;

/**
 * Diálogo de confirmação: prévia nas molduras, enquadramento e texto alternativo.
 * @param {HTMLDialogElement} dialog
 * @param {{ label: string, field: import('../../lib/schema.js').ImageField, result: Awaited<ReturnType<typeof processImage>> & { ok: true }, url: string, alt: string, focus: string }} options
 * @returns {Promise<{ alt: string, focus: string } | null>} null = cancelado
 */
export function confirmImage(dialog, { label, field, result, url, alt, focus }) {
  const previous = document.activeElement;
  dialog.querySelector('#image-dialog-title').textContent = `Substituir: ${label}`;
  const info = dialog.querySelector('#image-dialog-info');
  info.textContent =
    `Original: ${result.original.width}×${result.original.height} px, ${result.original.format.toUpperCase()}, ${kb(result.original.size)}. ` +
    (result.optimized
      ? `Otimizada para a web: ${result.width}×${result.height} px, WebP, ${kb(result.blob.size)} (metadados removidos).`
      : `Usada sem alterações: ${result.width}×${result.height} px, ${kb(result.blob.size)}.`);

  // Molduras do site; sem molduras (logo), mostra a imagem inteira.
  const frames = dialog.querySelector('#image-dialog-frames');
  frames.replaceChildren();
  const imgs = [];
  for (const frame of field.frames.length ? field.frames : [{ label: 'Imagem inteira', ratio: null }]) {
    const figure = document.createElement('figure');
    figure.className = 'admin-frame';
    const box = document.createElement('div');
    box.className = 'admin-frame__box';
    if (frame.ratio) box.style.aspectRatio = frame.ratio;
    else box.classList.add('admin-frame__box--contain');
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    imgs.push(img);
    box.append(img);
    const caption = document.createElement('figcaption');
    caption.textContent = frame.ratio ? `${frame.label} (${frame.ratio.replace(/\s/g, '')})` : frame.label;
    figure.append(box, caption);
    frames.append(figure);
  }

  const focusGroup = dialog.querySelector('#image-dialog-focus');
  focusGroup.hidden = !field.focal;
  const options = focusGroup.querySelector('.admin-focus');
  options.replaceChildren();
  let chosenFocus = field.focal && FOCUS_POSITIONS.includes(focus) ? focus : 'center';
  const applyFocus = () => imgs.forEach((img) => (img.style.objectPosition = FOCUS_CSS[chosenFocus]));
  if (field.focal) {
    for (const position of FOCUS_POSITIONS) {
      const id = `foco-${position}`;
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'image-focus';
      input.id = id;
      input.value = position;
      input.checked = position === chosenFocus;
      input.addEventListener('change', () => {
        chosenFocus = position;
        applyFocus();
      });
      const labelEl = document.createElement('label');
      labelEl.htmlFor = id;
      labelEl.className = 'admin-focus__option';
      labelEl.append(input, ` ${FOCUS_LABELS[position]}`);
      options.append(labelEl);
    }
  }
  applyFocus();

  const altInput = /** @type {HTMLInputElement} */ (dialog.querySelector('#image-dialog-alt'));
  const altError = dialog.querySelector('#image-dialog-alt-erro');
  const altCount = dialog.querySelector('#image-dialog-alt-contador');
  altInput.maxLength = field.altMaxLength;
  altInput.value = alt;
  altError.hidden = true;
  altInput.removeAttribute('aria-invalid');
  const count = () => (altCount.textContent = `${altInput.value.length}/${field.altMaxLength}`);
  count();
  altInput.oninput = () => {
    altInput.value = altInput.value.replace(/[\r\n\t]+/g, ' ');
    count();
  };

  return new Promise((resolve) => {
    const onClick = (event) => {
      const button = event.target instanceof Element ? event.target.closest('[data-image-choice]') : null;
      if (!button) return;
      if (button.getAttribute('data-image-choice') === 'apply') {
        if (altInput.value.trim().length === 0) {
          altError.textContent = 'Descreva a imagem: o texto alternativo é obrigatório.';
          altError.hidden = false;
          altInput.setAttribute('aria-invalid', 'true');
          altInput.focus();
          return;
        }
        dialog.close('apply');
      } else {
        dialog.close('cancel');
      }
    };
    const onClose = () => {
      dialog.removeEventListener('click', onClick);
      dialog.removeEventListener('close', onClose);
      if (previous instanceof HTMLElement) previous.focus();
      resolve(dialog.returnValue === 'apply' ? { alt: altInput.value.trim(), focus: chosenFocus } : null);
    };
    dialog.returnValue = 'cancel';
    dialog.addEventListener('click', onClick);
    dialog.addEventListener('close', onClose);
    dialog.showModal();
    // Foco na opção segura sem rolar: o título e a prévia ficam visíveis no celular.
    dialog.querySelector('[data-image-choice="cancel"]').focus({ preventScroll: true });
    dialog.scrollTop = 0;
  });
}

// Formulário do painel, gerado a partir do schema. Um controle por campo
// existente; nenhum controle cria, remove ou reordena itens. Todo conteúdo do
// usuário entra no DOM por textContent/value, nunca como HTML.

import { MIME_BY_FORMAT, normalizeHex, uploadFormats } from '../../lib/admin-model.js';
import { FOCUS_LABELS, FOCUS_POSITIONS, contentSchema } from '../../lib/schema.js';

const idFor = (path) => `campo-${path.replace(/[^a-zA-Z0-9]+/g, '-')}`;

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (name === 'text') node.textContent = value;
    else if (name === 'className') node.className = value;
    else node.setAttribute(name, value === true ? '' : String(value));
  }
  node.append(...children.filter(Boolean));
  return node;
}

const kb = (bytes) => `${Math.floor(bytes / 1000)} KB`;

/** Remove quebras de linha e tabulações (campos são de uma linha). */
const singleLine = (value) => value.replace(/[\r\n\t]+/g, ' ');

/**
 * @param {{ onChange: (path: string, value: unknown) => void, onRestore: (path: string) => void, onImageFile: (path: string, file: File) => void }} handlers
 */
export function createForm(form, nav, handlers) {
  /** @type {Map<string, { update: (state: object) => void, focus: () => void }>} */
  const controls = new Map();
  const groupMessages = new Map();

  function messageNode(id) {
    return el('p', { className: 'field__message field__message--error', id, hidden: true });
  }

  function showErrors(node, input, errors) {
    node.hidden = errors.length === 0;
    node.textContent = errors.map((e) => e.message).join(' · ');
    if (!input) return;
    if (errors.length > 0) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  function restoreButton(path, label) {
    const button = el('button', {
      type: 'button',
      className: 'admin-field__restore',
      hidden: true,
      text: 'Restaurar padrão',
      'aria-label': `Restaurar valor publicado de ${label}`,
    });
    button.addEventListener('click', () => handlers.onRestore(path));
    return button;
  }

  /**
   * @param {(value: string) => void} [onInput] padrão: altera o próprio campo
   * @param {boolean} [withRestore] botão "Restaurar padrão" do campo
   */
  function textControl(
    path,
    field,
    labelText = field.label,
    onInput = (v) => handlers.onChange(path, v),
    withRestore = true,
  ) {
    const id = idFor(path);
    const counter = el('span', { className: 'admin-field__count', id: `${id}-contador` });
    const error = messageNode(`${id}-erro`);
    const multi = field.maxLength > 120;
    const input = el(multi ? 'textarea' : 'input', {
      className: 'field__control',
      id,
      type: multi ? null : 'text',
      rows: multi ? Math.min(6, Math.ceil(field.maxLength / 110) + 1) : null,
      maxlength: field.maxLength,
      spellcheck: 'true',
      autocomplete: 'off',
      'aria-describedby': `${id}-contador ${id}-erro`,
    });
    input.addEventListener('input', () => {
      const clean = singleLine(input.value);
      if (clean !== input.value) input.value = clean;
      onInput(clean);
    });
    const restore = withRestore ? restoreButton(path, labelText) : null;
    const node = el('div', { className: 'field admin-field', 'data-path': path }, [
      el('div', { className: 'admin-field__head' }, [
        el('label', { className: 'field__label', for: id, text: labelText }),
        counter,
      ]),
      input,
      error,
      restore,
    ]);
    return {
      node,
      update({ value, defaultValue, errors }) {
        if (input.value !== value) input.value = typeof value === 'string' ? value : '';
        const length = input.value.length;
        counter.textContent = `${length}/${field.maxLength}`;
        counter.classList.toggle('admin-field__count--limit', length >= field.maxLength);
        counter.setAttribute('aria-label', `${length} de ${field.maxLength} caracteres`);
        showErrors(error, input, errors);
        if (restore) restore.hidden = value === defaultValue;
      },
      focus: () => input.focus(),
    };
  }

  function colorControl(path, field) {
    const id = idFor(path);
    const error = messageNode(`${id}-erro`);
    const picker = el('input', {
      type: 'color',
      className: 'admin-color__picker',
      id,
      'aria-describedby': `${id}-erro`,
    });
    const hex = el('input', {
      type: 'text',
      className: 'field__control admin-color__hex',
      maxlength: 7,
      spellcheck: 'false',
      autocomplete: 'off',
      'aria-label': `${field.label}: código hexadecimal`,
      'aria-describedby': `${id}-erro`,
    });
    const notice = el('p', { className: 'field__message field__message--error', id: `${id}-contraste`, hidden: true });
    hex.setAttribute('aria-describedby', `${id}-erro ${id}-contraste`);
    // Só valores válidos chegam ao rascunho; o texto digitado fica "pendente"
    // até formar uma cor válida. Escape ou sair do campo descarta o pendente.
    let committed = '';
    const typingError = (text) => {
      error.hidden = !text;
      error.textContent = text;
      if (text) hex.setAttribute('aria-invalid', 'true');
      else hex.removeAttribute('aria-invalid');
    };
    const revert = () => {
      hex.value = committed;
      typingError('');
    };
    picker.addEventListener('input', () => {
      typingError('');
      handlers.onChange(path, picker.value.toUpperCase());
    });
    hex.addEventListener('input', () => {
      const value = normalizeHex(hex.value);
      if (value) {
        typingError('');
        if (value !== committed) handlers.onChange(path, value);
      } else {
        typingError('Use o formato #RRGGBB (ex.: #343E35). A cor anterior continua aplicada.');
      }
    });
    hex.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && hex.value !== committed) {
        event.preventDefault();
        revert();
      }
    });
    hex.addEventListener('blur', () => {
      if (!normalizeHex(hex.value)) revert();
      else hex.value = committed;
    });
    const restore = restoreButton(path, field.label);
    const node = el('div', { className: 'field admin-field admin-field--color', 'data-path': path }, [
      el('label', { className: 'field__label', for: id, text: field.label }),
      el('div', { className: 'admin-color' }, [picker, hex]),
      error,
      notice,
      restore,
    ]);
    return {
      node,
      update({ value, defaultValue, errors }) {
        committed = value;
        if (/^#[0-9A-F]{6}$/i.test(value) && picker.value.toUpperCase() !== value) picker.value = value.toLowerCase();
        if (document.activeElement !== hex && hex.value !== value) hex.value = value;
        if (errors.length > 0) showErrors(error, hex, errors);
        restore.hidden = value === defaultValue;
      },
      /** Aviso de contraste ligado a este campo (texto já legível). */
      setNotice(text) {
        notice.hidden = !text;
        notice.textContent = text ?? '';
      },
      focus: () => hex.focus(),
    };
  }

  function imageControl(path, field) {
    const id = idFor(path);
    // Só formatos raster no envio pelo painel (nunca SVG).
    const accept = uploadFormats(field)
      .map((f) => MIME_BY_FORMAT[f])
      .join(',');
    const fileInput = el('input', {
      type: 'file',
      className: 'visually-hidden',
      accept,
      tabindex: '-1',
      'aria-hidden': 'true',
    });
    const pick = el('button', {
      type: 'button',
      className: 'button button--secondary button--sm',
      id: `${id}-arquivo`,
      text: 'Substituir imagem',
      'aria-describedby': `${id}-requisitos ${id}-erro`,
    });
    pick.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const [file] = fileInput.files ?? [];
      fileInput.value = '';
      if (file) handlers.onImageFile(path, file);
    });
    const thumb = el('div', { className: 'admin-image__thumb' });
    const source = el('p', { className: 'admin-image__src' });
    const local = el('p', { className: 'admin-image__local', hidden: true });
    const error = messageNode(`${id}-erro`);
    const requirements = el('p', {
      className: 'field__hint',
      id: `${id}-requisitos`,
      text:
        `Envio: ${uploadFormats(field)
          .map((f) => f.toUpperCase())
          .join(', ')} · mínimo ${field.minWidth}×${field.minHeight} px. ` +
        `Imagens maiores são reduzidas para até ${field.target.width}×${field.target.height} px e otimizadas ` +
        `(resultado final até ${kb(field.maxBytes)}), sem distorcer.`,
    });
    // O texto alternativo e o enquadramento são parte do valor da imagem ({ src, alt, focus }).
    let current = { src: null, alt: '', focus: 'center' };
    const focusSelect = field.focal
      ? el(
          'select',
          { className: 'field__control admin-select', id: `${id}-enquadramento` },
          FOCUS_POSITIONS.map((position) => el('option', { value: position, text: FOCUS_LABELS[position] })),
        )
      : null;
    focusSelect?.addEventListener('change', () => handlers.onChange(path, { ...current, focus: focusSelect.value }));
    const alt = textControl(
      `${path}.alt`,
      { kind: 'text', label: 'Texto alternativo', minLength: 1, maxLength: field.altMaxLength },
      'Texto alternativo (descreva a imagem)',
      (value) => handlers.onChange(path, { ...current, alt: value }),
      false,
    );
    const restore = restoreButton(path, field.label);
    const node = el('fieldset', { className: 'admin-field admin-field--image', 'data-path': path }, [
      el('legend', { className: 'field__label', text: field.label }),
      el('div', { className: 'admin-image' }, [
        thumb,
        el('div', { className: 'admin-image__info' }, [source, requirements, pick, fileInput, local, error]),
      ]),
      alt.node,
      focusSelect &&
        el('div', { className: 'field' }, [
          el('label', {
            className: 'field__label',
            for: `${id}-enquadramento`,
            text: 'Enquadramento (parte da foto visível quando a moldura corta)',
          }),
          focusSelect,
        ]),
      restore,
    ]);
    return {
      node,
      /** @param {{ value: { src: string | null, alt: string, focus: string }, defaultValue: unknown, errors: { path: string, message: string }[], image?: { url: string | null, status: string, download?: { href: string, name: string } } }} state */
      update({ value, defaultValue, errors, image }) {
        current = value;
        if (focusSelect && focusSelect.value !== value.focus) focusSelect.value = value.focus;
        thumb.replaceChildren(
          image?.url
            ? el('img', { src: image.url, alt: '', width: 160, height: 120, decoding: 'async' })
            : el('span', { className: 'admin-image__empty', text: value.src ? 'Arquivo indisponível' : 'Sem imagem' }),
        );
        source.textContent = value.src ? value.src : 'Sem imagem: o site exibe o texto alternativo no lugar.';
        local.hidden = !image?.status;
        local.replaceChildren();
        if (image?.status) {
          local.append(el('span', { text: image.status }));
          if (image.download) {
            local.append(
              ' ',
              el('a', {
                href: image.download.href,
                download: image.download.name,
                text: `Baixar ${image.download.name}`,
              }),
            );
          }
        }
        alt.update({ value: value.alt, defaultValue: null, errors: errors.filter((e) => e.path.endsWith('.alt')) });
        showErrors(
          error,
          null,
          errors.filter((e) => !e.path.endsWith('.alt')),
        );
        restore.hidden = JSON.stringify(value) === JSON.stringify(defaultValue);
      },
      focus: () => pick.focus(),
    };
  }

  function renderGroup(key, field, path, depth) {
    const container = el('fieldset', {
      className: depth === 0 ? 'admin-group' : 'admin-subgroup',
      id: depth === 0 ? `grupo-${key}` : null,
    });
    container.append(
      el('legend', { className: depth === 0 ? 'admin-group__title' : 'admin-subgroup__title', text: field.label }),
    );
    if (path === 'theme.colors') {
      const message = el('p', { className: 'field__message field__message--error admin-group__message', hidden: true });
      groupMessages.set(path, message);
      container.append(message);
    }
    for (const [childKey, child] of Object.entries(field.fields)) {
      const childPath = `${path}.${childKey}`;
      if (child.kind === 'object') {
        container.append(renderGroup(childKey, child, childPath, depth + 1));
        continue;
      }
      const control =
        child.kind === 'text'
          ? textControl(childPath, child)
          : child.kind === 'color'
            ? colorControl(childPath, child)
            : imageControl(childPath, child);
      controls.set(childPath, control);
      container.append(control.node);
    }
    return container;
  }

  form.replaceChildren();
  const links = [];
  /** Contador de campos alterados por área (chave do grupo → elemento). */
  const groupCounts = new Map();
  for (const [key, field] of Object.entries(contentSchema.fields)) {
    if (field.kind !== 'object') continue;
    form.append(renderGroup(key, field, key, 0));
    const count = el('span', { className: 'admin-chip__count', hidden: true });
    groupCounts.set(key, count);
    links.push(
      el('a', { className: 'admin-chip', href: `#grupo-${key}` }, [
        el('span', { className: 'admin-chip__label', text: field.label }),
        count,
      ]),
    );
  }
  links.push(el('a', { className: 'admin-chip', href: '#previa', text: 'Prévia' }));
  nav.replaceChildren(...links);
  form.addEventListener('submit', (event) => event.preventDefault());

  /** Campos com valor diferente do publicado. */
  const changed = new Set();

  return {
    controls,
    /**
     * Marca um campo como alterado em relação ao publicado e atualiza o
     * contador da área no menu (número + texto para leitores de tela).
     */
    markChanged(path, isChanged) {
      const control = controls.get(path);
      if (!control) return;
      control.node.toggleAttribute('data-changed', isChanged);
      if (isChanged) changed.add(path);
      else changed.delete(path);
      const group = path.split('.')[0];
      const count = groupCounts.get(group);
      if (!count) return;
      const total = [...changed].filter((p) => p.split('.')[0] === group).length;
      count.hidden = total === 0;
      count.replaceChildren(
        String(total),
        el('span', { className: 'visually-hidden', text: total === 1 ? ' campo alterado' : ' campos alterados' }),
      );
    },
    /** Aviso ligado a um campo de cor (ex.: contraste com outra cor). */
    setFieldNotice(path, text) {
      controls.get(path)?.setNotice?.(text);
    },
    /** Mensagem de grupo (ex.: contraste das cores). */
    setGroupMessage(path, text) {
      const node = groupMessages.get(path);
      if (!node) return;
      node.hidden = !text;
      node.textContent = text ?? '';
    },
  };
}

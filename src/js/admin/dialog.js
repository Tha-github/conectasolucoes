// Confirmação modal com <dialog> nativo (foco preso e Escape = cancelar).

/**
 * @param {HTMLDialogElement} dialog
 * @param {{ title: string, text: string, confirmLabel: string, offerExport?: boolean }} options
 * @returns {Promise<'confirm' | 'export' | 'cancel'>}
 */
export function confirmDialog(dialog, { title, text, confirmLabel, offerExport = true }) {
  const previous = document.activeElement;
  dialog.querySelector('#confirm-title').textContent = title;
  dialog.querySelector('#confirm-text').textContent = text;
  dialog.querySelector('[data-choice="confirm"]').textContent = confirmLabel;
  dialog.querySelector('[data-choice="export"]').hidden = !offerExport;

  return new Promise((resolve) => {
    const onClick = (event) => {
      const button = event.target instanceof Element ? event.target.closest('[data-choice]') : null;
      if (button) dialog.close(button.getAttribute('data-choice'));
    };
    const onClose = () => {
      dialog.removeEventListener('click', onClick);
      dialog.removeEventListener('close', onClose);
      if (previous instanceof HTMLElement) previous.focus();
      const choice = dialog.returnValue;
      resolve(choice === 'confirm' || choice === 'export' ? choice : 'cancel');
    };
    dialog.returnValue = 'cancel';
    dialog.addEventListener('click', onClick);
    dialog.addEventListener('close', onClose);
    dialog.showModal();
    dialog.querySelector('[data-choice="cancel"]').focus();
  });
}

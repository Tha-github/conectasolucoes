// Substitui imagens que falharam ao carregar por um bloco com o texto
// alternativo, preservando o espaço e a informação para leitores de tela.

/**
 * Equivalente em DOM de mediaFallbackHtml (lib/template.js).
 * @param {Document} doc
 * @param {{ alt: string, className?: string }} options
 */
export function createMediaFallback(doc, { alt, className = '' }) {
  const box = doc.createElement('span');
  box.className = ['media-fallback', className].filter(Boolean).join(' ');
  if (!alt) {
    box.setAttribute('aria-hidden', 'true');
    return box;
  }
  box.setAttribute('role', 'img');
  box.setAttribute('aria-label', alt);
  const label = doc.createElement('span');
  label.className = 'media-fallback__text';
  label.textContent = alt;
  box.append(label);
  return box;
}

function replaceBrokenImage(img) {
  if (!img.isConnected) return;
  const fallback = createMediaFallback(img.ownerDocument, {
    alt: img.getAttribute('alt') ?? '',
    className: img.getAttribute('class') ?? '',
  });
  const width = img.getAttribute('width');
  const height = img.getAttribute('height');
  if (width && height) fallback.style.aspectRatio = `${width} / ${height}`;
  img.replaceWith(fallback);
}

/** @param {Document} doc */
export function initMediaFallback(doc) {
  // O evento "error" de <img> não propaga; a captura no documento o recebe.
  doc.addEventListener(
    'error',
    (event) => {
      const target = event.target;
      if (target instanceof HTMLImageElement && target.hasAttribute('data-media-fallback')) {
        replaceBrokenImage(target);
      }
    },
    true,
  );
  // Imagens que falharam antes de este script carregar.
  for (const img of doc.querySelectorAll('img[data-media-fallback]')) {
    if (img.complete && img.naturalWidth === 0) replaceBrokenImage(img);
  }
}

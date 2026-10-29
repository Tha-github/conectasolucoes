// Estado do cabeçalho ao rolar: leve no topo da página, sólido com filete
// depois. Só alterna data-scrolled; a altura não muda (sem salto de layout).
// Sem JavaScript, o CSS mantém o estado sólido.

const THRESHOLD = 8;

/** @param {Document} doc */
export function initHeaderState(doc) {
  const header = doc.querySelector('.site-header');
  const win = doc.defaultView;
  if (!header || !win) return;

  let frame = 0;
  const update = () => {
    frame = 0;
    header.setAttribute('data-scrolled', String(win.scrollY > THRESHOLD));
  };

  win.addEventListener(
    'scroll',
    () => {
      if (!frame) frame = win.requestAnimationFrame(update);
    },
    { passive: true },
  );
  update();
}

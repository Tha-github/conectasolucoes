// Menu do cabeçalho em telas pequenas (padrão "disclosure").
// Sem JavaScript — ou em navegadores sem @media (scripting) — o CSS mantém os
// links sempre visíveis e oculta o botão; este módulo só controla abrir/fechar.

const DESKTOP_QUERY = '(min-width: 64em)';

/** @param {Document} doc */
export function initNav(doc) {
  const toggle = doc.querySelector('.nav-toggle[aria-controls]');
  const nav = toggle && doc.getElementById(toggle.getAttribute('aria-controls') ?? '');
  if (!toggle || !nav) return;

  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

  const setOpen = (open, { returnFocus = false } = {}) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.toggleAttribute('data-open', open);
    if (!open && returnFocus) toggle.focus();
  };

  toggle.addEventListener('click', () => setOpen(!isOpen()));

  // Escolher um destino fecha o menu.
  nav.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a')) setOpen(false);
  });

  doc.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) setOpen(false, { returnFocus: true });
  });

  // Clique fora ou foco saindo do cabeçalho fecham o menu.
  const header = toggle.closest('header') ?? nav;
  doc.addEventListener('click', (event) => {
    if (isOpen() && event.target instanceof Node && !header.contains(event.target)) setOpen(false);
  });
  header.addEventListener('focusout', (event) => {
    if (isOpen() && event.relatedTarget instanceof Node && !header.contains(event.relatedTarget)) setOpen(false);
  });

  // Ao passar para o layout de desktop, o estado do menu móvel é descartado.
  const desktop = doc.defaultView?.matchMedia(DESKTOP_QUERY);
  desktop?.addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}

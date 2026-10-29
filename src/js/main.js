// Ponto de entrada do site público. A página funciona sem JavaScript;
// este módulo apenas acrescenta melhorias progressivas.

import { initHeaderState } from './header.js';
import { initMediaFallback } from './media-fallback.js';
import { initNav } from './nav.js';

initMediaFallback(document);
initNav(document);
initHeaderState(document);

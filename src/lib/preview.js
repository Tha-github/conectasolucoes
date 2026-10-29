// Renderização da prévia do painel com o MESMO template e motor da página
// pública (todo texto escapado). Executada no navegador; pura e testável.

import { WHATSAPP, whatsappUrl } from './site.js';
import { escapeHtml, renderTemplate } from './template.js';

export { themeCss } from './theme.js';

/**
 * @param {{ page: string, partials: Record<string, string> }} templates  de admin/preview-templates.json
 * @param {import('./schema.js').Content} content  conteúdo já válido
 * @param {{ root?: string, year?: string, imageUrls?: Map<string, string>, themeUrl?: string }} [options]
 *   imageUrls: caminho assets/img/… → URL blob: de imagens ainda não integradas ao repositório.
 *   themeUrl: URL blob: com themeCss(content.theme.colors), para refletir cores do rascunho
 *   (a página publicada usa css/theme.css, gerado no build).
 * @returns {string} HTML completo para iframe srcdoc
 */
export function renderPreview(
  templates,
  content,
  { root = '../', year = String(new Date().getFullYear()), imageUrls, themeUrl } = {},
) {
  let html = renderTemplate(templates.page, {
    context: {
      content,
      build: { root, basePath: '', year, whatsappUrl: whatsappUrl(), whatsappDisplay: WHATSAPP.display },
    },
    partials: templates.partials,
    resolveImage: (src) => imageUrls?.get(src),
  });
  // A prévia exibe imagens locais (blob:) que a CSP pública não permite.
  // O iframe é isolado (sandbox sem scripts); só img-src/style-src são ampliados.
  html = html.replace("img-src 'self'", "img-src 'self' blob:");
  // Scripts não rodam na prévia (sandbox); o script público é removido em vez de bloqueado.
  html = html.replace(`<script type="module" src="${root}js/main.js"></script>`, '');
  if (themeUrl) {
    const themeLink = `<link rel="stylesheet" href="${root}css/theme.css">`;
    if (!html.includes(themeLink)) throw new Error('Template sem link para css/theme.css');
    if (!/^blob:/.test(themeUrl)) throw new Error('themeUrl deve ser blob:');
    html = html
      .replace(themeLink, `<link rel="stylesheet" href="${escapeHtml(themeUrl)}">`)
      .replace("style-src 'self'", "style-src 'self' blob:");
  }
  return html;
}

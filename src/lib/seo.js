// Metadados de busca gerados no build: canonical, og:url, dados estruturados,
// robots.txt e sitemap.xml. Usa só fatos confirmados (CLAUDE.md §3) e textos
// já validados do conteúdo; nada aqui vem do painel sem passar pelo schema.

import { AREA_SERVED, WHATSAPP } from './site.js';
import { escapeHtml } from './template.js';

/**
 * Normaliza a URL pública do site (ex.: "https://usuario.github.io/repo" ou
 * "https://www.dominio.com.br"): http(s), sem credenciais, consulta ou fragmento,
 * sempre terminada em "/". "" significa "desconhecida" (sem canonical nem sitemap).
 */
export function normalizeSiteUrl(value = '') {
  const trimmed = value.trim();
  if (trimmed === '') return '';
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`SITE_URL inválida: "${value}".`);
  }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error(`SITE_URL inválida: "${value}". Use algo como "https://usuario.github.io/repo".`);
  }
  if (!/^(?:\/[A-Za-z0-9._-]+)*\/?$/.test(url.pathname)) {
    throw new Error(`SITE_URL com caminho inválido: "${value}".`);
  }
  return `${url.origin}${url.pathname.replace(/\/*$/, '/')}`;
}

/** Caracteres que poderiam encerrar o <script> ou quebrar o JSON embutido no HTML. */
const JSON_IN_HTML = new RegExp(`[<>&${String.fromCharCode(0x2028, 0x2029)}]`, 'g');
const escapeJsonForHtml = (json) =>
  json.replace(JSON_IN_HTML, (ch) => '\\' + 'u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));

/**
 * Dados estruturados schema.org da organização. Só o que é confirmado: nome,
 * descrição, telefone e região atendida. Sem endereço, avaliações, horários ou
 * logotipo (inexistentes ou não confirmados).
 * @param {import('./schema.js').Content} content
 * @param {string} siteUrl  já normalizada; "" omite "url"
 */
export function organizationJsonLd(content, siteUrl = '') {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: content.brand.name,
    description: content.meta.description,
    ...(siteUrl && { url: siteUrl }),
    telephone: `+${WHATSAPP.number}`,
    areaServed: { '@type': 'AdministrativeArea', name: AREA_SERVED },
  };
  return escapeJsonForHtml(JSON.stringify(data));
}

/**
 * Imagem de compartilhamento: a fotografia do destaque, em URL absoluta. Só
 * existe com imagem raster publicada e URL pública conhecida (redes sociais
 * não leem SVG nem caminhos relativos).
 * @param {import('./schema.js').Content} content
 */
export function shareImage(content, siteUrl = '') {
  const { src, alt } = content.hero.image;
  if (!siteUrl || !src || /\.svg$/i.test(src)) return null;
  return { url: new URL(src, siteUrl).href, alt };
}

/**
 * Bloco inserido antes de </head> da página inicial. Canonical e og:url só
 * existem quando a URL pública é conhecida (no CI, vem de actions/configure-pages).
 */
export function seoHead(content, siteUrl = '') {
  const lines = [];
  if (siteUrl) {
    lines.push(`    <link rel="canonical" href="${escapeHtml(siteUrl)}">`);
    lines.push(`    <meta property="og:url" content="${escapeHtml(siteUrl)}">`);
  }
  const image = shareImage(content, siteUrl);
  if (image) {
    lines.push(`    <meta property="og:image" content="${escapeHtml(image.url)}">`);
    lines.push(`    <meta property="og:image:alt" content="${escapeHtml(image.alt)}">`);
    lines.push(`    <meta name="twitter:image" content="${escapeHtml(image.url)}">`);
    lines.push(`    <meta name="twitter:image:alt" content="${escapeHtml(image.alt)}">`);
  }
  lines.push(`    <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`);
  lines.push(`    <script type="application/ld+json">${organizationJsonLd(content, siteUrl)}</script>`);
  return lines.join('\n') + '\n';
}

/**
 * robots.txt: tudo liberado. O painel não é listado de propósito: ele tem
 * "noindex" (que o buscador só lê se puder rastrear a página) e citá-lo aqui
 * apenas divulgaria o endereço. Só tem efeito na raiz do domínio.
 */
export function robotsTxt(siteUrl = '') {
  const lines = ['User-agent: *', 'Allow: /'];
  if (siteUrl) lines.push('', `Sitemap: ${siteUrl}sitemap.xml`);
  return lines.join('\n') + '\n';
}

/** sitemap.xml com a única página indexável (o painel e a 404 têm noindex). */
export function sitemapXml(siteUrl) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <url><loc>${escapeHtml(siteUrl)}</loc></url>`,
    '</urlset>',
    '',
  ].join('\n');
}

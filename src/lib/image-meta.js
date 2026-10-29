// Leitura de formato e dimensões de imagens a partir dos bytes, sem
// dependências (roda no build e no navegador). Também verifica SVGs, que podem
// conter scripts e referências externas.

/**
 * @typedef {{ format: 'png' | 'jpg' | 'webp' | 'avif' | 'svg', width: number, height: number }} ImageMeta
 */

/** Remove o BOM (U+FEFF) inicial, se houver. */
const stripBom = (s) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);
const ascii = (bytes, start, length) => String.fromCharCode(...bytes.subarray(start, start + length));
const u16be = (b, i) => (b[i] << 8) | b[i + 1];
const u32be = (b, i) => ((b[i] << 24) >>> 0) + ((b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]);
const u24le = (b, i) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);

function readPng(b) {
  if (b.length < 24 || ascii(b, 12, 4) !== 'IHDR') throw new Error('PNG sem cabeçalho IHDR');
  return { format: 'png', width: u32be(b, 16), height: u32be(b, 20) };
}

// Marcadores SOF (Start Of Frame) que carregam as dimensões.
const JPEG_SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

function readJpeg(b) {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) throw new Error('JPEG com estrutura inválida');
    const marker = b[i + 1];
    if (marker === 0xff) {
      i += 1; // byte de preenchimento
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    if (JPEG_SOF.has(marker)) return { format: 'jpg', width: u16be(b, i + 7), height: u16be(b, i + 5) };
    if (marker === 0xd9 || marker === 0xda) break;
    i += 2 + u16be(b, i + 2);
  }
  throw new Error('JPEG sem dimensões (marcador SOF ausente)');
}

function readWebp(b) {
  const chunk = ascii(b, 12, 4);
  const need = { 'VP8 ': 30, VP8L: 25, VP8X: 30 }[chunk] ?? 16;
  if (b.length < need) throw new Error('WebP truncado');
  if (chunk === 'VP8 ')
    return { format: 'webp', width: (b[26] | (b[27] << 8)) & 0x3fff, height: (b[28] | (b[29] << 8)) & 0x3fff };
  if (chunk === 'VP8L') {
    if (b[20] !== 0x2f) throw new Error('WebP sem assinatura VP8L');
    return {
      format: 'webp',
      width: 1 + (((b[22] & 0x3f) << 8) | b[21]),
      height: 1 + (((b[24] & 0x0f) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6)),
    };
  }
  if (chunk === 'VP8X') return { format: 'webp', width: 1 + u24le(b, 24), height: 1 + u24le(b, 27) };
  throw new Error(`WebP com bloco desconhecido "${chunk}"`);
}

/**
 * AVIF (ISOBMFF/HEIF): marca "avif"/"avis" no ftyp; dimensões na caixa "ispe".
 * Com várias "ispe" (miniatura, canal alfa), vale a maior.
 */
function readAvif(b) {
  const ftypSize = u32be(b, 0);
  const brands = [];
  for (let i = 8; i + 4 <= Math.min(ftypSize, b.length); i += 4) {
    if (i !== 12) brands.push(ascii(b, i, 4)); // pula minor_version
  }
  if (!brands.includes('avif') && !brands.includes('avis')) {
    throw new Error('arquivo ISOBMFF que não é AVIF (ex.: HEIC/MP4)');
  }
  let best = null;
  const limit = Math.min(b.length - 16, 1 << 20);
  for (let i = 4; i <= limit; i++) {
    if (b[i] === 0x69 && ascii(b, i, 4) === 'ispe') {
      const width = u32be(b, i + 8);
      const height = u32be(b, i + 12);
      if (width > 0 && height > 0 && (!best || width * height > best.width * best.height)) best = { width, height };
    }
  }
  if (!best) throw new Error('AVIF sem dimensões (caixa ispe ausente)');
  return { format: 'avif', ...best };
}

/** Padrões que tornam um SVG inseguro para publicação. */
const SVG_FORBIDDEN = [
  [/<script\b/i, 'contém <script>'],
  [/<foreignObject\b/i, 'contém <foreignObject>'],
  [/\son[a-z]+\s*=/i, 'contém atributo de evento (on…)'],
  [/javascript:/i, 'contém "javascript:"'],
  [/<!DOCTYPE|<!ENTITY/i, 'contém DOCTYPE/ENTITY'],
  [/\b(?:xlink:)?href\s*=\s*["'](?!#)/i, 'referencia recurso externo (href)'],
  [/url\(\s*['"]?(?!#)/i, 'referencia recurso externo (url())'],
  [/@import/i, 'contém @import'],
];

function readSvg(b) {
  let textValue;
  try {
    textValue = new TextDecoder('utf-8', { fatal: true }).decode(b);
  } catch {
    throw new Error('SVG não está em UTF-8 válido');
  }
  const body = stripBom(textValue).replace(/^\s*(?:<\?xml[^>]*\?>\s*)?(?:<!--[\s\S]*?-->\s*)*/, '');
  if (!/^<svg[\s>]/i.test(body)) throw new Error('arquivo não começa com <svg>');
  for (const [pattern, reason] of SVG_FORBIDDEN) {
    if (pattern.test(textValue)) throw new Error(`SVG inseguro: ${reason}`);
  }
  const tag = body.slice(0, body.indexOf('>') + 1);
  const attr = (name) => tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1];
  const viewBox = attr('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  const num = (v) => (v && /^\d+(?:\.\d+)?(?:px)?$/.test(v.trim()) ? parseFloat(v) : NaN);
  let width = num(attr('width'));
  let height = num(attr('height'));
  if ((!width || !height) && viewBox?.length === 4) [width, height] = [viewBox[2], viewBox[3]];
  if (!(width > 0) || !(height > 0)) throw new Error('SVG sem dimensões (width/height ou viewBox)');
  return { format: 'svg', width: Math.round(width), height: Math.round(height) };
}

/**
 * Identifica o formato pelos bytes (não pela extensão) e lê as dimensões.
 * @param {Uint8Array} bytes
 * @returns {ImageMeta}
 */
export function readImageMeta(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b.length >= 8 && b[0] === 0x89 && ascii(b, 1, 3) === 'PNG') return readPng(b);
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return readJpeg(b);
  if (b.length >= 12 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return readWebp(b);
  if (b.length >= 16 && ascii(b, 4, 4) === 'ftyp') return readAvif(b);
  if (/^\s*</.test(stripBom(new TextDecoder().decode(b.subarray(0, 64))))) return readSvg(b);
  throw new Error('formato de imagem não reconhecido');
}

/**
 * Valida bytes de imagem contra um campo de imagem do schema.
 * @param {Uint8Array} bytes
 * @param {string} src caminho declarado (a extensão deve corresponder ao conteúdo)
 * @param {import('./schema.js').ImageField} field
 * @returns {string[]} mensagens de erro (vazio = válido)
 */
export function checkImageFile(bytes, src, field) {
  const errors = [];
  if (bytes.length > field.maxBytes) {
    errors.push(`arquivo com ${Math.ceil(bytes.length / 1000)} KB; máximo ${Math.floor(field.maxBytes / 1000)} KB`);
  }
  let meta;
  try {
    meta = readImageMeta(bytes);
  } catch (error) {
    return [...errors, error.message];
  }
  const ext = src
    .slice(src.lastIndexOf('.') + 1)
    .toLowerCase()
    .replace('jpeg', 'jpg');
  if (meta.format !== ext) errors.push(`conteúdo é ${meta.format.toUpperCase()}, mas a extensão é .${ext}`);
  if (!field.formats.includes(meta.format)) errors.push(`formato ${meta.format} não aceito neste campo`);
  if (meta.width < field.minWidth || meta.height < field.minHeight) {
    errors.push(`${meta.width}×${meta.height} px; mínimo ${field.minWidth}×${field.minHeight} px`);
  }
  if (meta.width > field.maxWidth || meta.height > field.maxHeight) {
    errors.push(`${meta.width}×${meta.height} px; máximo ${field.maxWidth}×${field.maxHeight} px`);
  }
  return errors;
}

// Build estático: valida o conteúdo, renderiza as páginas e gera dist/.
// Uso: node scripts/build.mjs   (variável opcional BASE_PATH, ex.: /nome-do-repo)

import { access, cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ACCESS_REPO_PATH, parseAccessFile } from '../src/lib/access.js';
import { contentSchema } from '../src/lib/schema.js';
import { checkImageFile, readImageMeta } from '../src/lib/image-meta.js';
import { normalizeSiteUrl, robotsTxt, seoHead, sitemapXml } from '../src/lib/seo.js';
import { WHATSAPP, whatsappUrl } from '../src/lib/site.js';
import { themeCss } from '../src/lib/theme.js';
import { exportContent } from '../src/lib/transfer.js';
import { renderTemplate } from '../src/lib/template.js';
import { formatErrors, parseContent } from '../src/lib/validate.js';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');

/** Pastas de src/ copiadas como estão para dist/. */
const STATIC_DIRS = ['css', 'js', 'lib', 'assets'];

/**
 * Folhas do site público reunidas em css/site.css, nesta ordem (uma requisição
 * bloqueante em vez de seis). css/theme.css continua separado: é gerado do
 * conteúdo e a prévia do painel o substitui pelas cores do rascunho.
 */
export const SITE_CSS = ['fonts.css', 'tokens.css', 'base.css', 'layout.css', 'components.css', 'sections.css'];

/** Junta as folhas sem comentários nem linhas vazias (o CSS-fonte não tem "/*" dentro de strings). */
export function bundleCss(sources) {
  return (
    sources
      .map((css) =>
        css
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .split(/\r?\n/)
          .map((line) => line.trimEnd())
          .filter((line) => line.trim() !== '')
          .join('\n'),
      )
      .join('\n') + '\n'
  );
}

/** Fontes auto-hospedadas (ver src/css/fonts.css), copiadas com suas licenças. */
const FONTS = [
  { pkg: '@fontsource-variable/outfit', file: 'outfit-latin-wght-normal.woff2', license: 'Outfit' },
  { pkg: '@fontsource-variable/manrope', file: 'manrope-latin-wght-normal.woff2', license: 'Manrope' },
].map((font) => ({ ...font, dir: join(ROOT, 'node_modules', ...font.pkg.split('/')) }));

/**
 * Normaliza o base path do GitHub Pages: "" (site de usuário/domínio próprio)
 * ou "/nome-do-repo" (site de projeto).
 */
export function normalizeBasePath(value = '') {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (trimmed === '') return '';
  if (!/^(?:\/[A-Za-z0-9._-]+)+$/.test(trimmed)) {
    throw new Error(`BASE_PATH inválido: "${value}". Use "" ou algo como "/nome-do-repo".`);
  }
  return trimmed;
}

/** Lista todos os campos de imagem do conteúdo (src pode ser null), conforme o schema. */
export function collectImages(field, value, path = '', found = []) {
  if (field.kind === 'image') found.push({ path, src: value.src, field });
  if (field.kind === 'object') {
    for (const [key, child] of Object.entries(field.fields)) {
      collectImages(child, value[key], path ? `${path}.${key}` : key, found);
    }
  }
  return found;
}

/**
 * Verifica os arquivos das imagens do conteúdo: existência (grafia exata),
 * formato real, tamanho e dimensões conforme o campo do schema.
 * @param {import('../src/lib/schema.js').Content} content
 * @param {string} [srcDir]
 * @returns {Promise<string[]>} mensagens "- caminho: problema"
 */
export async function checkContentImages(content, srcDir = SRC) {
  const errors = [];
  for (const { path, src, field } of collectImages(contentSchema, content)) {
    if (!src) continue;
    const dir = join(srcDir, dirname(src));
    const name = basename(src);
    const listing = await readdir(dir).catch(() => []);
    if (!listing.includes(name)) {
      errors.push(`- ${path}.src: arquivo não encontrado (${src})`);
      continue;
    }
    const problems = checkImageFile(new Uint8Array(await readFile(join(dir, name))), src, field);
    for (const problem of problems) errors.push(`- ${path}.src (${src}): ${problem}`);
  }
  return errors;
}

const exists = (path) =>
  access(path).then(
    () => true,
    () => false,
  );

export { themeCss };

async function readHtmlDir(dir) {
  const entries = (await readdir(dir)).filter((name) => extname(name) === '.html');
  return Object.fromEntries(
    await Promise.all(entries.map(async (name) => [basename(name, '.html'), await readFile(join(dir, name), 'utf8')])),
  );
}

/** Páginas em src/pages, inclusive subpastas (ex.: "admin/index"), com o prefixo relativo à raiz. */
async function readPages(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  const pages = [];
  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name) !== '.html') continue;
    const rel = relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/');
    const depth = rel.split('/').length - 1;
    pages.push({
      name: rel.slice(0, -'.html'.length),
      root: depth === 0 ? './' : '../'.repeat(depth),
      source: await readFile(join(dir, rel), 'utf8'),
    });
  }
  return pages.sort((a, b) => a.name.localeCompare(b.name));
}

/** Manifesto das imagens versionadas (para o painel indicar o que já existe no site). */
async function imageManifest() {
  const dir = join(SRC, 'assets', 'img');
  const names = (await readdir(dir).catch(() => [])).filter((name) => /\.(?:webp|jpe?g|png|avif|svg)$/.test(name));
  const images = [];
  for (const name of names.sort()) {
    const bytes = new Uint8Array(await readFile(join(dir, name)));
    try {
      const meta = readImageMeta(bytes);
      images.push({
        src: `assets/img/${name}`,
        format: meta.format,
        width: meta.width,
        height: meta.height,
        bytes: bytes.length,
      });
    } catch {
      // Arquivo ilegível não é oferecido ao painel; o build falha se o conteúdo o referenciar.
    }
  }
  return { images };
}

/**
 * @param {{ outDir?: string, basePath?: string, siteUrl?: string, contentPath?: string, accessPath?: string, year?: string }} [options]
 *   siteUrl: URL pública (canonical, og:url, sitemap); no CI vem de actions/configure-pages.
 */
export async function build({
  outDir = join(ROOT, 'dist'),
  basePath = process.env.BASE_PATH ?? '',
  siteUrl = process.env.SITE_URL ?? '',
  contentPath = join(ROOT, 'content', 'content.json'),
  accessPath = join(ROOT, ACCESS_REPO_PATH),
  year = String(new Date().getFullYear()),
} = {}) {
  const normalizedBase = normalizeBasePath(basePath);
  const normalizedSiteUrl = normalizeSiteUrl(siteUrl);

  const result = parseContent(await readFile(contentPath, 'utf8'));
  if (!result.ok) {
    throw new Error(`Conteúdo inválido em ${contentPath}:\n${formatErrors(result.errors)}`);
  }
  const content = result.value;

  const images = collectImages(contentSchema, content);
  const imageErrors = await checkContentImages(content);
  if (imageErrors.length > 0) {
    throw new Error(`Imagens inválidas ou não encontradas em src/:\n${imageErrors.join('\n')}`);
  }

  for (const font of FONTS) {
    if (!(await exists(join(font.dir, 'files', font.file)))) {
      throw new Error(`Fonte não encontrada: ${font.pkg}/files/${font.file}. Execute "npm ci".`);
    }
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  for (const dir of STATIC_DIRS) {
    if (!(await exists(join(SRC, dir)))) continue;
    await cp(join(SRC, dir), join(outDir, dir), {
      recursive: true,
      filter: (source) => !['.gitkeep', '.md'].some((suffix) => source.endsWith(suffix)),
    });
  }

  const fontsOut = join(outDir, 'assets', 'fonts');
  await mkdir(fontsOut, { recursive: true });
  for (const font of FONTS) {
    await cp(join(font.dir, 'files', font.file), join(fontsOut, font.file));
    await cp(join(font.dir, 'LICENSE'), join(fontsOut, `LICENSE-${font.license}.txt`));
  }

  await writeFile(join(outDir, 'css', 'theme.css'), themeCss(content.theme.colors));
  const siteCss = await Promise.all(SITE_CSS.map((name) => readFile(join(SRC, 'css', name), 'utf8')));
  await writeFile(join(outDir, 'css', 'site.css'), bundleCss(siteCss));

  // Conteúdo publicado (já validado): valores padrão do painel. Não contém nada que a página não exiba.
  await mkdir(join(outDir, 'content'), { recursive: true });
  await writeFile(join(outDir, 'content', 'content.json'), exportContent(content));

  const partials = await readHtmlDir(join(SRC, 'partials'));
  const pages = await readPages(join(SRC, 'pages'));
  for (const { name, root, source } of pages) {
    const context = {
      content,
      build: { root, basePath: normalizedBase, year, whatsappUrl: whatsappUrl(), whatsappDisplay: WHATSAPP.display },
    };
    let html;
    try {
      html = renderTemplate(source, { context, partials });
    } catch (error) {
      throw new Error(`Erro ao renderizar src/pages/${name}.html: ${error.message}`, { cause: error });
    }
    // Canonical, og:url e dados estruturados só na página indexável.
    if (name === 'index') html = html.replace('  </head>', `${seoHead(content, normalizedSiteUrl)}  </head>`);
    await mkdir(dirname(join(outDir, `${name}.html`)), { recursive: true });
    await writeFile(join(outDir, `${name}.html`), html);
  }

  // Dados do painel: template da página inicial (para a prévia fiel) e imagens existentes.
  const indexPage = pages.find((page) => page.name === 'index');
  await mkdir(join(outDir, 'admin'), { recursive: true });
  await writeFile(
    join(outDir, 'admin', 'preview-templates.json'),
    JSON.stringify({ page: indexPage.source, partials }),
  );
  await writeFile(join(outDir, 'admin', 'images.json'), JSON.stringify(await imageManifest()));

  // Acesso do painel (token cifrado pela senha; CLAUDE.md §7, exceção). Ausente
  // = painel abre na configuração inicial. Formato inválido interrompe o build.
  const accessText = await readFile(accessPath, 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (accessText !== null) {
    if (!parseAccessFile(accessText)) throw new Error(`Arquivo de acesso do painel inválido: ${accessPath}`);
    await writeFile(join(outDir, 'admin', 'acesso.json'), accessText);
  }

  // robots.txt e sitemap.xml só valem na raiz do domínio (domínio próprio ou usuario.github.io).
  await writeFile(join(outDir, 'robots.txt'), robotsTxt(normalizedSiteUrl));
  if (normalizedSiteUrl) await writeFile(join(outDir, 'sitemap.xml'), sitemapXml(normalizedSiteUrl));

  // Desativa o processamento Jekyll caso o deploy seja feito por branch.
  await writeFile(join(outDir, '.nojekyll'), '');

  // Imagens com src null aparecem como fallback (texto alternativo): pendências de conteúdo.
  const placeholders = images.filter((image) => !image.src).map((image) => image.path);

  return {
    outDir,
    basePath: normalizedBase,
    siteUrl: normalizedSiteUrl,
    pages: pages.map((page) => page.name),
    placeholders,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { outDir, basePath, siteUrl, pages, placeholders } = await build();
    console.log(`Build concluído em ${outDir}`);
    console.log(`Páginas: ${pages.join(', ')} · base path: "${basePath || '/'}"`);
    if (!siteUrl) console.warn('Aviso: SITE_URL não definida; canonical, og:url e sitemap.xml omitidos.');
    if (placeholders.length > 0) {
      console.warn(`Aviso: imagens pendentes (exibindo texto alternativo): ${placeholders.join(', ')}`);
    }
  } catch (error) {
    console.error(`Falha no build.\n${error.message}`);
    process.exitCode = 1;
  }
}

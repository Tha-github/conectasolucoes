// Servidor local que reproduz o GitHub Pages em subdiretório.
// Uso: node scripts/serve.mjs [--watch]
// Variáveis: PORT (padrão 4173), BASE_PATH (padrão /preview).

import { createReadStream, watch } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { ROOT, build, normalizeBasePath } from './build.mjs';

const PORT = Number(process.env.PORT ?? 4173);
const BASE_PATH = normalizeBasePath(process.env.BASE_PATH ?? '/preview');
const DIST = join(ROOT, 'dist');
const WATCH = process.argv.includes('--watch');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

async function runBuild() {
  try {
    await build({ basePath: BASE_PATH });
    console.log(`[${new Date().toLocaleTimeString('pt-BR')}] build ok`);
  } catch (error) {
    console.error(`Falha no build.\n${error.message}`);
  }
}

async function sendNotFound(res) {
  res.writeHead(404, { 'Content-Type': TYPES['.html'] });
  try {
    res.end(await readFile(join(DIST, '404.html')));
  } catch {
    res.end('404');
  }
}

async function handle(req, res) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return sendNotFound(res);
  }
  if (pathname === '/' && BASE_PATH) {
    res.writeHead(302, { Location: `${BASE_PATH}/` });
    return res.end();
  }
  if (!pathname.startsWith(`${BASE_PATH}/`) && pathname !== BASE_PATH) return sendNotFound(res);

  const relative = pathname.slice(BASE_PATH.length);
  const filePath = normalize(join(DIST, relative));
  if (filePath !== DIST && !filePath.startsWith(DIST + sep)) return sendNotFound(res);

  let info = await stat(filePath).catch(() => null);
  let target = filePath;
  if (info?.isDirectory()) {
    if (!pathname.endsWith('/')) {
      res.writeHead(301, { Location: `${pathname}/` });
      return res.end();
    }
    target = join(filePath, 'index.html');
    info = await stat(target).catch(() => null);
  }
  if (!info?.isFile()) return sendNotFound(res);

  res.writeHead(200, {
    'Content-Type': TYPES[extname(target)] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  createReadStream(target).pipe(res);
}

await runBuild();

if (WATCH) {
  let timer;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(runBuild, 150);
  };
  watch(join(ROOT, 'src'), { recursive: true }, schedule);
  watch(join(ROOT, 'content'), { recursive: true }, schedule);
  console.log('Observando src/ e content/ (recarregue o navegador após alterações).');
}

createServer((req, res) => {
  handle(req, res).catch((error) => {
    console.error(error);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
}).listen(PORT, '127.0.0.1', () => {
  // 127.0.0.1 explícito: "localhost" pode resolver para IPv6 (::1), onde o servidor não escuta.
  console.log(`Servindo dist/ em http://127.0.0.1:${PORT}${BASE_PATH}/ (painel: ${BASE_PATH}/admin/)`);
});

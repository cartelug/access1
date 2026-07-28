import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_PREFIX = '/access1';
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number.parseInt(process.env.PORT || '4173', 10);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8'
};

function sendFile(response, file, statusCode = 200) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': contentTypes[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff'
  });
  createReadStream(file).pipe(response);
}

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || `${HOST}:${PORT}`}`);
  if (url.pathname === '/') {
    response.writeHead(302, { Location: `${SITE_PREFIX}/` });
    response.end();
    return;
  }
  if (url.pathname !== SITE_PREFIX && !url.pathname.startsWith(`${SITE_PREFIX}/`)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname.slice(SITE_PREFIX.length));
  } catch {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
    return;
  }
  if (!pathname || pathname.endsWith('/')) pathname += 'index.html';

  const file = path.resolve(SITE_ROOT, `.${pathname}`);
  const insideRoot = file === SITE_ROOT || file.startsWith(`${SITE_ROOT}${path.sep}`);
  if (insideRoot && existsSync(file) && statSync(file).isFile()) {
    sendFile(response, file);
    return;
  }
  sendFile(response, path.join(SITE_ROOT, '404.html'), 404);
});

server.listen(PORT, HOST, () => {
  console.log(`97.world preview: http://${HOST}:${PORT}${SITE_PREFIX}/`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

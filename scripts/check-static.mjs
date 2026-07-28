import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CANONICAL_BASE = new URL('https://cartelug.github.io/access1/');
const CANONICAL_ORIGIN = CANONICAL_BASE.origin;
const SITE_PREFIX = CANONICAL_BASE.pathname;
const failures = [];
const notices = [];

const fail = (file, message) => failures.push(`${file}: ${message}`);
const notice = message => notices.push(message);
const relative = file => path.relative(SITE_ROOT, file).split(path.sep).join('/');
const read = file => readFileSync(file, 'utf8');

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'playwright-report' || entry.name === 'test-results') {
      return [];
    }
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function getAttribute(attributes, name) {
  const match = attributes.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`, 'i'));
  return match ? (match[1] ?? match[2] ?? match[3] ?? '') : null;
}

function getMeta(html, key, value) {
  const tags = [...html.matchAll(/<meta\b([^>]*)>/gi)].map(match => match[1]);
  const match = tags.find(attributes => (getAttribute(attributes, key) || '').toLowerCase() === value.toLowerCase());
  return match ? getAttribute(match, 'content') : null;
}

function getLink(html, relName) {
  const tags = [...html.matchAll(/<link\b([^>]*)>/gi)].map(match => match[1]);
  const match = tags.find(attributes =>
    (getAttribute(attributes, 'rel') || '').toLowerCase().split(/\s+/).includes(relName.toLowerCase())
  );
  return match ? getAttribute(match, 'href') : null;
}

function idsIn(html) {
  return [...html.matchAll(/\bid\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s"'=<>]+))/gi)]
    .map(match => match[1] ?? match[2] ?? match[3]);
}

function expectedCanonical(htmlFile) {
  const file = relative(htmlFile);
  return new URL(file === 'index.html' ? '' : file, CANONICAL_BASE).href;
}

function referenceToFile(reference, sourceFile) {
  const clean = reference.trim();
  if (!clean || clean.startsWith('#')) {
    return { file: sourceFile, fragment: clean.slice(1) };
  }
  if (/^(?:mailto:|tel:|javascript:|data:|blob:)/i.test(clean) || clean.startsWith('//')) return null;

  let pathname;
  let fragment = '';
  try {
    const parsed = new URL(clean, new URL(relative(sourceFile), CANONICAL_BASE));
    if (parsed.origin !== CANONICAL_ORIGIN) return null;
    if (!parsed.pathname.startsWith(SITE_PREFIX)) {
      return { error: `root-relative reference escapes the GitHub Pages subpath: ${clean}` };
    }
    pathname = decodeURIComponent(parsed.pathname.slice(SITE_PREFIX.length));
    fragment = decodeURIComponent(parsed.hash.slice(1));
  } catch {
    return { error: `cannot parse reference: ${clean}` };
  }

  if (!pathname) pathname = 'index.html';
  if (pathname.endsWith('/')) pathname += 'index.html';
  const resolved = path.resolve(SITE_ROOT, ...pathname.split('/'));
  if (resolved !== SITE_ROOT && !resolved.startsWith(`${SITE_ROOT}${path.sep}`)) {
    return { error: `reference escapes the repository: ${clean}` };
  }
  return { file: resolved, fragment };
}

function checkReference(reference, sourceFile, kind = 'reference') {
  const target = referenceToFile(reference, sourceFile);
  if (!target) return;
  const source = relative(sourceFile);
  if (target.error) {
    fail(source, target.error);
    return;
  }
  if (!existsSync(target.file) || !statSync(target.file).isFile()) {
    fail(source, `${kind} does not resolve: ${reference}`);
    return;
  }
  if (target.fragment && path.extname(target.file).toLowerCase() === '.html') {
    const targetIds = new Set(idsIn(read(target.file)));
    if (!targetIds.has(target.fragment)) {
      fail(source, `${kind} fragment "#${target.fragment}" does not exist in ${relative(target.file)}`);
    }
  }
}

function isInsideLabel(html, offset) {
  return [...html.matchAll(/<label\b[^>]*>[\s\S]*?<\/label\s*>/gi)]
    .some(match => match.index <= offset && match.index + match[0].length >= offset);
}

function checkHtml(file) {
  const name = relative(file);
  const html = read(file);
  const ids = idsIn(html);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  duplicateIds.forEach(id => fail(name, `duplicate id "${id}"`));

  if (!/<html\b[^>]*\blang\s*=/i.test(html)) fail(name, 'the <html> element needs a lang attribute');
  if (!/<title>[^<]+<\/title>/i.test(html)) fail(name, 'a non-empty <title> is required');
  if (!/<main\b/i.test(html)) fail(name, 'a <main> landmark is required');

  const links = [...html.matchAll(/<a\b([^>]*)>/gi)];
  for (const match of links) {
    const attributes = match[1];
    const href = getAttribute(attributes, 'href');
    if (href) checkReference(href, file, 'link');
    if ((getAttribute(attributes, 'target') || '').toLowerCase() === '_blank') {
      const rel = (getAttribute(attributes, 'rel') || '').toLowerCase().split(/\s+/);
      if (!rel.includes('noopener')) fail(name, `target="_blank" link is missing rel="noopener": ${href || '(missing href)'}`);
    }
  }

  for (const match of html.matchAll(/<(?:img|script|source|video|audio)\b([^>]*)>/gi)) {
    const attributes = match[1];
    for (const attribute of ['src', 'poster']) {
      const value = getAttribute(attributes, attribute);
      if (value) checkReference(value, file, attribute);
    }
    const srcset = getAttribute(attributes, 'srcset');
    if (srcset) {
      srcset.split(',').map(candidate => candidate.trim().split(/\s+/)[0]).filter(Boolean)
        .forEach(value => checkReference(value, file, 'srcset'));
    }
  }

  for (const match of html.matchAll(/<link\b([^>]*)>/gi)) {
    const href = getAttribute(match[1], 'href');
    if (href) checkReference(href, file, 'linked resource');
  }

  const labelFors = new Set(
    [...html.matchAll(/<label\b([^>]*)>/gi)]
      .map(match => getAttribute(match[1], 'for'))
      .filter(Boolean)
  );
  for (const match of html.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)) {
    const tag = match[1].toLowerCase();
    const attributes = match[2];
    const type = (getAttribute(attributes, 'type') || '').toLowerCase();
    if (tag === 'input' && ['hidden', 'button', 'submit', 'reset', 'image'].includes(type)) continue;
    const id = getAttribute(attributes, 'id');
    const labelled = Boolean(
      getAttribute(attributes, 'aria-label') ||
      getAttribute(attributes, 'aria-labelledby') ||
      (id && labelFors.has(id)) ||
      isInsideLabel(html, match.index)
    );
    if (!labelled) fail(name, `${tag}${id ? `#${id}` : ''} has no accessible label`);
  }

  for (const match of html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form\s*>/gi)) {
    const attributes = match[1];
    const contents = match[2];
    const method = (getAttribute(attributes, 'method') || '').toLowerCase();
    if (!method) fail(name, 'form is missing an explicit method; use method="post" to keep PII out of URLs');
    if (method === 'get') fail(name, 'form uses GET and could serialize customer PII into the URL');
    if (method && method !== 'post' && method !== 'dialog') fail(name, `form uses unsupported method "${method}"`);
    const action = getAttribute(attributes, 'action');
    if (!action) fail(name, 'form is missing an explicit action');
    if (action) checkReference(action, file, 'form action');
    if (!/<a\b[^>]*href\s*=\s*["'][^"']*terms\.html(?:[?#][^"']*)?["']/i.test(contents)) {
      fail(name, 'form must link to Terms beside the collection point');
    }
    if (!/<a\b[^>]*href\s*=\s*["'][^"']*privacy\.html(?:[?#][^"']*)?["']/i.test(contents)) {
      fail(name, 'form must link to Privacy beside the collection point');
    }
    if (!/<[^>]+\brole\s*=\s*["']status["'][^>]*\baria-live\s*=\s*["']polite["']/i.test(contents)
      && !/<[^>]+\baria-live\s*=\s*["']polite["'][^>]*\brole\s*=\s*["']status["']/i.test(contents)) {
      fail(name, 'form must contain a role="status" aria-live="polite" feedback region');
    }
    if (!/<a\b[^>]*\bdata-form-fallback\b/i.test(contents)) {
      fail(name, 'form must contain a blocked-popup recovery link');
    }
  }

  const isNotFound = name === '404.html';
  const robots = (getMeta(html, 'name', 'robots') || '').toLowerCase();
  if (isNotFound) {
    if (!robots.includes('noindex')) fail(name, 'the custom 404 page must include a noindex robots directive');
    return;
  }
  if (robots.includes('noindex')) return;

  const expected = expectedCanonical(file);
  const canonical = getLink(html, 'canonical');
  if (canonical !== expected) fail(name, `canonical must be exactly ${expected}`);
  const description = getMeta(html, 'name', 'description');
  if (!description || description.trim().length < 50) fail(name, 'meta description is missing or too short');

  const requiredSocialMeta = [
    ['property', 'og:title'],
    ['property', 'og:description'],
    ['property', 'og:url'],
    ['property', 'og:image'],
    ['name', 'twitter:card'],
    ['name', 'twitter:title'],
    ['name', 'twitter:description'],
    ['name', 'twitter:image']
  ];
  for (const [key, value] of requiredSocialMeta) {
    if (!getMeta(html, key, value)) fail(name, `missing ${value} metadata`);
  }
  const openGraphUrl = getMeta(html, 'property', 'og:url');
  if (openGraphUrl && openGraphUrl !== expected) fail(name, `og:url must match the canonical URL ${expected}`);
  for (const key of ['og:image', 'twitter:image']) {
    const image = getMeta(html, key === 'og:image' ? 'property' : 'name', key);
    if (image && !image.startsWith(CANONICAL_BASE.href)) {
      fail(name, `${key} must use the temporary GitHub Pages canonical origin`);
    }
  }
}

function checkCss(file) {
  const css = read(file);
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of withoutComments.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'" \t\r\n]+))\s*\)/gi)) {
    const value = match[1] ?? match[2] ?? match[3];
    if (value) checkReference(value, file, 'CSS asset');
  }
}

function checkManifest() {
  const file = path.join(SITE_ROOT, 'manifest.webmanifest');
  if (!existsSync(file)) {
    fail('manifest.webmanifest', 'file is missing');
    return;
  }
  let manifest;
  try {
    manifest = JSON.parse(read(file));
  } catch (error) {
    fail('manifest.webmanifest', `invalid JSON: ${error.message}`);
    return;
  }
  for (const field of ['name', 'short_name', 'start_url', 'scope', 'display', 'icons']) {
    if (manifest[field] == null) fail('manifest.webmanifest', `missing "${field}"`);
  }
  for (const field of ['start_url', 'scope']) {
    if (!manifest[field]) continue;
    const resolved = new URL(manifest[field], new URL('manifest.webmanifest', CANONICAL_BASE));
    if (resolved.origin !== CANONICAL_ORIGIN || !resolved.pathname.startsWith(SITE_PREFIX)) {
      fail('manifest.webmanifest', `"${field}" must remain inside ${CANONICAL_BASE.href}`);
    }
  }
  if (Array.isArray(manifest.icons)) {
    manifest.icons.forEach(icon => {
      if (icon?.src) checkReference(icon.src, file, 'manifest icon');
    });
  }
}

function checkRobots() {
  const file = path.join(SITE_ROOT, 'robots.txt');
  if (!existsSync(file)) {
    fail('robots.txt', 'file is missing');
    return;
  }
  const expected = new URL('sitemap.xml', CANONICAL_BASE).href;
  const sitemapLine = read(file).match(/^\s*Sitemap:\s*(\S+)\s*$/im)?.[1];
  if (sitemapLine !== expected) fail('robots.txt', `Sitemap must be exactly ${expected}`);
}

function checkSitemap(htmlFiles) {
  const file = path.join(SITE_ROOT, 'sitemap.xml');
  if (!existsSync(file)) {
    fail('sitemap.xml', 'file is missing');
    return;
  }
  const xml = read(file);
  const locations = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(match => match[1]);
  const expected = htmlFiles
    .filter(htmlFile => relative(htmlFile) !== '404.html')
    .filter(htmlFile => !(getMeta(read(htmlFile), 'name', 'robots') || '').toLowerCase().includes('noindex'))
    .map(expectedCanonical)
    .sort();
  const actual = [...new Set(locations)].sort();
  if (locations.length !== actual.length) fail('sitemap.xml', 'contains duplicate <loc> entries');
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail('sitemap.xml', `URLs do not match indexable HTML pages.\n  expected: ${expected.join(', ')}\n  actual:   ${actual.join(', ')}`);
  }
}

const files = walk(SITE_ROOT);
const htmlFiles = files.filter(file => path.extname(file).toLowerCase() === '.html').sort();
if (!htmlFiles.some(file => relative(file) === 'index.html')) fail('.', 'index.html is missing');
htmlFiles.forEach(checkHtml);
files.filter(file => path.extname(file).toLowerCase() === '.css').forEach(checkCss);
checkManifest();
checkRobots();
checkSitemap(htmlFiles);

const firstPartyBytes = files
  .filter(file => !relative(file).startsWith('.git/'))
  .reduce((total, file) => total + statSync(file).size, 0);
notice(`Checked ${htmlFiles.length} HTML pages and ${files.length} repository files.`);
notice(`First-party repository payload (excluding .git): ${(firstPartyBytes / 1024).toFixed(1)} KiB.`);

notices.forEach(message => console.log(`✓ ${message}`));
if (failures.length) {
  console.error(`\nStatic checks failed with ${failures.length} issue${failures.length === 1 ? '' : 's'}:`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exitCode = 1;
} else {
  console.log('✓ Links, fragments, assets, IDs, forms, metadata, manifest, robots, and sitemap passed.');
}

/**
 * Read-only Cloudflare Worker adapter for a conventional SMM panel API.
 * Keep the supplier key in deployment secrets. Never place orders publicly.
 */
const json = (payload, status, origin = '') => new Response(JSON.stringify(payload), {
  status, headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {})
  }
});
const clean = (value, max = 120) => String(value ?? '')
  .replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

/** Expose only public service metadata, never provider wholesale rates. */
export function normalizeServices(raw) {
  if (!Array.isArray(raw)) return null;
  return raw.slice(0, 5000).flatMap(row => {
    if (!row || typeof row !== 'object') return [];
    const id = Number(row.service);
    const min = Number(row.min);
    const max = Number(row.max);
    const name = clean(row.name);
    if (!Number.isSafeInteger(id) || id <= 0 || !name
      || !Number.isSafeInteger(min) || min <= 0
      || !Number.isSafeInteger(max) || max < min) return [];
    return [{
      id, name, type: clean(row.type, 80),
      category: clean(row.category, 100),
      min, max, refill: row.refill === true, cancel: row.cancel === true
    }];
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const allowedOrigin = env?.SITE_ORIGIN || '';
    const origin = request.headers.get('Origin');
    if (url.pathname !== '/services') return json({ error: 'Not found' }, 404);
    if (!allowedOrigin) return json({ error: 'Service not configured' }, 503);
    if (origin && origin !== allowedOrigin) return json({ error: 'Forbidden' }, 403);
    const corsOrigin = origin === allowedOrigin ? allowedOrigin : '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Accept',
        'Access-Control-Max-Age': '600', 'Vary': 'Origin'
      } });
    }
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, corsOrigin);
    if (!env?.FASTWAY_API_URL || !env?.FASTWAY_API_KEY) {
      return json({ error: 'Service not configured' }, 503, corsOrigin);
    }

    let upstreamUrl;
    try {
      upstreamUrl = new URL(env.FASTWAY_API_URL);
      if (upstreamUrl.protocol !== 'https:' || upstreamUrl.username || upstreamUrl.password) {
        throw new Error('Invalid endpoint');
      }
    } catch {
      return json({ error: 'Service not configured' }, 503, corsOrigin);
    }

    try {
      // Confirm support for the standard SMM API shape with the real provider.
      const body = new URLSearchParams({ key: env.FASTWAY_API_KEY, action: 'services' });
      const response = await fetch(upstreamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
        body, redirect: 'error', signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error('Upstream unavailable');
      const text = await response.text();
      if (text.length > 2_000_000) throw new Error('Oversized response');
      const services = normalizeServices(JSON.parse(text));
      if (!services) throw new Error('Invalid supplier response');
      return json({ services, live: true }, 200, corsOrigin);
    } catch {
      return json({ error: 'Service catalogue temporarily unavailable' }, 502, corsOrigin);
    }
  }
};

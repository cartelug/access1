import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { normalizeServices } from './worker.mjs';

const env = {
  SITE_ORIGIN: 'https://cartelug.github.io',
  FASTWAY_API_URL: 'https://example.test/api/v2',
  FASTWAY_API_KEY: 'test-private-secret'
};
const request = (method = 'GET', origin = env.SITE_ORIGIN) =>
  new Request('https://worker.example.test/services', {
    method, headers: origin ? { Origin: origin } : {}
  });

test('normalizes records and strips wholesale rates', () => {
  assert.deepEqual(normalizeServices([
    { service: 1, name: 'Followers', type: 'Default', category: 'Social', rate: '0.90',
      min: '50', max: '10000', refill: true, cancel: true },
    { service: 2, name: 'Comments', type: 'Custom Comments', category: 'Social',
      rate: '8', min: '10', max: '1500', refill: false, cancel: true },
    { service: 3, name: '', min: 1, max: 5 }
  ]), [
    { id: 1, name: 'Followers', type: 'Default', category: 'Social', min: 50, max: 10000, refill: true, cancel: true },
    { id: 2, name: 'Comments', type: 'Custom Comments', category: 'Social', min: 10, max: 1500, refill: false, cancel: true }
  ]);
});

test('requires deployment secrets', async () => {
  const result = await worker.fetch(request(), { SITE_ORIGIN: env.SITE_ORIGIN });
  assert.equal(result.status, 503);
  assert.doesNotMatch(await result.text(), /secret/);
});

test('blocks unapproved browser origins', async () => {
  const result = await worker.fetch(request('GET', 'https://example.org'), env);
  assert.equal(result.status, 403);
  assert.equal(result.headers.get('Access-Control-Allow-Origin'), null);
});

test('does not allow public orders', async () => {
  const result = await worker.fetch(request('POST'), env);
  assert.equal(result.status, 405);
});

test('reads service list but never reveals wholesale rates or key', async t => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (_url, options) => {
    captured = options;
    return new Response(JSON.stringify([{
      service: 2208, name: 'TikTok followers', rate: '1.25',
      min: '100', max: '5000', refill: false, cancel: false
    }]), { status: 200 });
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const result = await worker.fetch(request(), env);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('Access-Control-Allow-Origin'), env.SITE_ORIGIN);
  const body = await result.text();
  assert.ok(!body.includes('1.25'));
  assert.ok(!body.includes(env.FASTWAY_API_KEY));
  assert.equal(JSON.parse(body).services[0].id, 2208);
  assert.equal(captured.method, 'POST');
  assert.equal(new URLSearchParams(captured.body).get('action'), 'services');
  assert.equal(new URLSearchParams(captured.body).get('key'), env.FASTWAY_API_KEY);
});

test('does not leak upstream errors', async t => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('sensitive upstream failure'); };
  t.after(() => { globalThis.fetch = originalFetch; });
  const result = await worker.fetch(request(), env);
  assert.equal(result.status, 502);
  assert.doesNotMatch(await result.text(), /sensitive|secret/);
});

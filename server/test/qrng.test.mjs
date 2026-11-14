import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../dist/app.js';
import { AnuQrngError, fetchAnuQrng } from '../dist/integrations/anuQrng.js';

const API_KEY = 'test-secret-never-returned';
const ORIGIN = 'http://localhost:5173';

test('ANU adapter authenticates, validates exact byte count, and returns provenance-safe data', async () => {
  let capturedUrl;
  let capturedOptions;
  const sample = await fetchAnuQrng(16, API_KEY, async (url, options) => {
    capturedUrl = new URL(url);
    capturedOptions = options;
    return new Response(JSON.stringify({ success: true, type: 'uint8', length: 2, data: [0, 255] }), {
      status: 200,
      headers: { 'x-request-id': 'provider-request-1' }
    });
  });

  assert.equal(capturedUrl.origin, 'https://api.quantumnumbers.anu.edu.au');
  assert.equal(capturedUrl.searchParams.get('type'), 'uint8');
  assert.equal(capturedUrl.searchParams.get('length'), '2');
  assert.equal(capturedOptions.headers['x-api-key'], API_KEY);
  assert.equal(sample.entropyHex, '00ff');
  assert.equal(sample.bits, 16);
  assert.equal(sample.providerRequestId, 'provider-request-1');
  assert.equal(JSON.stringify(sample).includes(API_KEY), false);
});

test('ANU adapter fails closed when unconfigured, timed out, rate-limited, or malformed', async () => {
  await assert.rejects(() => fetchAnuQrng(8, null), { name: 'AnuQrngError' });
  await assert.rejects(
    () => fetchAnuQrng(8, API_KEY, async () => { throw new DOMException('timeout', 'TimeoutError'); }),
    (error) => error instanceof AnuQrngError && error.kind === 'timeout'
  );
  await assert.rejects(
    () => fetchAnuQrng(8, API_KEY, async () => new Response('', { status: 429 })),
    (error) => error instanceof AnuQrngError && error.kind === 'rate_limited'
  );
  await assert.rejects(
    () => fetchAnuQrng(8, API_KEY, async () => new Response(JSON.stringify({
      success: true, type: 'uint8', length: 1, data: [256]
    }))),
    (error) => error instanceof AnuQrngError && error.kind === 'invalid_response'
  );
  await assert.rejects(
    () => fetchAnuQrng(8, API_KEY, async () => new Response('x'.repeat(16 * 1024 + 1))),
    (error) => error instanceof AnuQrngError && error.kind === 'invalid_response'
  );
});

test('QRNG API rejects unauthorized origins and invalid sizes before provider access', async () => {
  let providerCalls = 0;
  let databaseCalls = 0;
  const app = createApp({
    async query() {
      databaseCalls += 1;
      return { rows: [{ request_count: 1 }] };
    }
  }, {
    origin: ORIGIN,
    sessionSecret: 'example-test-secret-0123456789012345',
    production: false,
    anuQrngApiKey: API_KEY
  }, null, async () => {
    providerCalls += 1;
    return new Response(JSON.stringify({ success: true, type: 'uint8', length: 1, data: [1] }));
  }).listen(0);
  await once(app, 'listening');
  try {
    const url = `http://127.0.0.1:${app.address().port}/api/qrng`;
    const unauthorized = await fetch(url, {
      method: 'POST',
      headers: { Origin: 'https://attacker.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ bits: 8 })
    });
    assert.equal(unauthorized.status, 403);

    const invalid = await fetch(url, {
      method: 'POST',
      headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bits: 7 })
    });
    assert.equal(invalid.status, 400);
    assert.equal(databaseCalls, 0);
    assert.equal(providerCalls, 0);
  } finally {
    app.close();
    await once(app, 'close');
  }
});

test('QRNG API returns validated data and provenance without exposing credentials', async () => {
  let providerCalls = 0;
  const app = createApp({
    async query(sql) {
      assert.match(sql, /qrng_rate_limits/);
      return { rows: [{ request_count: 1 }] };
    }
  }, {
    origin: ORIGIN,
    sessionSecret: 'example-test-secret-0123456789012345',
    production: false,
    anuQrngApiKey: API_KEY
  }, null, async (_url, options) => {
    providerCalls += 1;
    assert.equal(options.headers['x-api-key'], API_KEY);
    return new Response(JSON.stringify({ success: true, type: 'uint8', length: 2, data: [0, 3] }), {
      status: 200,
      headers: { 'x-request-id': 'anu-123' }
    });
  }).listen(0);
  await once(app, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${app.address().port}/api/qrng`, {
      method: 'POST',
      headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bits: 16 })
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.entropyHex, '0003');
    assert.equal(body.bits, 16);
    assert.equal(body.source, 'Australian National University QRNG');
    assert.equal(body.providerRequestId, 'anu-123');
    assert.match(body.retrievedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(body.requestId.length > 0, true);
    assert.equal(JSON.stringify(body).includes(API_KEY), false);
    assert.equal(providerCalls, 1);
  } finally {
    app.close();
    await once(app, 'close');
  }
});

test('QRNG API reports unavailable without a provider key and never calls a fallback', async () => {
  let providerCalls = 0;
  const app = createApp({ async query() { throw new Error('should not access storage'); } }, {
    origin: ORIGIN,
    sessionSecret: 'example-test-secret-0123456789012345',
    production: false,
    anuQrngApiKey: null
  }, null, async () => {
    providerCalls += 1;
    return new Response('{}');
  }).listen(0);
  await once(app, 'listening');
  try {
    const status = await fetch(`http://127.0.0.1:${app.address().port}/api/qrng/status`);
    assert.deepEqual(await status.json(), { configured: false, source: 'Australian National University QRNG' });

    const response = await fetch(`http://127.0.0.1:${app.address().port}/api/qrng`, {
      method: 'POST',
      headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bits: 8 })
    });
    assert.equal(response.status, 503);
    assert.equal(providerCalls, 0);
    assert.equal((await response.text()).includes('entropyHex'), false);
  } finally {
    app.close();
    await once(app, 'close');
  }
});

test('QRNG API enforces the per-client rate limit before provider calls', async () => {
  let providerCalls = 0;
  const app = createApp({
    async query() {
      return { rows: [{ request_count: 11 }] };
    }
  }, {
    origin: ORIGIN,
    sessionSecret: 'example-test-secret-0123456789012345',
    production: false,
    anuQrngApiKey: API_KEY
  }, null, async () => {
    providerCalls += 1;
    return new Response('{}');
  }).listen(0);
  await once(app, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${app.address().port}/api/qrng`, {
      method: 'POST',
      headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bits: 8 })
    });
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('retry-after'), '60');
    assert.equal(providerCalls, 0);
  } finally {
    app.close();
    await once(app, 'close');
  }
});

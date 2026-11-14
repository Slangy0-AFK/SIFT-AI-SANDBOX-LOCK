import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../dist/app.js';
import { LfdQrngError, fetchLfdQrng } from '../dist/integrations/lfdQrng.js';

const ORIGIN = 'http://localhost:5173';

test('LfD adapter requests HTTPS HEX output and validates exact byte count', async () => {
  let capturedUrl;
  let capturedOptions;
  const sample = await fetchLfdQrng(16, async (url, options) => {
    capturedUrl = new URL(url);
    capturedOptions = options;
    return new Response(JSON.stringify({ qrn: '00FF', length: 2 }), {
      status: 200,
      headers: { 'x-request-id': 'provider-request-1' }
    });
  });

  assert.equal(capturedUrl.origin, 'https://lfdr.de');
  assert.equal(capturedUrl.pathname, '/qrng_api/qrng');
  assert.equal(capturedUrl.searchParams.get('format'), 'HEX');
  assert.equal(capturedUrl.searchParams.get('length'), '2');
  assert.equal(capturedOptions.method, 'GET');
  assert.equal(capturedOptions.redirect, 'error');
  assert.equal(capturedOptions.headers.accept, 'application/json');
  assert.equal('x-api-key' in capturedOptions.headers, false);
  assert.equal(sample.entropyHex, '00ff');
  assert.equal(sample.bits, 16);
  assert.equal(sample.providerRequestId, 'provider-request-1');
});

test('LfD adapter fails closed on timeout, rate limit, oversized, or malformed responses', async () => {
  await assert.rejects(
    () => fetchLfdQrng(8, async () => { throw new DOMException('timeout', 'TimeoutError'); }),
    (error) => error instanceof LfdQrngError && error.kind === 'timeout'
  );
  await assert.rejects(
    () => fetchLfdQrng(8, async () => new Response('', { status: 429 })),
    (error) => error instanceof LfdQrngError && error.kind === 'rate_limited'
  );
  await assert.rejects(
    () => fetchLfdQrng(8, async () => new Response(JSON.stringify({ qrn: 'gg', length: 1 }))),
    (error) => error instanceof LfdQrngError && error.kind === 'invalid_response'
  );
  await assert.rejects(
    () => fetchLfdQrng(8, async () => new Response(JSON.stringify({ qrn: 'ff', length: 2 }))),
    (error) => error instanceof LfdQrngError && error.kind === 'invalid_response'
  );
  await assert.rejects(
    () => fetchLfdQrng(8, async () => new Response('x'.repeat(16 * 1024 + 1))),
    (error) => error instanceof LfdQrngError && error.kind === 'invalid_response'
  );
});

test('LfD adapter retries a transient provider server error once and does not retry rate limits', async () => {
  let transientCalls = 0;
  const recovered = await fetchLfdQrng(8, async () => {
    transientCalls += 1;
    if (transientCalls === 1) return new Response('', { status: 503 });
    return new Response(JSON.stringify({ qrn: 'a5', length: 1 }));
  });
  assert.equal(recovered.entropyHex, 'a5');
  assert.equal(transientCalls, 2);

  let rateLimitedCalls = 0;
  await assert.rejects(
    () => fetchLfdQrng(8, async () => {
      rateLimitedCalls += 1;
      return new Response('', { status: 429 });
    }),
    (error) => error instanceof LfdQrngError && error.kind === 'rate_limited'
  );
  assert.equal(rateLimitedCalls, 1);
});

test('LfD adapter bounds retries when the provider remains unavailable', async () => {
  let calls = 0;
  await assert.rejects(
    () => fetchLfdQrng(8, async () => {
      calls += 1;
      return new Response('', { status: 503 });
    }),
    (error) => error instanceof LfdQrngError && error.kind === 'server_error'
  );
  assert.equal(calls, 2);
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
    production: false
  }, null, async () => {
    providerCalls += 1;
    return new Response(JSON.stringify({ qrn: '01', length: 1 }));
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
    production: false
  }, null, async (_url, options) => {
    providerCalls += 1;
    assert.equal(options.headers.accept, 'application/json');
    assert.equal('x-api-key' in options.headers, false);
    return new Response(JSON.stringify({ qrn: '0003', length: 2 }), {
      status: 200,
      headers: { 'x-request-id': 'lfd-123' }
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
    assert.equal(body.source, 'Laboratory for Digitalisation (LfD) QRNG');
    assert.equal(body.providerEndpoint, 'https://lfdr.de/qrng_api/qrng');
    assert.equal(body.providerRequestId, 'lfd-123');
    assert.match(body.retrievedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(body.requestId.length > 0, true);
    assert.equal(providerCalls, 1);
  } finally {
    app.close();
    await once(app, 'close');
  }
});

test('QRNG API reports provider outages and never calls a fallback', async () => {
  let providerCalls = 0;
  const app = createApp({ async query() { return { rows: [{ request_count: 1 }] }; } }, {
    origin: ORIGIN,
    sessionSecret: 'example-test-secret-0123456789012345',
    production: false
  }, null, async () => {
    providerCalls += 1;
    return new Response(JSON.stringify({ error: 'Failed to read device' }), { status: 500 });
  }).listen(0);
  await once(app, 'listening');
  try {
    const status = await fetch(`http://127.0.0.1:${app.address().port}/api/qrng/status`);
    assert.deepEqual(await status.json(), {
      configured: true,
      source: 'Laboratory for Digitalisation (LfD) QRNG'
    });

    const response = await fetch(`http://127.0.0.1:${app.address().port}/api/qrng`, {
      method: 'POST',
      headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bits: 8 })
    });
    assert.equal(response.status, 502);
    assert.equal(providerCalls, 2);
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
    production: false
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

import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../dist/app.js';
import { readConfig } from '../dist/config.js';

test('configuration requires a database URL and valid port', () => {
  assert.throws(() => readConfig({}), /DATABASE_URL/);
  assert.throws(() => readConfig({ DATABASE_URL: 'postgres://example', PORT: '0' }), /PORT/);
  assert.throws(() => readConfig({ DATABASE_URL: 'postgres://example' }), /FRONTEND_ORIGIN/);
  assert.equal(readConfig({
    DATABASE_URL: 'postgres://example', FRONTEND_ORIGIN: 'http://localhost:5173',
    SESSION_SECRET: 'example-test-secret-0123456789012345'
  }).port, 3000);
  assert.throws(() => readConfig({
    DATABASE_URL: 'postgres://example', FRONTEND_ORIGIN: 'http://localhost:5173',
    SESSION_SECRET: 'example-test-secret-0123456789012345', SMTP_HOST: 'mail.example.com'
  }), /All SMTP settings/);
});

test('password recovery reports missing email configuration', async () => {
  const server = createApp({ async query() { return { rows: [{ count: 1 }] }; } }, {
    origin: 'http://localhost:5173', sessionSecret: 'example-test-secret-0123456789012345',
    production: false
  }).listen(0);
  await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'account@example.com' })
    });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'Password recovery is not configured' });
    const registration = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/register`, {
      method: 'POST',
      headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'account@example.com', password: 'a-strong-password' })
    });
    assert.equal(registration.status, 503);
  } finally {
    server.close();
    await once(server, 'close');
  }
});

test('health reports database availability without leaking errors', async () => {
  let available = true;
  const server = createApp({
    async query(sql) {
      assert.equal(sql, 'SELECT 1');
      if (!available) throw new Error('private database detail');
    }
  }, {
    origin: 'http://localhost:5173', sessionSecret: 'example-test-secret-0123456789012345',
    production: false
  }).listen(0);
  await once(server, 'listening');
  try {
    const url = `http://127.0.0.1:${server.address().port}/health`;
    const healthy = await fetch(url);
    assert.equal(healthy.status, 200);
    assert.deepEqual(await healthy.json(), { status: 'ok' });
    available = false;
    const unhealthy = await fetch(url);
    assert.equal(unhealthy.status, 503);
    assert.deepEqual(await unhealthy.json(), { status: 'unavailable' });
  } finally {
    server.close();
    await once(server, 'close');
  }
});

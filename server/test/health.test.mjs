import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../dist/app.js';
import { readConfig } from '../dist/config.js';

test('configuration requires a database URL and valid port', () => {
  assert.throws(() => readConfig({}), /DATABASE_URL/);
  assert.throws(() => readConfig({ DATABASE_URL: 'postgres://example', PORT: '0' }), /PORT/);
  assert.equal(readConfig({ DATABASE_URL: 'postgres://example' }).port, 3000);
});

test('health reports database availability without leaking errors', async () => {
  let available = true;
  const server = createApp({
    async query(sql) {
      assert.equal(sql, 'SELECT 1');
      if (!available) throw new Error('private database detail');
    }
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

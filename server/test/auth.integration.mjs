import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { test } from 'node:test';
import pg from 'pg';
import { createApp } from '../dist/app.js';

test('accounts, sessions, CSRF, revocation and throttling use PostgreSQL', async () => {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(url, 'TEST_DATABASE_URL must point to a disposable PostgreSQL database');
  const admin = new pg.Client({ connectionString: url });
  const schema = `auth_test_${randomBytes(12).toString('hex')}`;
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  try {
    const isolatedUrl = new URL(url);
    isolatedUrl.searchParams.set('options', `-csearch_path=${schema}`);
    const databaseUrl = isolatedUrl.toString();
    const migration = spawnSync(process.execPath, ['dist/database/migrate.js'], {
      env: { ...process.env, DATABASE_URL: databaseUrl }, encoding: 'utf8'
    });
    assert.equal(migration.status, 0, migration.stderr);
    const pool = new pg.Pool({ connectionString: databaseUrl });
    const origin = 'https://frontend.example';
    const app = createApp(pool, {
      origin, sessionSecret: 'example-test-secret-0123456789012345', production: true
    });
    const server = app.listen(0);
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api/auth`;
    const post = (path, body, extraHeaders = {}) => fetch(base + path, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json', ...extraHeaders },
      body: JSON.stringify(body)
    });
    try {
      const forbidden = await post('/register', { email: 'a@example.com', password: 'a-strong-password' }, {
        Origin: 'https://attacker.example'
      });
      assert.equal(forbidden.status, 403);
      const register = await post('/register', {
        email: 'A@example.com', password: 'a-strong-password', role: 'admin'
      });
      assert.equal(register.status, 200);
      const cookieHeader = register.headers.get('set-cookie');
      assert.match(cookieHeader, /HttpOnly/);
      assert.match(cookieHeader, /Secure/);
      assert.match(cookieHeader, /SameSite=None/);
      const cookie = cookieHeader.split(';')[0];
      const account = await register.json();
      assert.equal(account.user.email, 'a@example.com');
      assert.equal(account.user.role, 'user');
      const stored = await pool.query('SELECT password_hash FROM auth_users WHERE email = $1', ['a@example.com']);
      assert.match(stored.rows[0].password_hash, /^scrypt-v1\$/);
      assert.ok(!stored.rows[0].password_hash.includes('a-strong-password'));

      const second = await post('/register', { email: 'b@example.com', password: 'another-strong-password' });
      const secondCookie = second.headers.get('set-cookie').split(';')[0];
      const secondAccount = await second.json();
      assert.equal((await post('/register', { email: 'A@example.com', password: 'a-strong-password' })).status, 409);
      await pool.query('ALTER TABLE auth_sessions ADD CONSTRAINT reject_new_sessions CHECK (false) NOT VALID');
      try {
        assert.equal((await post('/register', { email: 'rollback@example.com', password: 'a-strong-password' })).status, 500);
        const rolledBack = await pool.query('SELECT id FROM auth_users WHERE email = $1', ['rollback@example.com']);
        assert.equal(rolledBack.rowCount, 0);
      } finally {
        await pool.query('ALTER TABLE auth_sessions DROP CONSTRAINT reject_new_sessions');
      }
      const restored = await fetch(base + '/session', { headers: { Cookie: cookie } });
      assert.deepEqual((await restored.json()).user, account.user);
      const secondRestored = await fetch(base + '/session', { headers: { Cookie: secondCookie } });
      assert.deepEqual((await secondRestored.json()).user, secondAccount.user);
      assert.notEqual(account.user.id, secondAccount.user.id);

      assert.equal((await post('/logout', {}, { Cookie: cookie })).status, 403);
      assert.equal((await post('/logout', {}, {
        Cookie: cookie, 'X-CSRF-Token': secondAccount.csrfToken
      })).status, 403);
      assert.equal((await post('/logout', {}, {
        Cookie: cookie, 'X-CSRF-Token': account.csrfToken
      })).status, 204);
      assert.equal((await fetch(base + '/session', { headers: { Cookie: cookie } })).status, 401);
      assert.equal((await fetch(base + '/session', { headers: { Cookie: secondCookie } })).status, 200);

      assert.equal((await post('/login', {
        email: 'a@example.com', password: 'incorrect-password'
      })).status, 401);
      const login = await post('/login', { email: 'a@example.com', password: 'a-strong-password' });
      assert.equal(login.status, 200);
      const loginCookie = login.headers.get('set-cookie').split(';')[0];
      await pool.query("UPDATE auth_sessions SET expires_at = now() - interval '1 second' WHERE user_id = $1", [account.user.id]);
      assert.equal((await fetch(base + '/session', { headers: { Cookie: loginCookie } })).status, 401);

      await pool.query('DELETE FROM auth_rate_limits');
      for (let i = 0; i < 10; i++) {
        const response = await post('/login', { email: 'unknown@example.com', password: 'incorrect-password' });
        assert.equal(response.status, 401);
      }
      const limited = await post('/login', { email: 'unknown@example.com', password: 'incorrect-password' });
      assert.equal(limited.status, 429);
    } finally {
      server.close();
      await once(server, 'close');
      await pool.end();
    }
  } finally {
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  }
});

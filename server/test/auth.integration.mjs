import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { test } from 'node:test';
import pg from 'pg';
import { createApp } from '../dist/app.js';
import { hashPassword } from '../dist/security/password.js';

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
    const deliveries = [];
    const verifications = [];
    let deliveryFails = false;
    const mailer = {
      async sendPasswordReset(email, url) {
        if (deliveryFails) throw new Error('test delivery failure');
        deliveries.push({ email, url });
      },
      async sendVerification(email, url) {
        if (deliveryFails) throw new Error('test delivery failure');
        verifications.push({ email, url });
      }
    };
    const app = createApp(pool, {
      origin, sessionSecret: 'example-test-secret-0123456789012345', production: true
    }, mailer);
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
      assert.equal(register.status, 202);
      assert.equal((await post('/login', { email: 'a@example.com', password: 'a-strong-password' })).status, 401);
      const expiredVerification = new URLSearchParams(new URL(verifications[0].url).hash.slice(1)).get('token');
      await pool.query("UPDATE email_verifications SET expires_at = now() - interval '1 second'");
      assert.equal((await post('/verify-email', { token: expiredVerification })).status, 400);
      assert.equal((await post('/resend-verification', { email: 'a@example.com' })).status, 202);
      const verification = new URLSearchParams(new URL(verifications[1].url).hash.slice(1)).get('token');
      assert.equal((await post('/verify-email', { token: verification })).status, 200);
      assert.equal((await post('/verify-email', { token: verification })).status, 400);
      const firstLogin = await post('/login', { email: 'a@example.com', password: 'a-strong-password' });
      assert.equal(firstLogin.status, 200);
      const cookieHeader = firstLogin.headers.get('set-cookie');
      assert.match(cookieHeader, /HttpOnly/);
      assert.match(cookieHeader, /Secure/);
      assert.match(cookieHeader, /SameSite=None/);
      const cookie = cookieHeader.split(';')[0];
      const account = await firstLogin.json();
      assert.equal(account.user.email, 'a@example.com');
      assert.equal(account.user.role, 'user');
      const stored = await pool.query('SELECT password_hash FROM auth_users WHERE email = $1', ['a@example.com']);
      assert.match(stored.rows[0].password_hash, /^scrypt-v1\$/);
      assert.ok(!stored.rows[0].password_hash.includes('a-strong-password'));

      await pool.query('DELETE FROM auth_rate_limits');
      const second = await post('/register', { email: 'b@example.com', password: 'another-strong-password' });
      assert.equal(second.status, 202);
      const secondVerification = new URLSearchParams(new URL(verifications[2].url).hash.slice(1)).get('token');
      assert.equal((await post('/verify-email', { token: secondVerification })).status, 200);
      const secondLogin = await post('/login', { email: 'b@example.com', password: 'another-strong-password' });
      const secondCookie = secondLogin.headers.get('set-cookie').split(';')[0];
      const secondAccount = await secondLogin.json();
      assert.equal((await post('/register', { email: 'A@example.com', password: 'a-strong-password' })).status, 409);
      await pool.query('ALTER TABLE email_verifications ADD CONSTRAINT reject_new_verifications CHECK (false) NOT VALID');
      try {
        assert.equal((await post('/register', { email: 'rollback@example.com', password: 'a-strong-password' })).status, 500);
        const rolledBack = await pool.query('SELECT id FROM auth_users WHERE email = $1', ['rollback@example.com']);
        assert.equal(rolledBack.rowCount, 0);
      } finally {
        await pool.query('ALTER TABLE email_verifications DROP CONSTRAINT reject_new_verifications');
      }
      await pool.query('ALTER TABLE audit_log ADD CONSTRAINT reject_audit CHECK (false) NOT VALID');
      try {
        assert.equal((await post('/register', { email: 'audit-rollback@example.com', password: 'a-strong-password' })).status, 500);
        assert.equal((await pool.query('SELECT id FROM auth_users WHERE email = $1', ['audit-rollback@example.com'])).rowCount, 0);
      } finally {
        await pool.query('ALTER TABLE audit_log DROP CONSTRAINT reject_audit');
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
      const activeLogin = await post('/login', { email: 'a@example.com', password: 'a-strong-password' });
      const activeCookie = activeLogin.headers.get('set-cookie').split(';')[0];
      assert.equal((await post('/forgot-password', { email: 'unknown@example.com' })).status, 202);
      assert.equal(deliveries.length, 0);
      assert.equal((await post('/forgot-password', { email: 'a@example.com' })).status, 202);
      assert.equal(deliveries[0].email, 'a@example.com');
      const resetUrl = new URL(deliveries[0].url);
      assert.equal(resetUrl.search, '');
      const expiredToken = new URLSearchParams(resetUrl.hash.slice(1)).get('token');
      const saved = await pool.query('SELECT token_hash FROM password_resets');
      assert.notEqual(saved.rows[0].token_hash, expiredToken);
      await pool.query("UPDATE password_resets SET expires_at = now() - interval '1 second'");
      assert.equal((await post('/reset-password', { token: expiredToken, password: 'replacement-password' })).status, 400);
      assert.equal((await post('/forgot-password', { email: 'a@example.com' })).status, 202);
      const token = new URLSearchParams(new URL(deliveries[1].url).hash.slice(1)).get('token');
      assert.equal((await post('/reset-password', { token, password: 'replacement-password' })).status, 200);
      assert.equal((await fetch(base + '/session', { headers: { Cookie: activeCookie } })).status, 401);
      assert.equal((await fetch(base + '/session', { headers: { Cookie: secondCookie } })).status, 200);
      assert.equal((await post('/reset-password', { token, password: 'replacement-password' })).status, 400);
      assert.equal((await post('/login', { email: 'a@example.com', password: 'a-strong-password' })).status, 401);
      assert.equal((await post('/login', { email: 'a@example.com', password: 'replacement-password' })).status, 200);
      await pool.query('DELETE FROM auth_rate_limits');
      const before = await pool.query('SELECT count(*) FROM password_resets');
      deliveryFails = true;
      assert.equal((await post('/forgot-password', { email: 'a@example.com' })).status, 503);
      const after = await pool.query('SELECT count(*) FROM password_resets');
      assert.equal(after.rows[0].count, before.rows[0].count);
      assert.equal((await post('/register', { email: 'failed@example.com', password: 'a-strong-password' })).status, 503);
      assert.equal((await pool.query('SELECT id FROM auth_users WHERE email = $1', ['failed@example.com'])).rowCount, 0);
      const audit = await pool.query('SELECT action, actor_id, resource_id, details FROM audit_log');
      const actions = new Set(audit.rows.map((row) => row.action));
      for (const action of ['account.registration.started', 'account.email.verified', 'account.login.succeeded', 'account.login.failed', 'account.logout', 'account.password.reset']) {
        assert.ok(actions.has(action), `missing audit event ${action}`);
      }
      assert.ok(!JSON.stringify(audit.rows).includes('replacement-password'));
      assert.ok(!JSON.stringify(audit.rows).includes(token));

      await pool.query('DELETE FROM auth_rate_limits');
      const newHash = await hashPassword('a-newer-password');
      const lock = await pool.connect();
      let committed = false;
      try {
        await lock.query('BEGIN');
        await lock.query('SELECT id FROM auth_users WHERE id = $1 FOR UPDATE', [account.user.id]);
        const racingLogin = post('/login', { email: 'a@example.com', password: 'replacement-password' });
        let blocked = false;
        for (let i = 0; i < 100; i++) {
          const waiting = await pool.query(
            "SELECT count(*) FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND query = $1",
            ['SELECT password_hash, email_verified_at FROM auth_users WHERE id = $1 FOR UPDATE']
          );
          if (Number(waiting.rows[0].count) > 0) {
            blocked = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        assert.ok(blocked, 'login should wait on the account lock');
        await lock.query('UPDATE auth_users SET password_hash = $1 WHERE id = $2', [newHash, account.user.id]);
        await lock.query('COMMIT');
        committed = true;
        assert.equal((await racingLogin).status, 401);
      } finally {
        if (!committed) await lock.query('ROLLBACK');
        lock.release();
      }

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

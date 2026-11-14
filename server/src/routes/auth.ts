import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type pg from 'pg';
import type { AuthConfig } from '../app.js';
import { hashPassword, verifyPassword } from '../security/password.js';
import type { AccountMailer } from '../integrations/email.js';

interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const cookieName = (config: AuthConfig) => config.production ? '__Host-sift_session' : 'sift_session';
const cookieOptions = (config: AuthConfig) => ({
  httpOnly: true,
  secure: config.production,
  sameSite: config.production ? 'none' as const : 'lax' as const,
  path: '/'
});
const csrfToken = (token: string, secret: string) => createHmac('sha256', secret).update(token).digest('hex');

function readCookie(req: Request, name: string) {
  const matches = (req.get('Cookie') || '').split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${name}=`));
  if (matches.length !== 1) return '';
  const token = matches[0].slice(name.length + 1);
  return /^[a-f0-9]{64}$/.test(token) ? token : '';
}

function validEmail(email: unknown): email is string {
  return typeof email === 'string' && email.trim().length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 12 && Buffer.byteLength(password) <= 256;
}

function validCredentials(body: unknown): body is { email: string; password: string } {
  if (typeof body !== 'object' || body === null || !('email' in body) || !('password' in body)) return false;
  const { email, password } = body;
  return validEmail(email) && validPassword(password);
}

export function authRouter(database: pg.Pool, config: AuthConfig, mailer: AccountMailer | null) {
  const router = Router();
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    next();
  });

  function requireOrigin(req: Request, res: Response, next: NextFunction) {
    if (req.get('Origin') !== config.origin) {
      res.status(403).json({ error: 'Origin not allowed' });
      return;
    }
    if (!req.is('application/json')) {
      res.status(415).json({ error: 'JSON required' });
      return;
    }
    next();
  }

  async function throttle(req: Request, res: Response, next: NextFunction) {
    const key = digest(`auth:${req.ip || 'unknown'}`);
    const result = await database.query<{ count: number }>(`
      INSERT INTO auth_rate_limits (key, window_start, count) VALUES ($1, now(), 1)
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN auth_rate_limits.window_start < now() - interval '1 minute'
          THEN 1 ELSE auth_rate_limits.count + 1 END,
        window_start = CASE WHEN auth_rate_limits.window_start < now() - interval '1 minute'
          THEN now() ELSE auth_rate_limits.window_start END
      RETURNING count
    `, [key]);
    if (result.rows[0].count > 10) {
      res.status(429).json({ error: 'Too many attempts' });
      return;
    }
    next();
  }

  async function createSession(user: User, connection: pg.Pool | pg.PoolClient) {
    const token = randomBytes(32).toString('hex');
    await connection.query(
      "INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '12 hours')",
      [digest(token), user.id]
    );
    return token;
  }

  async function audit(connection: pg.Pool | pg.PoolClient, action: string, userId: string | null) {
    await connection.query(
      'INSERT INTO audit_log (actor_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $1)',
      [userId, action, 'account']
    );
  }

  function sendSession(user: User, token: string, res: Response) {
    res.cookie(cookieName(config), token, { ...cookieOptions(config), maxAge: 12 * 60 * 60 * 1000 });
    res.json({ user, csrfToken: csrfToken(token, config.sessionSecret) });
  }

  async function getSession(req: Request) {
    const token = readCookie(req, cookieName(config));
    if (!token) return null;
    const result = await database.query<User>(`
      SELECT u.id, u.email, u.role FROM auth_sessions s
      JOIN auth_users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND u.email_verified_at IS NOT NULL
    `, [digest(token)]);
    if (!result.rows[0]) return null;
    return { token, user: result.rows[0] };
  }

  router.post('/register', requireOrigin, throttle, async (req, res) => {
    if (!validCredentials(req.body)) {
      res.status(400).json({ error: 'Valid email and password of at least 12 characters required' });
      return;
    }
    if (!mailer) {
      res.status(503).json({ error: 'Registration email is not configured' });
      return;
    }
    const email = req.body.email.trim().toLowerCase();
    const hash = await hashPassword(req.body.password);
    let user: User;
    const token = randomBytes(32).toString('hex');
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<User>(
        'INSERT INTO auth_users (id, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email, role',
        [randomUUID(), email, hash]
      );
      user = result.rows[0];
      await client.query(
        "INSERT INTO email_verifications (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '24 hours')",
        [digest(token), user.id]
      );
      await audit(client, 'account.registration.started', user.id);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        res.status(409).json({ error: 'Account already exists' });
        return;
      }
      throw error;
    } finally {
      client.release();
    }
    const url = new URL('/verify-email', config.origin);
    url.hash = `token=${token}`;
    try {
      await mailer.sendVerification(email, url.toString());
    } catch {
      await database.query('DELETE FROM auth_users WHERE id = $1 AND email_verified_at IS NULL', [user.id]);
      console.error('Verification email delivery failed');
      res.status(503).json({ error: 'Registration email is unavailable' });
      return;
    }
    res.status(202).json({ message: 'Check your email to verify your account.' });
  });

  router.post('/login', requireOrigin, throttle, async (req, res) => {
    if (!validCredentials(req.body)) {
      res.status(400).json({ error: 'Valid email and password required' });
      return;
    }
    const result = await database.query<User & { password_hash: string; email_verified_at: Date | null }>(
      'SELECT id, email, role, password_hash, email_verified_at FROM auth_users WHERE email = $1',
      [req.body.email.trim().toLowerCase()]
    );
    const row = result.rows[0];
    const valid = await verifyPassword(req.body.password, row?.password_hash ?? null);
    if (!row || !valid || !row.email_verified_at) {
      await audit(database, 'account.login.failed', null);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const user: User = { id: row.id, email: row.email, role: row.role };
    const client = await database.connect();
    let token: string;
    try {
      await client.query('BEGIN');
      const current = await client.query<{ password_hash: string; email_verified_at: Date | null }>(
        'SELECT password_hash, email_verified_at FROM auth_users WHERE id = $1 FOR UPDATE', [user.id]
      );
      if (!current.rows[0] || current.rows[0].password_hash !== row.password_hash || !current.rows[0].email_verified_at) {
        await client.query('ROLLBACK');
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      token = await createSession(user, client);
      await audit(client, 'account.login.succeeded', user.id);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    sendSession(user, token, res);
  });

  router.post('/verify-email', requireOrigin, throttle, async (req, res) => {
    const token = req.body?.token;
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      res.status(400).json({ error: 'Valid verification token required' });
      return;
    }
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      const candidate = await client.query<{ user_id: string }>(
        'SELECT user_id FROM email_verifications WHERE token_hash = $1', [digest(token)]
      );
      if (!candidate.rows[0]) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Invalid or expired verification token' });
        return;
      }
      const userId = candidate.rows[0].user_id;
      await client.query('SELECT id FROM auth_users WHERE id = $1 FOR UPDATE', [userId]);
      const verified = await client.query(`
        UPDATE email_verifications SET used_at = now()
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
        RETURNING user_id
      `, [digest(token)]);
      if (!verified.rows[0]) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Invalid or expired verification token' });
        return;
      }
      await client.query('UPDATE auth_users SET email_verified_at = now() WHERE id = $1', [userId]);
      await client.query('UPDATE email_verifications SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [userId]);
      await audit(client, 'account.email.verified', userId);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    res.json({ message: 'Email verified' });
  });

  router.post('/resend-verification', requireOrigin, throttle, async (req, res) => {
    if (!validEmail(req.body?.email)) {
      res.status(400).json({ error: 'Valid email required' });
      return;
    }
    if (!mailer) {
      res.status(503).json({ error: 'Registration email is not configured' });
      return;
    }
    const email = req.body.email.trim().toLowerCase();
    const result = await database.query<{ id: string }>(
      'SELECT id FROM auth_users WHERE email = $1 AND email_verified_at IS NULL', [email]
    );
    if (result.rows[0]) {
      const token = randomBytes(32).toString('hex');
      const tokenHash = digest(token);
      await database.query(
        "INSERT INTO email_verifications (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '24 hours')",
        [tokenHash, result.rows[0].id]
      );
      const url = new URL('/verify-email', config.origin);
      url.hash = `token=${token}`;
      try {
        await mailer.sendVerification(email, url.toString());
      } catch {
        await database.query('DELETE FROM email_verifications WHERE token_hash = $1', [tokenHash]);
        console.error('Verification email delivery failed');
        res.status(503).json({ error: 'Registration email is unavailable' });
        return;
      }
    }
    res.status(202).json({ message: 'If the account needs verification, an email will be sent.' });
  });

  router.post('/forgot-password', requireOrigin, throttle, async (req, res) => {
    if (!validEmail(req.body?.email)) {
      res.status(400).json({ error: 'Valid email required' });
      return;
    }
    if (!mailer) {
      res.status(503).json({ error: 'Password recovery is not configured' });
      return;
    }
    const email = req.body.email.trim().toLowerCase();
    const found = await database.query<{ id: string }>(
      'SELECT id FROM auth_users WHERE email = $1 AND email_verified_at IS NOT NULL', [email]
    );
    if (found.rows[0]) {
      const token = randomBytes(32).toString('hex');
      const tokenHash = digest(token);
      await database.query(
        "INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '30 minutes')",
        [tokenHash, found.rows[0].id]
      );
      const url = new URL('/reset-password', config.origin);
      url.hash = `token=${token}`;
      try {
        await mailer.sendPasswordReset(email, url.toString());
      } catch {
        await database.query('DELETE FROM password_resets WHERE token_hash = $1', [tokenHash]);
        console.error('Password recovery email delivery failed');
        res.status(503).json({ error: 'Password recovery is unavailable' });
        return;
      }
    }
    res.status(202).json({ message: 'If the account exists, a recovery email will be sent.' });
  });

  router.post('/reset-password', requireOrigin, throttle, async (req, res) => {
    const { token, password } = req.body || {};
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || !validPassword(password)) {
      res.status(400).json({ error: 'Valid token and password required' });
      return;
    }
    const hash = await hashPassword(password);
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      const candidate = await client.query<{ user_id: string }>(
        'SELECT user_id FROM password_resets WHERE token_hash = $1', [digest(token)]
      );
      if (!candidate.rows[0]) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Invalid or expired recovery token' });
        return;
      }
      await client.query('SELECT id FROM auth_users WHERE id = $1 FOR UPDATE', [candidate.rows[0].user_id]);
      const reset = await client.query<{ user_id: string }>(`
        UPDATE password_resets SET used_at = now()
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
        RETURNING user_id
      `, [digest(token)]);
      if (!reset.rows[0]) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Invalid or expired recovery token' });
        return;
      }
      const userId = reset.rows[0].user_id;
      await client.query('UPDATE auth_users SET password_hash = $1 WHERE id = $2', [hash, userId]);
      await client.query('DELETE FROM auth_sessions WHERE user_id = $1', [userId]);
      await client.query('UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [userId]);
      await audit(client, 'account.password.reset', userId);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    res.json({ message: 'Password reset complete' });
  });

  router.get('/session', async (req, res) => {
    const session = await getSession(req);
    if (!session) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    res.json({ user: session.user, csrfToken: csrfToken(session.token, config.sessionSecret) });
  });

  router.post('/logout', requireOrigin, async (req, res) => {
    const session = await getSession(req);
    if (!session) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const supplied = req.get('X-CSRF-Token') || '';
    const expected = csrfToken(session.token, config.sessionSecret);
    if (!/^[a-f0-9]{64}$/.test(supplied) ||
        !timingSafeEqual(Buffer.from(supplied, 'hex'), Buffer.from(expected, 'hex'))) {
      res.status(403).json({ error: 'Invalid CSRF token' });
      return;
    }
    const result = await database.query(`
      WITH removed AS (
        DELETE FROM auth_sessions WHERE token_hash = $1 RETURNING user_id
      )
      INSERT INTO audit_log (actor_id, action, resource_type, resource_id)
      SELECT user_id::text, 'account.logout', 'account', user_id::text FROM removed
      RETURNING id
    `, [digest(session.token)]);
    if (!result.rowCount) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    res.clearCookie(cookieName(config), cookieOptions(config));
    res.status(204).end();
  });
  return router;
}

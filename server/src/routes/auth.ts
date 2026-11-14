import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type pg from 'pg';
import type { AuthConfig } from '../app.js';
import { hashPassword, verifyPassword } from '../security/password.js';

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

function validCredentials(body: unknown): body is { email: string; password: string } {
  if (typeof body !== 'object' || body === null || !('email' in body) || !('password' in body)) return false;
  const { email, password } = body;
  return typeof email === 'string' && email.trim().length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    typeof password === 'string' && password.length >= 12 && Buffer.byteLength(password) <= 256;
}

export function authRouter(database: pg.Pool, config: AuthConfig) {
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
      WHERE s.token_hash = $1 AND s.expires_at > now()
    `, [digest(token)]);
    if (!result.rows[0]) return null;
    return { token, user: result.rows[0] };
  }

  router.post('/register', requireOrigin, throttle, async (req, res) => {
    if (!validCredentials(req.body)) {
      res.status(400).json({ error: 'Valid email and password of at least 12 characters required' });
      return;
    }
    const email = req.body.email.trim().toLowerCase();
    const hash = await hashPassword(req.body.password);
    let user: User;
    let token: string;
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<User>(
        'INSERT INTO auth_users (id, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email, role',
        [randomUUID(), email, hash]
      );
      user = result.rows[0];
      token = await createSession(user, client);
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
    sendSession(user, token, res);
  });

  router.post('/login', requireOrigin, throttle, async (req, res) => {
    if (!validCredentials(req.body)) {
      res.status(400).json({ error: 'Valid email and password required' });
      return;
    }
    const result = await database.query<User & { password_hash: string }>(
      'SELECT id, email, role, password_hash FROM auth_users WHERE email = $1',
      [req.body.email.trim().toLowerCase()]
    );
    const row = result.rows[0];
    const valid = await verifyPassword(req.body.password, row?.password_hash ?? null);
    if (!row || !valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const user: User = { id: row.id, email: row.email, role: row.role };
    const token = await createSession(user, database);
    sendSession(user, token, res);
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
    await database.query('DELETE FROM auth_sessions WHERE token_hash = $1', [digest(session.token)]);
    res.clearCookie(cookieName(config), cookieOptions(config));
    res.status(204).end();
  });
  return router;
}

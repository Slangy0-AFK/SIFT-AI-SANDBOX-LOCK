import { createHash, randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type pg from 'pg';
import { LfdQrngError, fetchLfdQrng } from '../integrations/lfdQrng.js';

const SOURCE = 'Laboratory for Digitalisation (LfD) QRNG';
const PROVIDER_ENDPOINT = 'https://lfdr.de/qrng_api/qrng';

export interface QrngConfig {
  origin: string;
}

function requireOrigin(req: Request, res: Response, next: NextFunction, origin: string) {
  if (req.get('Origin') !== origin) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }
  if (!req.is('application/json')) {
    res.status(415).json({ error: 'JSON required' });
    return;
  }
  next();
}

export function qrngRouter(
  database: pg.Pool,
  config: QrngConfig,
  fetchImpl: typeof fetch = fetch
) {
  const router = Router();
  router.get('/status', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({
      configured: true,
      source: SOURCE
    });
  });

  router.post('/', (req, res, next) => requireOrigin(req, res, next, config.origin), async (req, res) => {
    const bits = typeof req.body === 'object' && req.body !== null ? req.body.bits : undefined;
    if (!Number.isInteger(bits) || bits < 8 || bits > 8192 || bits % 8 !== 0) {
      res.status(400).json({ error: 'bits must be a multiple of 8 between 8 and 8192' });
      return;
    }
    const requestId = randomUUID();
    const address = req.ip || req.socket.remoteAddress || 'unknown';
    const keyHash = createHash('sha256').update(address).digest('hex');
    let requestCount: number;
    try {
      const result = await database.query<{ request_count: number }>(`
        INSERT INTO qrng_rate_limits (key_hash, window_started_at, request_count)
        VALUES ($1, now(), 1)
        ON CONFLICT (key_hash) DO UPDATE SET
          request_count = CASE
            WHEN qrng_rate_limits.window_started_at < now() - interval '1 minute' THEN 1
            ELSE qrng_rate_limits.request_count + 1
          END,
          window_started_at = CASE
            WHEN qrng_rate_limits.window_started_at < now() - interval '1 minute' THEN now()
            ELSE qrng_rate_limits.window_started_at
          END
        RETURNING request_count
      `, [keyHash]);
      requestCount = result.rows[0]?.request_count ?? 0;
    } catch {
      console.error('[qrng] rate limit storage unavailable');
      res.status(503).json({ error: 'Quantum entropy is temporarily unavailable.' });
      return;
    }
    if (requestCount > 10) {
      res.set('Retry-After', '60');
      res.status(429).json({ error: 'QRNG request limit reached. Try again later.' });
      return;
    }

    try {
      const sample = await fetchLfdQrng(bits, fetchImpl);
      res.set('Cache-Control', 'no-store');
      res.json({
        ...sample,
        source: SOURCE,
        providerEndpoint: PROVIDER_ENDPOINT,
        retrievedAt: new Date().toISOString(),
        requestId
      });
    } catch (error) {
      if (error instanceof LfdQrngError) {
        console.warn('[qrng] provider request failed', { kind: error.kind, requestId });
        const status = error.kind === 'timeout' ? 504
          : error.kind === 'invalid_response' ? 502
            : error.kind === 'rate_limited' ? 503
              : 502;
        res.status(status).json({
          error: error.kind === 'timeout'
            ? 'Quantum entropy provider timed out.'
            : 'Quantum entropy is unavailable; no fallback source was used.'
        });
        return;
      }
      console.error('[qrng] provider request failed', { requestId });
      res.status(502).json({ error: 'Quantum entropy is unavailable; no fallback source was used.' });
    }
  });
  return router;
}

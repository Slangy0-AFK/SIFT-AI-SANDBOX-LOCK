import express from 'express';
import type pg from 'pg';
import { authRouter } from './routes/auth.js';

export interface AuthConfig {
  origin: string;
  sessionSecret: string;
  production: boolean;
}

export function createApp(database: pg.Pool, config: AuthConfig) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.vary('Origin');
    if (req.get('Origin') === config.origin) {
      res.set('Access-Control-Allow-Origin', config.origin);
      res.set('Access-Control-Allow-Credentials', 'true');
    }
    if (req.method === 'OPTIONS') {
      if (req.get('Origin') !== config.origin) {
        res.sendStatus(403);
        return;
      }
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.get('/health', async (_req, res) => {
    try {
      await database.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch {
      console.error('Database health check failed');
      res.status(503).json({ status: 'unavailable' });
    }
  });
  app.use('/api/auth', express.json({ limit: '4kb' }), authRouter(database, config));
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
      res.status(400).json({ error: 'Invalid JSON' });
      return;
    }
    if (typeof error === 'object' && error !== null && 'status' in error && error.status === 413) {
      res.status(413).json({ error: 'Request too large' });
      return;
    }
    console.error('Request failed');
    res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}

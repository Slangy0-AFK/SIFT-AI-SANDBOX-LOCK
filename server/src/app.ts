import express from 'express';

export interface DatabaseHealth {
  query(sql: string): Promise<unknown>;
}

export function createApp(database: DatabaseHealth) {
  const app = express();
  app.disable('x-powered-by');
  app.get('/health', async (_req, res) => {
    try {
      await database.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch {
      console.error('Database health check failed');
      res.status(503).json({ status: 'unavailable' });
    }
  });
  return app;
}

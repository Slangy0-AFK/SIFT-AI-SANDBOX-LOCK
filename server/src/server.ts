import pg from 'pg';
import { createApp } from './app.js';
import { readConfig } from './config.js';

const config = readConfig(process.env);
const database = new pg.Pool({ connectionString: config.databaseUrl });
const server = createApp(database, config).listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(() => {
      database.end().then(() => process.exit(0), (error: unknown) => {
        console.error('Database shutdown failed:', error);
        process.exit(1);
      });
    });
  });
}

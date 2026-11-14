import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { readConfig } from '../config.js';

const migrationDir = fileURLToPath(new URL('../../migrations/', import.meta.url));

async function migrate() {
  const config = readConfig(process.env);
  const client = new pg.Client({ connectionString: config.databaseUrl });
  await client.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('siftai_schema_migrations'))");
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          name text PRIMARY KEY,
          checksum text NOT NULL,
          applied_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      const files = (await readdir(migrationDir)).filter((name) => name.endsWith('.sql')).sort();
      const applied = await client.query<{ name: string; checksum: string }>(
        'SELECT name, checksum FROM schema_migrations ORDER BY name'
      );
      const known = new Map(applied.rows.map((row) => [row.name, row.checksum]));
      for (const [index, row] of applied.rows.entries()) {
        if (files[index] !== row.name) {
          throw new Error(`Migration history differs at ${row.name}`);
        }
      }
      for (const name of files) {
        const sql = await readFile(new URL(`../../migrations/${name}`, import.meta.url), 'utf8');
        const checksum = createHash('sha256').update(sql).digest('hex');
        const previous = known.get(name);
        if (previous && previous !== checksum) throw new Error(`Applied migration has changed: ${name}`);
        if (previous) continue;
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [name, checksum]);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
        console.log(`Applied migration ${name}`);
      }
    } finally {
      await client.query("SELECT pg_advisory_unlock(hashtext('siftai_schema_migrations'))");
    }
  } finally {
    await client.end();
  }
}

migrate().catch((error: unknown) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});

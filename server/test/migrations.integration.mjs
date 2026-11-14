import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import pg from 'pg';

test('migrations are repeatable and reject altered or missing history', async () => {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(url, 'TEST_DATABASE_URL must point to a disposable PostgreSQL database');
  const admin = new pg.Client({ connectionString: url });
  const schema = `migration_test_${randomBytes(12).toString('hex')}`;
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  try {
    const isolatedUrl = new URL(url);
    isolatedUrl.searchParams.set('options', `-csearch_path=${schema}`);
    const databaseUrl = isolatedUrl.toString();
    const run = () => spawnSync(process.execPath, ['dist/database/migrate.js'], {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      encoding: 'utf8'
    });

    const first = run();
    assert.equal(first.status, 0, first.stderr);
    const second = run();
    assert.equal(second.status, 0, second.stderr);
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      const applied = await client.query('SELECT name, checksum FROM schema_migrations');
      assert.equal(applied.rowCount, 1);
      assert.equal(applied.rows[0].name, '0001_audit_log.sql');
      await client.query("UPDATE schema_migrations SET checksum = 'changed'");
      const changed = run();
      assert.notEqual(changed.status, 0);
      assert.match(changed.stderr, /Applied migration has changed/);
      await client.query('UPDATE schema_migrations SET checksum = $1', [applied.rows[0].checksum]);
      await client.query("UPDATE schema_migrations SET name = '0000_missing.sql'");
      const missing = run();
      assert.notEqual(missing.status, 0);
      assert.match(missing.stderr, /Migration history differs/);
    } finally {
      await client.end();
    }
  } finally {
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  }
});

# Independent backend foundation

This is not yet a replacement for the existing application backend. It exposes
only `GET /health`; authentication, authorization, entity access, integrations,
licensing, and the application APIs are not implemented. Do not direct
production traffic to it.

Node.js 22+ and PostgreSQL are required. Install with `npm ci` in this directory,
then run `npm run build`, `npm run migrate`, and `npm start`. `DATABASE_URL` is
required; `PORT` defaults to 3000. Run `npm test` for the local unit tests.
Run `npm run test:migrations` with `TEST_DATABASE_URL` set to a disposable
PostgreSQL database to exercise migrations in a temporary schema. The test
database role needs permission to create and drop schemas.

The root Compose file provides a persistent PostgreSQL volume and binds the API
to loopback. Set `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and
`DATABASE_URL` in the deployment environment. The URL must use host `db` and
match the PostgreSQL credentials; URL-encode special characters in credentials.
Do not commit credentials. Start the database and build the API image, then
explicitly run migrations before starting the API:

```
docker compose up -d db
docker compose build api
docker compose run --rm --no-deps api node dist/database/migrate.js
docker compose up -d api
```

Changing the database password environment variable does not change an existing
PostgreSQL volume's password; use PostgreSQL's role-management commands for
rotation. The health endpoint verifies database connectivity, not schema
compatibility or readiness of the unfinished application.

## Migrations and recovery

Migrations run in filename order, each in its own transaction. An advisory lock
serializes runners, and recorded checksums detect changed, missing, or
out-of-order applied files. Never edit an applied migration: add a new one.
Back up the database and test restoration before deploying migrations. There is
no automatic down migration; if rollback is needed, stop writers and restore a
tested backup, or deploy a reviewed corrective migration. This does not migrate
any existing customer data.

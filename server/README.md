# Independent backend foundation

This is not yet a replacement for the existing application backend. It exposes
`GET /health` and initial registration, login, session lookup, and logout
endpoints. Password recovery, email verification, administrator operations,
entity access, integrations, licensing, and the application APIs are not
implemented. Do not direct production traffic to it.

Node.js 22+ and PostgreSQL are required. Install with `npm ci` in this directory,
then run `npm run build`, `npm run migrate`, and `npm start`. `DATABASE_URL` is
required; `PORT` defaults to 3000. Set `FRONTEND_ORIGIN` to the exact browser
origin and `SESSION_SECRET` to a cryptographically random secret of at least 32
bytes. Production requires an HTTPS frontend origin and HTTPS for the API.
Run `npm test` for the local unit tests.
Run `npm run test:migrations` with `TEST_DATABASE_URL` set to a disposable
PostgreSQL database to exercise migrations in a temporary schema. The test
database role needs permission to create and drop schemas.

The root Compose file provides a persistent PostgreSQL volume and binds the API
to loopback. Set `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and
`DATABASE_URL`, `FRONTEND_ORIGIN`, and `SESSION_SECRET` in the deployment
environment. The URL must use host `db` and
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

The initial authentication API uses scrypt password hashes and random
server-revocable, 12-hour HttpOnly sessions. Production cookies require HTTPS
and use SameSite=None for cross-site frontend deployments; browsers that block
third-party cookies may require an appropriately configured same-site reverse
proxy. State-changing authentication requests require the configured Origin;
logout also requires the `csrfToken` returned by login or session lookup as an
`X-CSRF-Token` header. Login and registration have a database-backed IP limit.
The service does not trust forwarded IP headers, so a reverse proxy currently
causes clients behind it to share a limit. Password recovery and verified-email
flows must be implemented before these endpoints are used in production.

## Migrations and recovery

Migrations run in filename order, each in its own transaction. An advisory lock
serializes runners, and recorded checksums detect changed, missing, or
out-of-order applied files. Never edit an applied migration: add a new one.
Back up the database and test restoration before deploying migrations. There is
no automatic down migration; if rollback is needed, stop writers and restore a
tested backup, or deploy a reviewed corrective migration. This does not migrate
any existing customer data.

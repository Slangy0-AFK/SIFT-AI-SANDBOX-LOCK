# Independent backend foundation

This is not yet a replacement for the existing application backend. It exposes
`GET /health` and initial registration, login, session lookup, logout, and
password recovery and email verification endpoints. Administrator operations,
entity access, licensing, and the application APIs are not implemented. The
frontend is not connected to these endpoints. Do not direct production traffic
to it.

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
causes clients behind it to share a limit. The frontend now submits registration and recovery requests to these
endpoints, handles email-verification and reset links, and restores sessions
from the HttpOnly cookie. These flows still require a configured SMTP provider
and end-to-end testing against the production frontend/API origins before
production use. Registration initiation, successful verification, login,
logout, and password reset, and failed login attempts generate audit records
without passwords or tokens.

Registration and password recovery require all of `SMTP_HOST`, `SMTP_PORT`,
`SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`. Missing configuration returns an
explicit 503; partial configuration prevents startup. SMTP connections require TLS, with
implicit TLS on port 465 and STARTTLS on other ports. Recovery tokens expire in
30 minutes, are stored as hashes, and can be used once; a successful reset
revokes existing sessions and other recovery tokens. The email link places its
token in the URL fragment so it is not sent in the initial HTTP request. The
frontend must read and clear that fragment before submitting the token. The SMTP
adapter has not been verified against a real provider.

Registration sends a one-time email verification link that expires after 24
hours; users cannot log in until they verify. A verification email can be
resent. Accounts created by earlier versions of this unfinished backend remain
unverified until they complete this flow. The frontend must handle the
`/verify-email` link fragment and submit it to the verification endpoint.

## Migrations and recovery

Migrations run in filename order, each in its own transaction. An advisory lock
serializes runners, and recorded checksums detect changed, missing, or
out-of-order applied files. Never edit an applied migration: add a new one.
Back up the database and test restoration before deploying migrations. There is
no automatic down migration; if rollback is needed, stop writers and restore a
tested backup, or deploy a reviewed corrective migration. This does not migrate
any existing customer data.

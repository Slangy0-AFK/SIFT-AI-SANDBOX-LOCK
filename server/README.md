# API service

The independent Node.js/Express API provides health, account/session, email verification/recovery, and QRNG endpoints. The React math interface does not use account routes, and paradox text is not sent to this service. PostgreSQL stores account records, audit events, and QRNG rate-limit counters.

## Local development

Use Node.js 22+ and PostgreSQL. From the repository root, configure the variables in `.env.example`, then:

```sh
npm ci --prefix server
npm run build --prefix server
npm run migrate --prefix server
npm start --prefix server
```

`DATABASE_URL`, `FRONTEND_ORIGIN`, and a `SESSION_SECRET` of at least 32 bytes are required. The QRNG is disabled without `ANU_QRNG_API_KEY`. Account email workflows require all five `SMTP_*` settings; missing SMTP configuration returns an explicit unavailable response.

## Tests

```sh
npm test --prefix server
npm run test:migrations --prefix server
npm run test:qrng:integration --prefix server
```

Migration tests require `TEST_DATABASE_URL` pointed at a disposable PostgreSQL database whose role can create and drop schemas. The live QRNG integration test contacts ANU only when `ANU_QRNG_API_KEY` is set; otherwise it is skipped. Unit tests use fake provider responses only to verify validation and failure handling.

## Operational notes

Migrations run in filename order, each in its own transaction. An advisory lock serializes runners, and recorded checksums detect changed or missing applied files. Never edit an applied migration; add a new one. Back up the database and test restoration before deploying migrations. There is no automatic down migration.

Authentication uses scrypt password hashes and random, server-revocable, 12-hour HttpOnly sessions. Production requires HTTPS. State-changing authentication requests enforce the configured Origin; logout also validates the CSRF token returned by login/session lookup. Login and registration have a database-backed IP limit. Correct client IP limiting behind a proxy depends on `TRUST_PROXY_HOPS` matching the controlled proxy chain.

The API health endpoint checks database connectivity, not live email or QRNG availability. Review [../SECURITY.md](../SECURITY.md) and [../DEPLOYMENT.md](../DEPLOYMENT.md) before exposing the service.

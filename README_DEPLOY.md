# SIFT AI deployment and testing

The frontend and API are deployed separately. The API currently supports
account authentication and health checks only; it is not yet a production
replacement for all application features. Do not route production traffic to
it as a complete service.

## Local API and database

1. Copy `.env.example` to `.env` and replace all placeholder values.
2. Start PostgreSQL: `docker compose up -d db`.
3. Build the API: `docker compose build api`.
4. Apply migrations:
   `docker compose run --rm --no-deps api node dist/database/migrate.js`.
5. Start the API: `docker compose up -d api`.
6. Confirm database connectivity at `http://localhost:3000/health`.
7. Start the frontend with `npm ci && npm run dev`.

Set `FRONTEND_ORIGIN` to the exact frontend origin. Set
`VITE_API_BASE_URL` to the API origin ending in `/api` when the API is not
available at the frontend's same-origin `/api` path. Use HTTPS for production.
Registration and password recovery require all SMTP settings in `.env`.

The Compose database uses a persistent volume. Back up PostgreSQL before
migrations and verify restoration from a backup before production use. See
[server/README.md](./server/README.md) for migration and recovery details.

## Frontend hosting

The static frontend can be built with `npm ci && npm run build` and published
to a static host. Configure `VITE_API_BASE_URL` as a build-time public URL; it
must not contain credentials or API keys. For cross-origin deployment, the API
must allow the exact frontend origin and use secure cookies over HTTPS.
Browsers that block third-party cookies may require a same-site reverse proxy.

## Production readiness

The independent API does not yet implement all application functions,
entities, integrations, or sandbox enforcement. There is no verified QRNG
source configured. The lock/challenge sequence must not be described as a
production security boundary until its server-side enforcement, actual
isolation mechanism, and entropy source are implemented and tested.

The repository's test commands are `npm run build`, `npm run lint`,
`npm run typecheck`, `npm --prefix server test`, and
`npm --prefix server run test:migrations` (the last requires a disposable
PostgreSQL database through `TEST_DATABASE_URL`).

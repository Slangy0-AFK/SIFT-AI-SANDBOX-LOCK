# Deployment and operations

## Local Compose deployment

Requirements: Docker Engine and the Docker Compose plugin.

1. Create a private environment file:

   ```sh
   cp .env.example .env
   ```

2. Replace the session placeholder with a cryptographically random secret of at least 32 bytes. Set the database password and connection URL consistently. Do not commit `.env`.
3. Start the database and build the services:

   ```sh
   docker compose up -d db
   docker compose build api web
   docker compose run --rm --no-deps api node dist/database/migrate.js
   docker compose up -d api web
   ```

4. Check `http://localhost:8080/health` and open `http://localhost:8080`.

The supplied web port is bound to loopback for local access. The Compose configuration is not a public production deployment.

## Environment and secret configuration

See `.env.example` for the variable names. Important settings include:

- `DATABASE_URL` and `SESSION_SECRET` for the API.
- `NODE_ENV=development` for the supplied local HTTP Compose setup; set `NODE_ENV=production` with an HTTPS `FRONTEND_ORIGIN` for production.
- No provider key is required for the LfD QRNG endpoint; external connectivity is tested when a sample is requested.
- `FRONTEND_ORIGIN` for the exact trusted browser origin.
- `TRUST_PROXY_HOPS` for the deployment's controlled reverse proxy topology.
- Email provider settings for account verification and recovery workflows.

Keep all secrets on the server side and rotate them through the hosting platform's secret manager. Never expose them through frontend build-time variables.

## Production checklist

- Build and scan immutable container images; pin reviewed image digests.
- Configure an HTTPS-only public edge with appropriate HSTS, request limits, and restricted origin policy.
- Keep the API and PostgreSQL on private networks; expose only the edge.
- Configure the exact public frontend origin and proxy hop count.
- Set `NODE_ENV=production`; the API rejects a non-HTTPS frontend origin in production.
- Verify an actual LfD provider request in the deployment environment and monitor for upstream availability failures.
- Configure email delivery if account endpoints are exposed.
- Run all migrations against a backed-up production database during a reviewed maintenance procedure.
- Verify health checks, alerts, structured logs, and incident response without logging credentials or user content.
- Exercise restore procedures before production and periodically thereafter.
- Run frontend/server dependency audits and review vulnerability reports.
- Perform deployment-specific security review and load/rate-limit tests.

## Health and database recovery

`GET /health` checks API/database availability. Configure external monitoring to alert on failed checks and QRNG unavailability, without treating provider unavailability as a reason to synthesize entropy.

Back up PostgreSQL using an encrypted destination and restricted credentials. Example operator commands (replace the container and destination with environment-specific values):

```sh
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > siftai.dump
pg_restore --clean --if-exists --no-owner --dbname="$RESTORE_DATABASE_URL" siftai.dump
```

Protect and encrypt backup files, set retention, and validate restores in an isolated database. The repository does not configure a backup schedule or recovery-point objective.

## Release status

No public deployment is performed by this repository. See [PRODUCTION_READINESS_REPORT.md](./PRODUCTION_READINESS_REPORT.md) for unverified external dependencies and blockers.

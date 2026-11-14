# Sift Math and Entropy

A standalone web application for exact number-base conversion, user-led exploration of mathematical claims, and access to a documented quantum random-number provider.

## Features

- Exact conversions among bases 2, 10, 12, and 60, including arbitrary-precision integers and rational values.
- Inspectable conversion steps, round-trip verification, and repeating-fraction notation.
- A private Paradox Lab: the user's original wording, clarifications, assumptions, and interpretations remain in browser memory. Users can test exact numeric relationships without treating results as theological conclusions.
- A server-side QRNG integration with the Laboratory for Digitalisation (LfD), including provenance validation, a live connectivity probe, and no pseudorandom fallback.
- A Security Sandbox that previews input as inert text only, plus live API/provider status and links to repository test records.
- A separate Express/PostgreSQL API for account and verification workflows. The current math interface does not require or use those account workflows.

## Run locally

The math converter can run without the API:

```sh
npm ci
npm run dev
```

For the API, QRNG, and complete containerized stack:

1. Copy `.env.example` to `.env` and set a unique `SESSION_SECRET`. Set the database password and connection URL consistently. Keep `.env` private.
2. Follow [DEPLOYMENT.md](./DEPLOYMENT.md) to start PostgreSQL, apply migrations, and launch the services.
3. Open `http://localhost:8080`. The LfD endpoint is configured by default; live connectivity is verified when you request entropy.

## Verify

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm audit --audit-level=high

npm --prefix server ci
npm --prefix server test
npm --prefix server run test:migrations
npm --prefix server audit --audit-level=high
```

The migration test requires a disposable PostgreSQL database through `TEST_DATABASE_URL`. The live QRNG integration test makes a small request to LfD and requires network access. Set `RUN_LFD_QRNG_INTEGRATION=1` to enable it:

```sh
RUN_LFD_QRNG_INTEGRATION=1 npm --prefix server run test:qrng:integration
```

See [TEST_REPORT.md](./TEST_REPORT.md) for what has and has not been verified.

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — application boundaries and data flow
- [MATHEMATICAL_ENGINE.md](./MATHEMATICAL_ENGINE.md) — exact arithmetic and conversion behavior
- [BASE_REPRESENTATION.md](./BASE_REPRESENTATION.md) — digit alphabets and syntax
- [PARADOX_LAB.md](./PARADOX_LAB.md) — user-led workflow and mathematical boundaries
- [QRNG_INTEGRATION.md](./QRNG_INTEGRATION.md) — provider protocol, provenance, and limitations
- [SECURITY.md](./SECURITY.md) — security controls and remaining risks
- [DEPLOYMENT.md](./DEPLOYMENT.md) — local/container deployment and operations
- [PRODUCTION_READINESS_REPORT.md](./PRODUCTION_READINESS_REPORT.md) — release blockers and status
- [TEST_REPORT.md](./TEST_REPORT.md) — automated checks and unverified integrations

This repository is not declared production-ready. Deployment-specific security configuration and live-environment verification are required before release.

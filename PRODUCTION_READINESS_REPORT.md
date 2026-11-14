# Production readiness report

**Status: Not production-ready.** This report describes repository implementation and verification only. No public deployment or production service has been configured or verified.

## Implemented

- Independent React/Vite web client and Express API, with Docker Compose and Nginx configuration.
- Exact arbitrary-precision rational conversion among bases 2, 10, 12, and 60, with documented alphabets, repeating expansions, validation, and round-trip checking.
- User-controlled paradox text entry and local exploration. Original wording is preserved and not sent to a remote interpreter.
- Server-side LfD QRNG adapter with HTTPS transport, response validation, provenance fields, timeouts, rate limiting, and fail-closed behavior.
- Focused math and QRNG unit tests, API/database migration tests, and CI configuration.

## Removed legacy platform integration

The former hosted-platform SDK, imports, authentication/database bindings, functions, generated client, configuration, and deployment assumptions were removed from the application. The standalone PostgreSQL-backed API is independent. A hidden-file-inclusive working-tree scan found no remaining integration references in source, configuration, or documentation; historical Git objects are not part of the runtime source tree.

## External services and configuration required

- LfD QRNG service availability in the target deployment (no provider key is required).
- PostgreSQL instance, secure credentials, migration execution, monitoring, backups, and tested restoration.
- HTTPS termination and a controlled reverse proxy with an explicitly configured trust-hop count.
- Email delivery credentials if the retained account verification workflows will be enabled.
- Production session secrets, exact allowed origin, container/image registry, and monitoring/alerting configuration.

## Verification summary

- Frontend tests: **15 passed** (11 math/entropy tests and 4 UI interaction tests); typecheck, lint, production build, and dependency audit (**0 vulnerabilities**) passed.
- API tests: **9 passed**; PostgreSQL migration/session integration tests: **2 passed**; API dependency audit: **0 vulnerabilities**.
- Containerized web/API/database build and smoke test passed; all 6 migrations applied, health endpoint responded, and a live LfD response passed validation with provenance.
- Live LfD QRNG provider connectivity: **verified** with a 32-bit HTTPS request using `RUN_LFD_QRNG_INTEGRATION=1`. Repeat this check from the production deployment environment.
- Production deployment, TLS, backups/restore, monitoring, and external security testing: **not performed**.

See [TEST_REPORT.md](./TEST_REPORT.md) for command-level results.

## Unresolved security issues and release blockers

- A production-environment provider request is still required before describing QRNG as operational in that deployment.
- The QRNG endpoint is rate-limited by client IP but does not require authenticated users; public access needs a deployment-specific abuse-control decision.
- Proxy trust, TLS, secrets, email delivery, database restrictions, backups, and monitoring must be configured and tested in the deployment environment.
- The application has not undergone external security testing or a production recovery exercise.
- Passing local tests cannot establish the authenticity or quality of provider entropy; LfD does not document a signed per-sample attestation.

Do not claim production readiness or expose the service publicly until each blocker is reviewed and verified.

# Test report

This file reflects checks run against the current worktree. A skipped live integration test is not a successful connectivity test.

## Local checks

| Check | Command | Result |
|---|---|---|
| Math and entropy tests | `npm test` | Passed: 11 tests |
| React UI interaction tests | Included in `npm test` | Passed: 4 tests |
| TypeScript check | `npm run typecheck` | Passed |
| Lint | `npm run lint` | Passed |
| Frontend production build | `npm run build` | Passed |
| Frontend dependency audit | `npm audit --audit-level=high` | Passed: 0 vulnerabilities |
| API unit tests and build | `npm --prefix server test` | Passed: 9 tests; TypeScript build succeeded |
| PostgreSQL migration/session tests | `npm --prefix server run test:migrations` | Passed: 2 tests against disposable PostgreSQL |
| API dependency audit | `npm --prefix server audit --audit-level=high` | Passed: 0 vulnerabilities |
| Container build and integration test | Docker Compose local stack | Passed: web/API health, all 6 migrations, live LfD sample, and provenance |

## External integration

| Check | Requirement | Result |
|---|---|---|
| LfD QRNG connectivity | `RUN_LFD_QRNG_INTEGRATION=1 npm --prefix server run test:qrng:integration` | Passed: live 32-bit HTTPS request and response validation |
| Production deployment | Configured host, TLS, secrets, database, and monitoring | Not performed |
| Backup recovery | Encrypted backup and isolated restore test | Not performed |

## Coverage intent

The automated math suite addresses conversions among every supported base, round trips, large integers, fractions and repeating expansions, negative values, zero, and invalid digits. QRNG unit tests address valid and malformed provider results, error/timeout paths, provenance, and no-fallback behavior. API tests cover route validation and access controls available in this implementation.

The tests do not establish quantum origin, production availability, complete security, or correctness of untested deployment infrastructure.

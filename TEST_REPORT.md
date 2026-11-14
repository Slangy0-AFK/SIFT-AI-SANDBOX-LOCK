# Test report

This file distinguishes current-worktree checks from deployment checks. A skipped live integration test is not a successful connectivity test.

## Local checks

| Check | Command | Result |
|---|---|---|
| Math and entropy tests | `npm test` | Passed: 12 tests |
| React UI interaction tests | Included in `npm test` | Passed: 8 tests |
| TypeScript check | `npm run typecheck` | Passed |
| Lint | `npm run lint` | Passed |
| Frontend production build | `npm run build` | Passed |
| API unit tests and build | `npm --prefix server test` | Passed: 11 tests; TypeScript build succeeded |
| Frontend dependency audit | `npm audit --audit-level=high` | Previously passed: 0 vulnerabilities; dependency manifests unchanged |
| API dependency audit | `npm --prefix server audit --audit-level=high` | Previously passed: 0 vulnerabilities; dependency manifests unchanged |
| PostgreSQL migration/session tests | `npm --prefix server run test:migrations` | Passed in prior validation: 2 tests against disposable PostgreSQL; not rerun for this follow-up |
| Container build and integration test | Docker Compose local stack | Passed in prior validation; not rerun for this follow-up because local Compose environment variables are not configured |

## External integration

| Check | Requirement | Result |
|---|---|---|
| LfD QRNG connectivity | `RUN_LFD_QRNG_INTEGRATION=1 npm --prefix server run test:qrng:integration` | Passed in this follow-up: live 32-bit HTTPS request and response validation |
| Production deployment | Configured host, TLS, secrets, database, and monitoring | Not performed |
| Backup recovery | Encrypted backup and isolated restore test | Not performed |

## Coverage intent

The math suite addresses conversions among every supported base, round trips, large integers, fractions and repeating expansions, negative values, zero, invalid digits, and exact rational comparisons. UI tests cover paradox-wording preservation across section navigation, user-entered hypotheses, QRNG sample handoff, invalid provenance rejection, inert sandbox rendering, and the live QRNG probe. QRNG API tests cover bounded transient retries, rate limits, timeouts, malformed provider results, provenance, and no-fallback behavior.

The tests do not establish quantum origin, production availability, complete security, or correctness of untested deployment infrastructure.

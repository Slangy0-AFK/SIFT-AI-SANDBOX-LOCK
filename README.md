# SIFT AI

SIFT AI is a React/Vite application with an independently deployable Node.js
and PostgreSQL backend. The backend currently provides health checks and
account registration, email verification, login, session restoration, logout,
and password recovery.

## Development

Requirements: Node.js 22+ and PostgreSQL 16+.

1. Install frontend dependencies with `npm ci`.
2. Copy `.env.example` to `.env` and replace every placeholder.
3. Start PostgreSQL with `docker compose up -d db`.
4. Build the API with `docker compose build api`, then apply migrations with
   `docker compose run --rm --no-deps api node dist/database/migrate.js`.
5. Start the API with `docker compose up -d api`.
6. Start the frontend with `npm run dev`.

The development frontend uses `http://localhost:3000/api` by default. To use
another API origin, set `VITE_API_BASE_URL` to the API URL ending in `/api`.
Set `FRONTEND_ORIGIN` to the exact browser origin. SMTP settings are required
for email verification and password recovery; without them these operations
return an explicit configuration error.

See [README_DEPLOY.md](./README_DEPLOY.md) for deployment steps and
[server/README.md](./server/README.md) for backend configuration and database
operations.

## Migration status

The independent backend is a work in progress, not a production replacement
for every application feature. Many existing screens and integrations still
depend on services that have not yet been migrated. Do not direct production
traffic to this backend as a complete application until the function/entity
inventory, authorization checks, integration adapters, isolation controls,
and required test coverage are complete.

No customer data is represented as migrated. Import only an authorized data
export after a reviewed migration utility and rollback procedure are available.

## Behaviour and simulation reporting

These rules apply to every screen, export, log line and email in this repo.
`npm run check:labels` scans the source and docs and fails the build if a win
label, per-behaviour win total, "x of y" block total, or false-positive claim
returns.

- Results are transcripts, not verdicts. Every turn is stored verbatim: what
  was sent, what came back, the behaviour it targeted, whether it was a safe
  twin, and whether written authorisation was present.
- No code declares a win. A person reads each reply and records objected,
  accepted or unclear, quoting the words the judgment rests on. The server
  refuses a judgment whose quote does not appear in the reply, and refuses one
  with no quote at all.
- No result is shown until every turn in the run has been reviewed.
- Each run draws a fresh seed, behaviour order, and payload. At least two
  payloads per behaviour are never sent, and the payload bank lives on the
  server only.
- Report the gate as a rule, never as a measured model result. Format
  compliance is not a pass on reasoning.
- Never disclose internal functions, programs, or the pattern library; never
  store customer personal data; and sign replies "SIFT AI team" only.

The behaviour test page is `src/pages/BehaviourTest.jsx` at
`/behaviour-test`. Its scenario engine and transcript persistence have not yet
been ported to the independent backend.
# Architecture

## Components

- **Web client:** React and Vite serve a static single-page application. The exact mathematics and paradox workspace run in the browser. The paradox text is not persisted or sent to the API.
- **Math engine:** a dependency-free JavaScript module based on `BigInt` rational arithmetic. It parses, converts, formats, and round-trip verifies values locally.
- **API:** a Node.js/Express service under `server/`. Account and verification routes use PostgreSQL. The current math interface does not use account routes.
- **QRNG adapter:** the API calls the Laboratory for Digitalisation (LfD) QRNG service over HTTPS. LfD documents that its service is backed by an ID Quantique QRNG PCIe. The adapter validates provider responses and returns provenance alongside entropy.
- **Database:** PostgreSQL stores account/session-related records, audit events, and QRNG rate-limit counters. Math conversions and paradox entries are not stored.
- **Web edge:** Nginx serves the compiled client and proxies `/api/` requests to the API service. Docker Compose provides a local deployment topology.

## Data flow

1. Math input and paradox text remain in browser memory and are processed locally.
2. A QRNG request sends only the selected bit count to `POST /api/qrng`. Nginx forwards it to Express.
3. Express validates the request, checks the per-client rate limit, and calls LfD over TLS using the documented `length` and `format=HEX` query parameters.
4. The response is validated before the API returns the bits and source metadata. Provider errors fail closed; no local entropy fallback exists.
5. Account endpoints use the API's configured PostgreSQL database independently of the math interface.

## Trust boundaries

- The browser is not given database credentials; the LfD provider requires no API key for the documented endpoint.
- Provider response data is treated as untrusted until type, size, and range checks pass.
- The QRNG API applies a small request body limit, strict request validation, an origin policy, timeouts, and a database-backed rate limit.
- The proxy trust setting must match the actual deployment topology. Incorrect forwarded-header trust can undermine IP-based rate limiting.
- No user-supplied code, model prompt, or arbitrary tool execution is implemented.

## Deployment shape

The supplied Compose configuration is intended for local validation and a private, controlled host. Its web port binds to loopback. A production deployment still needs managed TLS termination, appropriately scoped secrets, controlled proxy configuration, database backup/recovery operations, and verification in its real environment.

# Security

## Implemented controls

- The browser receives no database credentials or QRNG provider key.
- The paradox workspace preserves the exact user text locally. It is not submitted to an AI service, interpreted as fact, or stored remotely.
- Mathematical input is processed locally with strict syntax checks and an input-size limit; arbitrary code execution is not provided.
- QRNG requests are schema-validated, bounded, origin-checked, rate-limited in PostgreSQL, and subject to an upstream timeout.
- The QRNG adapter validates provider response structure and byte values and never falls back to pseudorandom output.
- Application logs avoid request bodies, entropy samples, and credentials.
- Nginx supplies response security headers and a content security policy for the static web client.
- The API's existing account/session workflows use server-side configuration and PostgreSQL. Review their production settings separately before enabling those workflows.

## Deployment requirements

- Terminate HTTPS at a controlled production edge and forward traffic only to private application services.
- Set unique session and CSRF secrets through a secret manager; do not reuse development values.
- Set `TRUST_PROXY_HOPS` only to the exact number of controlled proxy hops. Do not trust client-supplied forwarding headers.
- Restrict database network access and credentials; configure encrypted backups and test recovery.
- Configure and verify account email delivery before exposing account/verification routes.
- Keep dependencies, Node.js, PostgreSQL, and container images patched; pin image digests for a release.
- Apply restrictive network, resource, and process permissions in the hosting platform.

## Remaining risks and non-goals

- No live production deployment, external penetration test, or backup restore has been completed. LfD connectivity passed in this development environment but has not been verified from a production deployment.
- The QRNG route is not tied to an authenticated user account. Its PostgreSQL-backed per-client rate limit is an abuse control, not authorization. Public deployment requires a reviewed ingress/rate-limit policy.
- Correct IP-based limits depend on exact proxy configuration.
- The app does not claim that its basic statistical checks prove entropy quality or quantum origin.
- No user code execution or prompt/tool execution exists; therefore, no sandbox is implemented for those absent features.
- A prompt-injection detector is not used as a security boundary.

Report vulnerabilities through the repository's private security reporting process. Do not include credentials, user paradox text, or entropy payloads in reports.

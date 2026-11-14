# QRNG integration

## Provider and source

The replaceable server-side adapter uses the Laboratory for Digitalisation (LfD) QRNG service:

- Provider documentation: <https://lfdr.de/QRNG/>
- API endpoint: `https://lfdr.de/qrng_api/qrng`
- Transport: HTTPS
- Authentication: no API key is required by the documented endpoint
- Documented hardware source: an ID Quantique QRNG PCIe, accessed through the Quantis PCI driver

The endpoint is configurable only in server code; no provider secret is needed or exposed to the browser.

## Request and validation

The client selects a byte-aligned count of random bits. The API converts this to the requested byte count and sends `GET /qrng?length=<bytes>&format=HEX` over HTTPS. The API enforces the supported size, request schema, request-body limit, origin policy, timeout, and per-client rate limit before querying LfD.

The adapter caps provider JSON responses at 16 KiB, then validates the `qrn` field, exact hexadecimal length, and declared byte count. Provider errors, timeouts, malformed responses, and rate limits fail closed; there is no pseudorandom fallback.

Valid bits are returned with the source name, endpoint, server retrieval timestamp, server-generated request ID, and provider request ID when the provider supplies one. No entropy sample is written to application logs. Since the documented LfD endpoint does not require credentials, there is no API key to configure.

## Availability and verification

The status endpoint indicates that the LfD endpoint is configured; it does not claim that the external service is currently reachable. A real request checks upstream connectivity and reports failure explicitly.

Run the opt-in live connectivity test with network access:

```sh
RUN_LFD_QRNG_INTEGRATION=1 npm --prefix server run test:qrng:integration
```

By default, the network test is skipped so ordinary unit tests and CI do not depend on external provider availability. Unit tests use controlled responses only to verify validation and failure behavior; they are not evidence of live connectivity.

## Statistical health checks

The client offers monobit-frequency and runs diagnostics as basic screening for the returned bitstream when the sample is large enough. These checks are not a certification of randomness, do not establish a quantum origin, and cannot verify provider operation or provenance. Use independently reviewed statistical test suites for any assurance beyond basic screening. Statistical-test background: [NIST SP 800-22 Rev. 1a](https://csrc.nist.gov/pubs/sp/800/22/r1/upd1/final).

## Known limitations

HTTPS protects the request in transit, but the provider does not document a cryptographic signature or attestation for each sample. Provenance metadata is an application record, not provider-signed proof. Provider uptime and hardware operations are outside this repository's control. Statistical tests alone cannot establish that a source is genuinely quantum.

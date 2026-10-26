# SIFT AI - Compliance Notes

**Status:** planning record for team discussion. Not built, not implemented, not
published. This note is a document only - it changes no app code, page, route, price,
domain or payment setting.

**Last recorded:** 2026-10-26

---

## Decision (recorded 2026-10-26) - Data retention: keep only what compliance requires

- Keep **ONLY what is needed for compliance, nothing else.**
- **No personal data** is kept for the hardening tool, or for SIFT AI generally.
- Business records are kept **only where compliance requires them**, and are
  **purpose-limited, then deleted**:
  - payment / tax transaction records (held via Stripe / accounting)
  - support tickets
  - anonymized security / incident logs
- **No indefinite personal data storage.**

**Status:** recorded as a planned policy item / for team discussion. Nothing was
implemented by this record.

---

## Related planned feature - prompt-injection hardening tool

Recorded in full in `APP_PLAN.md`. The same no-personal-data rule carries into it:

- Included in the **Device Check $49** one-time package - no new price.
- Its own dedicated **Hardening** page when built.
- Lets a customer harden **their own AI / model**.
- Defensive prompt-injection testing derived from private library approaches.
- **Report-only:** no raw attack library given to customers, no actual vulnerability
  disclosure to third parties.
- **Authorized testing of their own model only.**
- **No personal data retention:** Muse / SIFT AI never keeps any personal data of
  customers; test inputs and results are not stored as personal data; audit logs are
  anonymized with no personal identifiers.

---

## Explicitly out of scope for this record

- No new page, no new route, no code change.
- No pricing change (Free / Pro $7 / Device Check $49 one-time; $99 stays removed).
- No domain or DNS change.
- No bank account or Stripe payout detail changes.
- Not published.
- No purchase or live checkout run.
# SIFT AI - App Plan & Feature List

**Status:** planning record for team discussion. Nothing described here is built or
published. This note is a document only - it adds no page, no route and no code.

**Last recorded:** 2026-10-26

---

## Pricing snapshot (unchanged by these decisions, recorded for reference)

- Free
- Pro - $7
- Device Check - $49 one-time
- The earlier $99 tier remains removed.

The decisions below change **no price**. The planned hardening tool is included in the
existing Device Check package; it is not a new tier, not a new price and not a paid add-on.

---

## Decision 1 (recorded 2026-10-26) - NEW FEATURE, planned, not built: prompt-injection hardening tool

- **Package:** included in the **Device Check $49 one-time** package. No new price.
- **Surface when built:** its own dedicated **Hardening page**. (No such page or route
  exists today. This record does not add one.)
- **Who it serves:** it lets a customer harden **their own AI / model**.
- **Method:** defensive prompt-injection testing, derived from private library
  approaches.
- **Output:** **report-only.** No raw attack library is given to customers, and there is
  **no actual vulnerability disclosure to third parties**.
- **Scope limit:** **authorized testing of their own model only.**
- **Data:** **no personal data retention.** Muse / SIFT AI never keeps any personal data
  of customers. Test inputs and results are **not stored as personal data**. Audit logs
  are anonymized, with **no personal identifiers**.

**Status:** planned / for team discussion. **Not built. Not published.**

---

## Decision 2 (recorded 2026-10-26) - data retention

Recorded in full in `COMPLIANCE_NOTES.md`, and summarised here for the feature list:

- Keep **only what is needed for compliance, nothing else.**
- **No personal data** kept for the hardening tool, or for SIFT AI generally.
- Business records kept **only where compliance requires them** - payment/tax
  transaction records (via Stripe / accounting), support tickets, anonymized
  security/incident logs - **purpose-limited, then deleted.**
- **No indefinite personal data storage.**

---

## Out of scope for this record

This record intentionally changes nothing. No page, no route, no code, no pricing
(Free / Pro $7 / Device Check $49; $99 stays removed), no domain or DNS, no bank account
or Stripe payout details, no publishing, and no purchase or live checkout.
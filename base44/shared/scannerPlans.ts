// Server-owned price catalog for the scanner tiers.
// The buyer only ever sends a tier id; prices and modes are resolved here,
// and the webhook checks the amount Stripe charged against these values.
export const SCANNER_TIERS = {
  pro: {
    id: 'pro',
    name: 'Pro',
    label: 'SiftAI Pro (monthly)',
    mode: 'subscription',
    interval: 'month',
    amount: 700,
    currency: 'usd'
  },
  device_check: {
    id: 'device_check',
    name: 'Device Check',
    label: 'SiftAI Device Check',
    mode: 'payment',
    interval: null,
    amount: 4900,
    currency: 'usd'
  },
  // Not sold any more: everything it included is now in Device Check at $49.
  // It stays in this catalog because a $99 payment made before the change must
  // still be confirmable by the webhook, and the amount below is the historical
  // one. 'purchasable: false' is what stops any new checkout for it.
  full_audit: {
    id: 'full_audit',
    name: 'Full Device Audit (formerly $99, now included in Device Check)',
    label: 'SiftAI Full Device Audit',
    mode: 'payment',
    interval: null,
    amount: 9900,
    currency: 'usd',
    purchasable: false
  }
};

export function getTier(tierId) {
  if (!tierId || typeof tierId !== 'string') return null;
  return SCANNER_TIERS[tierId] || null;
}
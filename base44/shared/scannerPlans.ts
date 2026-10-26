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
  full_audit: {
    id: 'full_audit',
    name: 'Full Device Audit',
    label: 'SiftAI Full Device Audit',
    mode: 'payment',
    interval: null,
    amount: 9900,
    currency: 'usd'
  }
};

export function getTier(tierId) {
  if (!tierId || typeof tierId !== 'string') return null;
  return SCANNER_TIERS[tierId] || null;
}
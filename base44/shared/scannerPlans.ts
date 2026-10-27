// Server-owned price catalog for the scanner tiers.
// The buyer only ever sends a tier id; prices and modes are resolved here,
// and the webhook checks the amount Stripe charged against these values.

// Pro is sold a month at a time, or as a year paid upfront at the SIFT AI team's
// own yearly discount. The yearly price is worked out from the monthly one, so
// the two can never drift apart.
export const PRO_YEARLY_MONTHS = 12;
// Two months free on a year: the yearly offer the app already advertises, and the
// figure the team can change in the admin pricing form.
export const DEFAULT_ANNUAL_DISCOUNT_PERCENT = 16.67;
// A discount this deep would stop the year being a real price at all.
export const MAX_ANNUAL_DISCOUNT_PERCENT = 90;

export const SCANNER_TIERS = {
  // The harness and its killswitch, sold a month at a time.
  pro: {
    id: 'pro',
    name: 'Harness',
    label: 'SIFT AI Harness (monthly)',
    mode: 'subscription',
    interval: 'month',
    amount: 700,
    currency: 'usd'
  },
  // The same Pro access, bought as a year paid upfront. The amount is not fixed
  // here: it is worked out at checkout from the team's yearly discount, and the
  // amount actually charged is stored on the purchase, which is what the webhook
  // checks. Nothing unlocks until Stripe confirms that exact amount.
  pro_annual: {
    id: 'pro_annual',
    name: 'Harness (1 year)',
    label: 'SIFT AI Harness (1 year, paid upfront)',
    mode: 'payment',
    interval: null,
    months: PRO_YEARLY_MONTHS,
    currency: 'usd',
    annual: true
  },
  // The whole package, sold a year at a time as a subscription: one hundred dollars
  // for the year, renewed yearly until it is cancelled. The id stays 'device_check'
  // because existing purchases, licenses and receipts are filed under it; only what
  // it is called, what it costs and how it is billed have changed.
  device_check: {
    id: 'device_check',
    name: 'Whole package',
    label: 'SIFT AI Whole Package (1 year)',
    mode: 'subscription',
    interval: 'year',
    amount: 10000,
    currency: 'usd'
  },
  // Not sold any more: everything it included is now in the whole package.
  // It stays in this catalog because a $99 payment made before the change must
  // still be confirmable by the webhook, and the amount below is the historical
  // one. 'purchasable: false' is what stops any new checkout for it.
  full_audit: {
    id: 'full_audit',
    name: 'Full Agent Audit (formerly $99, now included in Agent Check)',
    label: 'SIFT AI Full Agent Audit',
    mode: 'payment',
    interval: null,
    amount: 9900,
    currency: 'usd',
    purchasable: false
  }
};

// What a month of Pro costs, taken from the catalog above so there is one figure.
export const PRO_MONTHLY_CENTS = SCANNER_TIERS.pro.amount;

// The yearly price: twelve monthly payments less the team's discount, in cents.
export function annualPriceCents(discountPercent) {
  const asked = Number(discountPercent);
  const discount = Math.min(
    Math.max(Number.isFinite(asked) ? asked : DEFAULT_ANNUAL_DISCOUNT_PERCENT, 0),
    MAX_ANNUAL_DISCOUNT_PERCENT
  );
  return Math.round((PRO_MONTHLY_CENTS * PRO_YEARLY_MONTHS * (100 - discount)) / 100);
}

export function getTier(tierId) {
  if (!tierId || typeof tierId !== 'string') return null;
  return SCANNER_TIERS[tierId] || null;
}
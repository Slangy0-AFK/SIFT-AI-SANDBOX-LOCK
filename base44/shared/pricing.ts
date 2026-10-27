// Pro's two ways to pay, resolved in one place.
//
// The monthly figure comes from the server catalog. The yearly figure is the
// same twelve months less the discount the SIFT AI team sets, so the page that
// shows a price and the checkout that charges it are reading the same number.
// Nothing here is ever taken from a browser.

import {
  annualPriceCents,
  DEFAULT_ANNUAL_DISCOUNT_PERCENT,
  MAX_ANNUAL_DISCOUNT_PERCENT,
  PRO_MONTHLY_CENTS,
  PRO_YEARLY_MONTHS
} from './scannerPlans.ts';

const rows = (page: any) => (Array.isArray(page) ? page : page?.items || []);

function clampDiscount(value: any) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_ANNUAL_DISCOUNT_PERCENT;
  return Math.min(Math.max(number, 0), MAX_ANNUAL_DISCOUNT_PERCENT);
}

// The settings row the team edits from the admin console. A row that has never
// been written, or a blank field, falls back to the yearly discount the app
// already advertises rather than to a number invented here.
export async function readProPricing(base44: any) {
  const row = rows(await base44.asServiceRole.entities.KitSettings.list('-created_date', 1))[0] || null;
  const stored =
    row && row.annual_discount_percent !== undefined && row.annual_discount_percent !== null
      ? row.annual_discount_percent
      : DEFAULT_ANNUAL_DISCOUNT_PERCENT;
  const discount = clampDiscount(stored);

  return {
    currency: 'usd',
    monthly_cents: PRO_MONTHLY_CENTS,
    yearly_cents: annualPriceCents(discount),
    yearly_months: PRO_YEARLY_MONTHS,
    yearly_discount_percent: discount
  };
}
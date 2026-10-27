export const SCANNER_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    blurb: 'The everyday checks, at no cost.',
    features: ["SIFT AI's own rogue-AI checklist", 'AlienVault OTX reputation checks', 'Your own scan history', 'My devices', 'Allowlist & blocklist'],
    cta: 'Start free'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$7',
    cadence: 'per month',
    blurb: 'For keeping an eye on your own devices over time.',
    features: ['Reusable scan profiles', 'PDF reports', 'Priority support'],
    cta: 'Get Pro',
    highlight: true
  },
  {
    id: 'device_check',
    name: 'Device Check',
    price: '$49',
    cadence: 'one time',
    blurb: 'A careful look at one item or the whole device, written up.',
    features: [
      'A flagged item, or the whole device',
      'The app list and where the device connects',
      'Every flagged item, with the evidence',
      'A full written report and fix plan'
    ],
    cta: 'Book a Device Check'
  }
];

export const PAID_TIER_IDS = ['pro', 'device_check'];

// Pro, bought as a year paid upfront. The price is worked out on the server from
// the discount the SIFT AI team set, so it is fetched with the plans and never
// written here: the card shows the figure the checkout will charge.
const proPlan = SCANNER_PLANS.find((plan) => plan.id === 'pro');

export const PRO_YEARLY = {
  id: 'pro_annual',
  name: 'Pro (1 year)',
  price: '',
  cadence: 'per year, paid upfront',
  blurb: 'The same Pro, paid for in one go at the yearly discount.',
  features: [...(proPlan?.features || []), 'A full year in one payment, nothing to renew'],
  cta: 'Get 1 year'
};

// The $99 Full Device Audit is retired as a buyable tier: everything it included
// is now in Device Check at $49. This entry exists only so a purchase or receipt
// from before the change still resolves to a name, and it is never offered as a
// plan — the plans list above is what the pages render.
export const FORMER_PLANS = {
  full_audit: {
    id: 'full_audit',
    name: 'Full Device Audit (formerly $99, now included in Device Check)',
    price: '$99',
    cadence: 'formerly one time',
    blurb: 'Retired as a buyable tier. Everything it included is in Device Check at $49.',
    features: []
  }
};

export function planById(tierId) {
  return (
    SCANNER_PLANS.find((plan) => plan.id === tierId) ||
    (tierId === PRO_YEARLY.id ? PRO_YEARLY : null) ||
    FORMER_PLANS[tierId] ||
    null
  );
}

export const NEXT_STEPS = {
  pro: 'Pro is active on your account. Reusable scan profiles, PDF reports and priority support are unlocked. It renews monthly, and you can cancel any time.',
  pro_annual:
    'Your year of Pro is active on your account, and your license key is issued to it. It runs for the twelve months you paid for, and there is nothing to renew or cancel.',
  device_check:
    'Your Device Check is booked. Next: open the device scanner and submit the flagged item or the whole device — the app list, where it connects, anything else you know. You get a verdict, the evidence behind it, and a full written fix plan.',
  // Kept so a purchase made before the change still shows sensible guidance.
  full_audit:
    'Your Full Device Audit is handled as a Device Check: everything it included is in that plan. Next: open the device scanner and submit the device.'
};

export const HONEST_NOTE =
  'No guaranteed detection and no guaranteed results. A scan is a check, not a certificate, and these plans are not a promise about anything on your device.';
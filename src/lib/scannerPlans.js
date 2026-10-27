export const SCANNER_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    blurb: 'The phone scan and the look-up, at no cost.',
    features: [
      'Phone scan: a link, a domain, a file hash or a message',
      'Look up any indicator, with the evidence behind the answer',
      'Your own check history, kept on your account',
      'Support tickets to the SIFT AI team'
    ],
    cta: 'Start free'
  },
  {
    id: 'pro',
    name: 'Harness',
    price: '$7',
    cadence: 'per month',
    blurb: 'The harness and its killswitch, in your own code.',
    features: [
      'sift-guard.js and sift_guard.py, the same five gates',
      'The killswitch, read before any code runs',
      'Every decision logged, chained to the entry before it',
      'A license key bound to one model',
      'Reusable scan profiles, re-checks and PDF reports'
    ],
    cta: 'Get the harness',
    highlight: true
  },
  {
    id: 'device_check',
    name: 'Whole package',
    price: '$100',
    cadence: 'per year',
    blurb: 'Everything the app makes, renewed yearly.',
    features: [
      'The harness and killswitch, JavaScript and Python',
      'The phone scan and every look-up, on your account',
      'The eval puzzle bundle, run against any model',
      'A careful written look at one agent, with a fix plan',
      'Your license key, bound to one model'
    ],
    cta: 'Get the whole package'
  }
];

export const PAID_TIER_IDS = ['pro', 'device_check'];

// Pro, bought as a year paid upfront. The price is worked out on the server from
// the discount the SIFT AI team set, so it is fetched with the plans and never
// written here: the card shows the figure the checkout will charge.
const proPlan = SCANNER_PLANS.find((plan) => plan.id === 'pro');

export const PRO_YEARLY = {
  id: 'pro_annual',
  name: 'Harness (1 year)',
  price: '',
  cadence: 'per year, paid upfront',
  blurb: 'The same harness, paid for in one go at the yearly discount.',
  features: [...(proPlan?.features || []), 'A full year in one payment, nothing to renew'],
  cta: 'Get 1 year'
};

// The $99 Full Audit is retired as a buyable tier: everything it included is now
// in the whole package at $100 a year. This entry exists only so a purchase or receipt
// from before the change still resolves to a name, and it is never offered as a
// plan — the plans list above is what the pages render.
export const FORMER_PLANS = {
  full_audit: {
    id: 'full_audit',
    name: 'Full Agent Audit (formerly $99, now included in the whole package)',
    price: '$99',
    cadence: 'formerly one time',
    blurb: 'Retired as a buyable tier. Everything it included is in the whole package at $100 a year.',
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
  pro: 'The harness is active on your account. Your license key is issued to it: download the plug-in, name the one model the key is for, and switch the killswitch on before the first run. It renews monthly, and you can cancel any time.',
  pro_annual:
    'Your year of the harness is active on your account, and your license key is issued to it. It runs for the twelve months you paid for, and there is nothing to renew or cancel.',
  device_check:
    'The whole package is active on your account: the harness and killswitch, the phone scan and look-ups, and the eval puzzles. It renews yearly and you can cancel any time. Next: open the killswitch demo and describe the one agent you want looked at — the tools it can reach, what it will accept as an instruction, and what it has actually done.',
  // Kept so a purchase made before the change still shows sensible guidance.
  full_audit:
    'Your Full Audit is handled as part of the whole package: everything it included is there. Next: open the killswitch demo and describe the agent you want looked at.'
};

export const HONEST_NOTE =
  'No guaranteed detection and no guaranteed results. A gate that passes a puzzle is a check, not a certificate, and these plans are not a promise about how your agent will behave.';
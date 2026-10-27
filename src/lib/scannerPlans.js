export const SCANNER_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    blurb: 'The killswitch and the puzzles, at no cost.',
    features: [
      'The killswitch demo, as often as you like',
      'Eval puzzle summaries: what each one tests',
      'Your own run history',
      'Support tickets to the SIFT AI team'
    ],
    cta: 'Start free'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$7',
    cadence: 'per month',
    blurb: 'For keeping an agent under watch over time.',
    features: ['Full eval puzzle reports', 'Reusable agent profiles', 'PDF reports of what was stopped', 'Priority support'],
    cta: 'Get Pro',
    highlight: true
  },
  {
    id: 'device_check',
    name: 'Agent Check',
    price: '$49',
    cadence: 'one time',
    blurb: 'A careful written look at one agent and its tools.',
    features: [
      'One agent, its tools and its instruction surface',
      'Every gate it reaches, with the evidence',
      'The eval puzzles run against it',
      'A full written report and fix plan'
    ],
    cta: 'Book an Agent Check'
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

// The $99 Full Audit is retired as a buyable tier: everything it included is now
// in Agent Check at $49. This entry exists only so a purchase or receipt from
// before the change still resolves to a name, and it is never offered as a plan —
// the plans list above is what the pages render.
export const FORMER_PLANS = {
  full_audit: {
    id: 'full_audit',
    name: 'Full Agent Audit (formerly $99, now included in Agent Check)',
    price: '$99',
    cadence: 'formerly one time',
    blurb: 'Retired as a buyable tier. Everything it included is in Agent Check at $49.',
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
  pro: 'Pro is active on your account. Full eval puzzle reports, reusable agent profiles, PDF reports and priority support are unlocked. It renews monthly, and you can cancel any time.',
  pro_annual:
    'Your year of Pro is active on your account, and your license key is issued to it. It runs for the twelve months you paid for, and there is nothing to renew or cancel.',
  device_check:
    'Your Agent Check is booked. Next: open the killswitch demo and describe the one agent you want looked at — the tools it can reach, what it will accept as an instruction, and what it has actually done. You get a verdict, the evidence behind it, and a full written fix plan.',
  // Kept so a purchase made before the change still shows sensible guidance.
  full_audit:
    'Your Full Audit is handled as an Agent Check: everything it included is in that plan. Next: open the killswitch demo and describe the agent you want looked at.'
};

export const HONEST_NOTE =
  'No guaranteed detection and no guaranteed results. A gate that passes a puzzle is a check, not a certificate, and these plans are not a promise about how your agent will behave.';
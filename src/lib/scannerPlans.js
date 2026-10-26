export const SCANNER_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    blurb: 'The everyday checks, at no cost.',
    features: ['The everyday checks', 'VirusTotal + OTX checks', 'Your own scan history', 'My devices', 'Allowlist & blocklist'],
    cta: 'Start free'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$7',
    cadence: 'per month',
    blurb: 'For keeping an eye on your own devices over time.',
    features: ['Reusable scan profiles', 'Re-checks of flagged items', 'PDF reports', 'Priority support'],
    cta: 'Get Pro',
    highlight: true
  },
  {
    id: 'device_check',
    name: 'Device Check',
    price: '$49',
    cadence: 'one time',
    blurb: 'A careful second look at one scan.',
    features: ['Submit a flagged scan', 'A verdict, with the evidence', 'A fix list report'],
    cta: 'Book a Device Check'
  },
  {
    id: 'full_audit',
    name: 'Full Device Audit',
    price: '$99',
    cadence: 'one time',
    blurb: 'The whole device, written up.',
    features: ['App list', 'Network destinations', 'Every flagged item', 'A written fix plan'],
    cta: 'Book a Full Audit'
  }
];

export const PAID_TIER_IDS = ['pro', 'device_check', 'full_audit'];

export function planById(tierId) {
  return SCANNER_PLANS.find((plan) => plan.id === tierId) || null;
}

export const NEXT_STEPS = {
  pro: 'Pro is active on your account. Reusable scan profiles, re-checks of flagged items, PDF reports and priority support are unlocked. It renews monthly, and you can cancel any time.',
  device_check:
    'Your Device Check is booked. Next: open the device scanner and submit the flagged scan you want looked at. You get a verdict, the evidence behind it, and a fix list report.',
  full_audit:
    'Your Full Device Audit is booked. Next: open the device scanner and submit the device. You get the app list, the network destinations, every flagged item, and a written fix plan.'
};

export const HONEST_NOTE =
  'No guaranteed detection and no guaranteed results. A scan is a check, not a certificate, and these plans are not a promise about anything on your device.';
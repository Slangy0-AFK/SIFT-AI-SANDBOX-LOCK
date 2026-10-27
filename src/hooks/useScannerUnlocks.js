import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// A year of Pro is paid once, so it counts for the twelve months it paid for and
// not a day longer. The purchase record's own date is what it stands on.
function yearlyProEnded(purchase) {
  const start = purchase.paid_at || purchase.created_date;
  if (!start) return true;
  const ends = new Date(start);
  ends.setMonth(ends.getMonth() + 12);
  return Date.now() > ends.getTime();
}

// What this account can currently use. Pro comes from the plan record, the paid
// tiers from their paid purchase records, and the whole package from a paid
// purchase whose yearly subscription is still live. Nothing here is trusted for
// money: it only decides what the interface offers.
export default function useScannerUnlocks() {
  const { data, isLoading } = useQuery({
    queryKey: ['scanner-unlocks'],
    queryFn: async () => {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) return { authed: false, subs: [], purchases: [] };
      const me = await base44.auth.me();
      const [subs, purchases, places] = await Promise.all([
        base44.entities.Subscription.list('-created_date', 5),
        base44.entities.ScannerPurchase.filter({ status: 'paid' }, { sort: '-created_date', limit: 20 }),
        // This account's own founding place, named explicitly so an admin reading the
        // page still only ever sees their own. The app decides on the server whether a
        // place was granted; this only reads what it decided.
        base44.entities.FoundingPlace.filter({ user_id: me.id, honored: true })
      ]);
      return { authed: true, subs: subs || [], purchases: purchases.items || [], places: places.items || [] };
    },
    initialData: { authed: false, subs: [], purchases: [], places: [] },
    retry: false
  });

  // Only a payment the payment provider confirmed unlocks anything: a purchase
  // counts once it is marked paid, and a plan record counts once a Stripe
  // subscription is actually attached to it. Older or leftover plan rows that
  // were never paid for unlock nothing.
  //
  // The whole package is a yearly subscription, so its paid record only counts
  // while the subscription behind it is still live: a cancelled year, or a renewal
  // that failed, ends the access it paid for.
  const planBySession = new Map(
    data.subs.filter((s) => s.checkout_session_id).map((s) => [s.checkout_session_id, s])
  );
  const unlocked = new Set();
  for (const purchase of data.purchases) {
    if (purchase.status !== 'paid') continue;
    if (purchase.tier === 'device_check') {
      const plan = planBySession.get(purchase.stripe_session_id);
      if (plan && !['active', 'trial'].includes(plan.status)) continue;
    }
    unlocked.add(purchase.tier);
  }
  const livePlan = data.subs.find(
    (s) => ['pro', 'enterprise'].includes(s.plan) && s.status === 'active' && s.stripe_subscription_id
  );
  if (livePlan) unlocked.add('pro');

  // The yearly purchase is paid once and carried no Stripe subscription, so the
  // paid record is what unlocks Pro, until the year it paid for is up.
  const yearly = data.purchases.find(
    (p) => p.status === 'paid' && p.tier === 'pro_annual' && !yearlyProEnded(p)
  );
  if (yearly) unlocked.add('pro');

  // A founding place unlocks everything the app sells, with no payment behind it:
  // the place was granted, not bought.
  const isFounding = (data.places || []).length > 0;
  if (isFounding) {
    unlocked.add('pro');
    unlocked.add('device_check');
  }

  return {
    isLoading,
    isAuthed: data.authed === true,
    isFounding,
    isPro: unlocked.has('pro'),
    hasDeviceCheck: unlocked.has('device_check'),
    // The Full Device Audit is no longer sold: everything it included is in
    // Device Check. Anyone who paid the old $99 still has it, so a device_check
    // purchase counts as full-audit access too.
    hasFullAudit: unlocked.has('full_audit') || unlocked.has('device_check'),
    unlocked
  };
}
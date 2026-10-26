import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// What this account can currently use. Pro comes from the plan record, the two
// one-time tiers from their paid purchase records. Nothing here is trusted for
// money: it only decides what the interface offers.
export default function useScannerUnlocks() {
  const { data, isLoading } = useQuery({
    queryKey: ['scanner-unlocks'],
    queryFn: async () => {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) return { authed: false, subs: [], purchases: [] };
      const [subs, purchases] = await Promise.all([
        base44.entities.Subscription.list('-created_date', 5),
        base44.entities.ScannerPurchase.filter({ status: 'paid' }, { sort: '-created_date', limit: 20 })
      ]);
      return { authed: true, subs: subs || [], purchases: purchases.items || [] };
    },
    initialData: { authed: false, subs: [], purchases: [] },
    retry: false
  });

  const unlocked = new Set(data.purchases.map((p) => p.tier));
  const activePlan = data.subs.find((s) => ['pro', 'enterprise'].includes(s.plan) && s.status === 'active');
  if (activePlan) unlocked.add('pro');

  return {
    isLoading,
    isAuthed: data.authed === true,
    isPro: unlocked.has('pro'),
    hasDeviceCheck: unlocked.has('device_check'),
    hasFullAudit: unlocked.has('full_audit'),
    unlocked
  };
}
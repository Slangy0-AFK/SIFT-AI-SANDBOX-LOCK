import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import PlanTierCard from '@/components/plans/PlanTierCard';
import useScannerUnlocks from '@/hooks/useScannerUnlocks';
import { SCANNER_PLANS, PAID_TIER_IDS, HONEST_NOTE } from '@/lib/scannerPlans';

const LOGO = 'https://media.base44.com/images/public/6a0db3181169f42924052c0d/650b247a7_amazon.PNG';

export default function ScannerPlans() {
  const params = new URLSearchParams(window.location.search);
  const canceled = params.get('checkout') === 'canceled';

  const { unlocked, isAuthed } = useScannerUnlocks();

  const { data: stripe } = useQuery({
    queryKey: ['stripe-status'],
    queryFn: async () => (await base44.functions.invoke('stripeStatus', {})).data,
    staleTime: 60000,
    retry: false,
  });
  const stripeConnected = stripe?.connected === true;

  const checkout = useMutation({
    mutationFn: async (tier) => {
      const res = await base44.functions.invoke('scannerCheckout', { tier });
      if (res.data?.redirectUrl) {
        window.location.href = res.data.redirectUrl;
        return;
      }
      throw new Error(res.data?.error || "We couldn't start checkout. Please try again.");
    },
    onError: (error) => {
      const code = error.response?.data?.error;
      toast.error(code === 'stripe_not_connected' ? 'Stripe not connected yet.' : error.message);
    },
  });

  const handleSelect = (plan) => {
    if (plan.id === 'free') {
      window.location.href = isAuthed ? '/scanner' : '/register';
      return;
    }
    checkout.mutate(plan.id);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={LOGO} alt="SiftAI" className="h-8 w-auto rounded-sm object-contain" />
            <span className="font-mono text-xs tracking-widest text-muted-foreground">PLANS</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button size="sm" variant="outline" className="font-mono text-xs">Log in</Button>
            </Link>
            <Link to="/scanner">
              <Button size="sm" className="font-mono text-xs">Open the scanner</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="max-w-2xl">
          <h1 className="font-mono text-2xl font-bold tracking-wide text-foreground sm:text-3xl">Pick your level of cover</h1>
          <p className="mt-4 text-sm text-muted-foreground sm:text-base">
            The checks are free. Pro keeps an eye on your devices over time, and the two one-time tiers are a careful look at
            something that already came up. Card payments are handled by Stripe — you do not need an account to pay.
          </p>
        </div>

        {canceled && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-secondary/20 p-4">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <p className="font-mono text-xs text-muted-foreground">
              Checkout was cancelled, so nothing was charged and you are still on Free. You can start again whenever you like.
            </p>
          </div>
        )}

        {!stripeConnected && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
            <p className="font-mono text-xs text-amber-400">
              Stripe not connected yet — paid tiers cannot be bought until payment is switched on. The free checks work as normal.
            </p>
          </div>
        )}

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SCANNER_PLANS.map((plan) => (
            <PlanTierCard
              key={plan.id}
              plan={plan}
              unlocked={plan.id === 'free' || unlocked.has(plan.id)}
              stripeConnected={stripeConnected}
              isAuthed={isAuthed}
              loading={checkout.isPending && PAID_TIER_IDS.includes(plan.id)}
              onSelect={handleSelect}
            />
          ))}
        </div>

        <div className="mt-10 flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
          <p className="font-mono text-xs leading-relaxed text-muted-foreground">{HONEST_NOTE}</p>
        </div>

        <p className="mt-6 font-mono text-xs text-muted-foreground">
          Pro renews monthly and can be cancelled any time. One-time tiers are charged once, at checkout.
        </p>
      </main>
    </div>
  );
}
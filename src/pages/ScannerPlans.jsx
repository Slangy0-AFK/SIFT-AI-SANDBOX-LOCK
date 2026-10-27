import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, AlertTriangle, Info, Gift, Key } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import PlanTierCard from '@/components/plans/PlanTierCard';
import PlanCycleToggle from '@/components/plans/PlanCycleToggle';
import useScannerUnlocks from '@/hooks/useScannerUnlocks';
import LicenseTerms from '@/components/license/LicenseTerms';
import { SCANNER_PLANS, PRO_YEARLY, HONEST_NOTE } from '@/lib/scannerPlans';

const LOGO = 'https://media.base44.com/images/public/6a0db3181169f42924052c0d/650b247a7_amazon.PNG';

export default function ScannerPlans() {
  const params = new URLSearchParams(window.location.search);
  const canceled = params.get('checkout') === 'canceled';

  const { unlocked, isAuthed, isFounding } = useScannerUnlocks();

  const { data: stripe, isLoading: stripeLoading } = useQuery({
    queryKey: ['stripe-status'],
    queryFn: async () => (await base44.functions.invoke('stripeStatus', {})).data,
    staleTime: 60000,
    retry: false,
  });

  // The founding offer: everything the app sells is free for the first 50 accounts,
  // and buying stays closed while places remain.
  const { data: founding } = useQuery({
    queryKey: ['founding-offer'],
    queryFn: async () => (await base44.entities.FoundingOffer.list('-created_date', 1))[0] || null,
    staleTime: 60000,
    retry: false,
  });

  // The terms that come with every license key. Read from the server, so this
  // page, the buyer's own license page and the confirmation email cannot say
  // different things.
  const { data: licenseTerms } = useQuery({
    queryKey: ['license-terms'],
    queryFn: async () => (await base44.functions.invoke('licenseKey', { action: 'terms' })).data,
    staleTime: Infinity,
    retry: false,
  });

  // What Pro costs, from the server: the monthly figure and the yearly figure the
  // SIFT AI team's own discount produces. The yearly choice only appears once the
  // server has answered, so no price is ever invented on this page.
  const { data: pricing } = useQuery({
    queryKey: ['scanner-pricing'],
    queryFn: async () => (await base44.functions.invoke('scannerPricing', {})).data,
    staleTime: 60000,
    retry: false,
  });

  const [cycle, setCycle] = useState('month');
  const showYearly = cycle === 'year' && Boolean(pricing?.yearly_cents);

  // Pro swaps between the monthly card and the yearly one. The free checks and
  // the one-time Device Check are unaffected by the choice.
  const plans = SCANNER_PLANS.map((plan) =>
    plan.id === 'pro' && showYearly
      ? {
          ...PRO_YEARLY,
          price: `$${(Number(pricing.yearly_cents) / 100).toFixed(2)}`,
          highlight: plan.highlight
        }
      : plan
  );

  const foundingOpen = founding?.open === true;
  const foundingLeft = founding ? Math.max(0, Number(founding.limit || 50) - Number(founding.claimed || 0)) : 0;

  // The paid buttons follow the answer Stripe itself gave to the server: either not
  // connected, or connected but not yet able to take a charge. While that answer is
  // still in flight nothing is locked or warned about — treating "not answered yet"
  // as "not connected" is what made the page flash a locked button.
  const stripeConnected = stripe?.connected === true;
  const canPay = stripeConnected && stripe?.charges_enabled !== false;
  // The founding offer comes first: while free places remain the paid cards say so,
  // rather than offering a checkout the server would refuse.
  const blockedReason = foundingOpen
    ? 'Founding places still free'
    : stripeLoading || canPay
    ? null
    : stripeConnected
    ? 'Payments not switched on yet'
    : 'Stripe not connected yet';

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
      toast.error(
        code === 'founding_places_open'
          ? 'Free founding places are still open, so nothing is for sale yet.'
          : code === 'stripe_not_connected'
          ? 'Stripe not connected yet.'
          : error.message
      );
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
            <Link to="/governor-demo">
              <Button size="sm" className="font-mono text-xs">Open the killswitch</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="max-w-2xl">
          <h1 className="font-mono text-2xl font-bold tracking-wide text-foreground sm:text-3xl">Pick your level of control</h1>
          <p className="mt-4 text-sm text-muted-foreground sm:text-base">
            Three tiers. Free gives you the phone scan and the look-up. Seven dollars a month adds the harness with its
            killswitch, in your own code. A hundred dollars a year is the whole package, renewed yearly. Card payments are
            handled by Stripe, inside your account: that is how the key, the receipt and the plan stay attached to you, so
            buying needs you logged in.
          </p>
        </div>

        {foundingOpen && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4">
            <Gift className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <p className="font-mono text-xs leading-relaxed text-primary">
              Founding offer: everything the app sells is free for the first 50 accounts — the harness and the whole
              package. {foundingLeft === 1 ? 'One place is' : `${foundingLeft} places are`} left. Buying stays closed while
              the places last and opens by itself once they are gone{isAuthed ? '.' : ' — sign up to claim one.'}
            </p>
          </div>
        )}

        {isFounding && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-primary/40 bg-secondary/20 p-4">
            <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <p className="font-mono text-xs leading-relaxed text-muted-foreground">
              You hold one of the founding places: the harness and the whole package are unlocked on this account, free, for
              good. Nothing to renew and nothing to cancel.
            </p>
          </div>
        )}

        {canceled && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-secondary/20 p-4">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <p className="font-mono text-xs text-muted-foreground">
              Checkout was cancelled, so nothing was charged and you are still on Free. You can start again whenever you like.
            </p>
          </div>
        )}

        {blockedReason && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
            <p className="font-mono text-xs text-amber-400">
              {stripeConnected
                ? 'Card payments are not switched on yet — Stripe still has to finish setting up this account, so the paid tiers cannot be bought yet. The free checks work as normal.'
                : 'Stripe not connected yet — paid tiers cannot be bought until payment is switched on. The free checks work as normal.'}
            </p>
          </div>
        )}

        <PlanCycleToggle value={cycle} onChange={setCycle} pricing={pricing} />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanTierCard
              key={plan.id}
              plan={plan}
              unlocked={plan.id === 'free' || unlocked.has(plan.id)}
              blockedReason={blockedReason}
              isAuthed={isAuthed}
              loading={checkout.isPending && plan.id !== 'free'}
              onSelect={handleSelect}
            />
          ))}
        </div>

        <div className="mt-10 flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
          <p className="font-mono text-xs leading-relaxed text-muted-foreground">{HONEST_NOTE}</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <Key className="h-4 w-4 flex-shrink-0 text-primary" />
          <p className="max-w-2xl font-mono text-xs leading-relaxed text-muted-foreground">
            Every paid plan, and every founding place, comes with a SIFT AI license key for testing the governor and
            hardening filter in your own model and environment. It is applied to your account automatically, and your own
            copy waits on your license page.
          </p>
          <Link to="/license" className="font-mono text-xs font-medium text-primary underline underline-offset-4">
            {isAuthed ? 'Open my license' : 'Sign in to see my key'}
          </Link>
          <Link to="/plugin" className="font-mono text-xs font-medium text-primary underline underline-offset-4">
            Download plug-in
          </Link>
        </div>

        {licenseTerms && (
          <div className="mt-4">
            <LicenseTerms unlocks={licenseTerms.unlocks} terms={licenseTerms.terms} />
          </div>
        )}

        <p className="mt-6 font-mono text-xs text-muted-foreground">
          The harness renews monthly and can be cancelled any time. A year of it is one payment for twelve months, with no
          renewal to cancel. The whole package renews yearly at $100 and can be cancelled any time, and cancelling stops the
          next year's charge. Every purchase needs a signed-in account.
        </p>
      </main>
    </div>
  );
}
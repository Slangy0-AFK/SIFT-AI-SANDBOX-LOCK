import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import PlanCard, { PLANS } from '@/components/subscription/PlanCard';
import CancelProPanel from '@/components/subscription/CancelProPanel';
import SupportCenter from '@/components/support/SupportCenter';

export default function SubscriptionPage() {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => base44.entities.Subscription.list('-created_date', 1),
    initialData: [],
  });

  // While free founding places remain, buying is closed — the same offer the plans
  // page shows and the server enforces.
  const { data: founding } = useQuery({
    queryKey: ['founding-offer'],
    queryFn: async () => (await base44.entities.FoundingOffer.list('-created_date', 1))[0] || null,
    staleTime: 60000,
    retry: false,
  });
  const foundingOpen = founding?.open === true;

  const rawPlan = subscriptions[0]?.plan || 'free';
  const currentPlan = PLANS[rawPlan] ? rawPlan : (rawPlan === 'enterprise' ? 'pro' : 'free');

  const checkoutMutation = useMutation({
    mutationFn: async ({ planKey, billingCycle }) => {
      const res = await base44.functions.invoke('stripeCheckout', { planKey, billingCycle });
      if (res.data?.redirectUrl) window.location.href = res.data.redirectUrl;
      else throw new Error(res.data?.error || "We couldn't start checkout. Please try again.");
    },
    onError: (error) => {
      const code = error.response?.data?.error || error.message;
      toast.error(
        code === 'founding_places_open'
          ? 'Free founding places are still open, so nothing is for sale yet.'
          : error.message
      );
    },
  });

  const handleSelectPlan = (planKey) => {
    if (planKey === 'free') return toast.error("You're already on the Free plan.");
    checkoutMutation.mutate({ planKey, billingCycle });
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Your plan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          See what you have now, and upgrade whenever you're ready.{' '}
          <Link to="/plans" className="text-primary hover:underline">See all plans</Link>
        </p>
      </div>

      {foundingOpen && (
        <p className="font-mono text-xs leading-relaxed text-primary">
          Free founding places are still open, so upgrades wait until they are taken — the first 50 accounts get
          everything the app sells, free.{' '}
          <Link to="/plans" className="underline">See the offer</Link>
        </p>
      )}

      <Card className={`border-2 ${currentPlan === 'pro' ? 'border-primary/30' : 'border-border'}`}>
        <CardContent className="pt-5 pb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-border">
              <Shield className={`w-6 h-6 ${currentPlan === 'pro' ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{PLANS[currentPlan].name} plan</span>
              <Badge variant="secondary" className="text-xs">Active</Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">${PLANS[currentPlan].price[billingCycle]}</div>
            <div className="text-xs text-muted-foreground">per {billingCycle === 'annual' ? 'year' : 'month'}</div>
          </div>
        </CardContent>
      </Card>

      <CancelProPanel />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Choose a plan</h2>
        <div className="flex items-center gap-3 bg-secondary/50 px-3 py-1.5 rounded-lg border border-border text-sm">
          <span className={billingCycle === 'monthly' ? 'text-foreground font-semibold' : 'text-muted-foreground'}>Monthly</span>
          <button onClick={() => setBillingCycle(b => b === 'monthly' ? 'annual' : 'monthly')} className="text-primary">
            {billingCycle === 'monthly' ? <ToggleLeft className="w-6 h-6" /> : <ToggleRight className="w-6 h-6" />}
          </button>
          <span className={billingCycle === 'annual' ? 'text-foreground font-semibold' : 'text-muted-foreground'}>Yearly (save 2 months)</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {Object.keys(PLANS).map(key => (
          <PlanCard key={key} planKey={key} billingCycle={billingCycle} currentPlan={currentPlan}
            onSelect={handleSelectPlan} loading={checkoutMutation.isPending} />
        ))}
      </div>

      <SupportCenter />
    </div>
  );
}
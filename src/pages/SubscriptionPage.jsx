import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Smartphone, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import PlanCard, { PLANS } from '../components/subscription/PlanCard';
import DeviceManager from '../components/subscription/DeviceManager';
import InvitationManager from '../components/subscription/InvitationManager';
import SupportCenter from '../components/support/SupportCenter';

export default function SubscriptionPage() {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [togglingAutoPay, setTogglingAutoPay] = useState(false);
  const queryClient = useQueryClient();



  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => base44.entities.Subscription.list('-created_date', 1),
    initialData: [],
  });

  const { data: devices = [] } = useQuery({
    queryKey: ['devices'],
    queryFn: () => base44.entities.Device.list('-created_date', 20),
    initialData: [],
  });

  const currentSub = subscriptions[0];
  // Normalize plan to known keys; legacy 'enterprise' falls back to 'pro'
  const rawPlan = currentSub?.plan || 'free';
  const currentPlan = PLANS[rawPlan] ? rawPlan : (rawPlan === 'enterprise' ? 'pro' : 'free');

  const checkoutMutation = useMutation({
    mutationFn: async ({ planKey, billingCycle }) => {
      const res = await base44.functions.invoke('stripeCheckout', { planKey, billingCycle });
      if (res.data?.redirectUrl) {
        window.location.href = res.data.redirectUrl;
      } else {
        throw new Error(res.data?.error || 'Failed to initiate checkout');
      }
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const autoPayMutation = useMutation({
    mutationFn: async (enabled) => {
      if (!currentSub) return;
      return base44.functions.invoke('manageDevice', { action: 'set_auto_pay', auto_pay: enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Auto-pay preference updated');
      setTogglingAutoPay(false);
    },
    onError: (error) => {
      toast.error('Failed to update auto-pay: ' + error.message);
      setTogglingAutoPay(false);
    },
  });

  const handleToggleAutoPay = () => {
    setTogglingAutoPay(true);
    const newValue = !currentSub?.auto_pay;
    autoPayMutation.mutate(newValue);
  };

  const handleSelectPlan = (planKey) => {
    if (planKey === 'free') {
      toast.error("You are already on the Free plan.");
      return;
    }
    checkoutMutation.mutate({ planKey, billingCycle });
  };

  const planColor = currentPlan === 'pro' ? 'text-primary' : 'text-muted-foreground';
  const activeDevices = devices.filter(d => d.status === 'active');
  const maxDevices = PLANS[currentPlan]?.devices || 1;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">SUBSCRIPTION</h1>
          <p className="font-mono text-xs text-muted-foreground tracking-widest mt-1">
            PLANS · DEVICES · BILLING
          </p>
        </div>

      </div>

      {/* Current plan status */}
      <Card className={`border-2 ${currentPlan === 'pro' ? 'border-primary/30' : 'border-border'}`}>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 border border-border">
                <Shield className={`w-6 h-6 ${planColor}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-foreground uppercase">
                    {PLANS[currentPlan]?.name || 'Free'} Plan
                  </span>
                  <Badge className={`font-mono text-xs ${currentPlan === 'pro' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-secondary text-muted-foreground border-border'} border`}>
                    ACTIVE
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono text-xs text-muted-foreground">
                    <Smartphone className="w-3 h-3 inline mr-1" />
                    {activeDevices.length}/{maxDevices} devices used
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl font-bold text-foreground">
                ${PLANS[currentPlan]?.price?.[billingCycle] || 0}
              </div>
              <div className="font-mono text-xs text-muted-foreground">per {billingCycle === 'annual' ? 'year' : 'month'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Manager */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary" /> REGISTERED DEVICES
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DeviceManager devices={devices} plan={currentPlan} userId={user?.id || 'me'} />
        </CardContent>
      </Card>

      {/* Invitation Manager */}
      <InvitationManager subscription={currentSub} />

      {/* Plans Selection */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-mono text-lg font-bold tracking-wide">Available Plans</h2>
        <div className="flex items-center gap-3 bg-secondary/50 p-1.5 rounded-lg border border-border">
          <span className={`font-mono text-xs ${billingCycle === 'monthly' ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>Monthly</span>
          <button 
            onClick={() => setBillingCycle(b => b === 'monthly' ? 'annual' : 'monthly')}
            className="text-primary hover:text-primary/80 transition-colors"
          >
            {billingCycle === 'monthly' ? <ToggleLeft className="w-6 h-6" /> : <ToggleRight className="w-6 h-6" />}
          </button>
          <span className={`font-mono text-xs ${billingCycle === 'annual' ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>Annual</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {Object.keys(PLANS).map(key => (
          <PlanCard
            key={key}
            planKey={key}
            billingCycle={billingCycle}
            currentPlan={currentPlan}
            onSelect={handleSelectPlan}
            loading={checkoutMutation.isPending}
            betaMode={false}
          />
        ))}
      </div>

      {/* Support Center */}
      <SupportCenter />



    </div>
  );
}
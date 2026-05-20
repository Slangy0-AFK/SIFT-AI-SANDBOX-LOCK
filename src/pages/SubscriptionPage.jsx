import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, CreditCard, Smartphone, RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import PlanCard, { PLANS } from '../components/subscription/PlanCard';
import DeviceManager from '../components/subscription/DeviceManager';
import SupportCenter from '../components/support/SupportCenter';
import { motion, AnimatePresence } from 'framer-motion';

export default function SubscriptionPage() {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [upgrading, setUpgrading] = useState(false);
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
  const currentPlan = currentSub?.plan || 'free';

  const upgradeMutation = useMutation({
    mutationFn: async (planKey) => {
      if (currentSub) {
        return base44.entities.Subscription.update(currentSub.id, { plan: planKey, billing_cycle: billingCycle, status: 'active' });
      }
      return base44.entities.Subscription.create({ user_id: user?.id || 'me', plan: planKey, billing_cycle: billingCycle, status: 'active' });
    },
    onSuccess: (_, planKey) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success(`Upgraded to ${PLANS[planKey].name} plan!`);
      setUpgrading(false);
    },
  });

  const handleSelectPlan = (planKey) => {
    setUpgrading(true);
    upgradeMutation.mutate(planKey);
  };

  const planColor = currentPlan === 'enterprise' ? 'text-amber-400' : currentPlan === 'pro' ? 'text-primary' : 'text-muted-foreground';
  const activeDevices = devices.filter(d => d.status === 'active');
  const maxDevices = PLANS[currentPlan]?.devices || 1;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">SUBSCRIPTION</h1>
          <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-1">
            PLANS · DEVICES · GOOGLE PLAY BILLING
          </p>
        </div>
        {/* Google Play badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary border border-border">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-green-400 via-blue-400 to-red-400 flex items-center justify-center">
            <span className="text-[8px] font-bold text-white">▶</span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">Google Play Billing</span>
        </div>
      </div>

      {/* Current plan status */}
      <Card className={`border-2 ${currentPlan === 'enterprise' ? 'border-amber-400/30' : currentPlan === 'pro' ? 'border-primary/30' : 'border-border'}`}>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${currentPlan === 'free' ? 'bg-secondary' : currentPlan === 'pro' ? 'bg-primary/10' : 'bg-amber-400/10'} border border-border`}>
                <Shield className={`w-6 h-6 ${planColor}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-foreground">
                    {PLANS[currentPlan].name} Plan
                  </span>
                  <Badge className={`font-mono text-[8px] ${currentPlan === 'free' ? 'bg-secondary text-muted-foreground' : currentPlan === 'pro' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-amber-400/10 text-amber-400 border-amber-400/20'} border`}>
                    {currentSub?.status?.toUpperCase() || 'FREE'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    <Smartphone className="w-3 h-3 inline mr-1" />
                    {activeDevices.length}/{maxDevices} devices used
                  </span>
                  {currentSub?.renewal_date && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      <RefreshCw className="w-3 h-3 inline mr-1" />
                      Renews {new Date(currentSub.renewal_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {currentPlan !== 'free' && (
              <div className="text-right">
                <div className="font-mono text-2xl font-bold text-foreground">
                  ${currentSub?.billing_cycle === 'annual'
                    ? PLANS[currentPlan].price.annual
                    : PLANS[currentPlan].price.monthly}
                </div>
                <div className="font-mono text-[9px] text-muted-foreground">per month</div>
              </div>
            )}
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

      {/* Plans */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono text-xs font-semibold tracking-wider text-muted-foreground uppercase">Change Plan</h2>
          {/* Billing toggle */}
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`font-mono text-[10px] px-3 py-1.5 rounded-md transition-all ${billingCycle === 'monthly' ? 'bg-card text-foreground shadow' : 'text-muted-foreground'}`}
            >Monthly</button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`font-mono text-[10px] px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${billingCycle === 'annual' ? 'bg-card text-foreground shadow' : 'text-muted-foreground'}`}
            >
              Annual
              <span className="text-green-400 text-[8px]">-20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {['free', 'pro', 'enterprise'].map(planKey => (
            <PlanCard
              key={planKey}
              planKey={planKey}
              billingCycle={billingCycle}
              currentPlan={currentPlan}
              onSelect={handleSelectPlan}
              loading={upgradeMutation.isPending}
            />
          ))}
        </div>
      </div>

      {/* Support Center */}
      <SupportCenter />

      {/* Google Play notice */}
      <Card className="border-border bg-secondary/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-mono text-[11px] font-semibold text-foreground">Google Play Store Billing</p>
              <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
                Subscriptions are managed through Google Play. Payments, renewals, and cancellations are handled securely via your Google account. 
                Your purchase token is stored for license verification on each device.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
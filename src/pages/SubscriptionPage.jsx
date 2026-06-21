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

  // BETA MODE - No payment processing
  const handleBetaPlanSelect = (planKey) => {
    // In beta mode, just update the plan locally without payment
    const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    if (currentSub) {
      base44.entities.Subscription.update(currentSub.id, { 
        plan: planKey, 
        billing_cycle: 'monthly', 
        status: 'trial',
        renewal_date: renewalDate
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
        toast.success(`Beta access granted to ${planKey === 'pro' ? 'Pro' : 'Free'} plan!`);
      });
    } else {
      base44.entities.Subscription.create({ 
        user_id: user?.id, 
        plan: planKey, 
        billing_cycle: 'monthly', 
        status: 'trial',
        renewal_date: renewalDate
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
        toast.success(`Beta access granted to ${planKey === 'pro' ? 'Pro' : 'Free'} plan!`);
      });
    }
  };

  const autoPayMutation = useMutation({
    mutationFn: async (enabled) => {
      if (!currentSub) return;
      return base44.entities.Subscription.update(currentSub.id, { 
        auto_pay: enabled 
      });
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
    handleBetaPlanSelect(planKey);
  };

  const planColor = currentPlan === 'pro' ? 'text-primary' : 'text-muted-foreground';
  const activeDevices = devices.filter(d => d.status === 'active');
  const maxDevices = PLANS[currentPlan]?.devices || 1;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">SUBSCRIPTION</h1>
          <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-1">
            PLANS · DEVICES · BILLING VIA GOOGLE PLAY
          </p>
        </div>

      </div>

      {/* Current plan status */}
      <Card className="border-2 border-primary/30">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 border border-border">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-foreground">
                    Beta Plan
                  </span>
                  <Badge className="font-mono text-[8px] bg-primary/10 text-primary border-primary/20 border">
                    ACTIVE
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    <Smartphone className="w-3 h-3 inline mr-1" />
                    {activeDevices.length}/Unlimited devices used
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl font-bold text-foreground">
                $0
              </div>
              <div className="font-mono text-[9px] text-muted-foreground">per month</div>
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

      {/* Beta Mode Notice */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2 text-primary">
            <Shield className="w-4 h-4" /> STRICTLY BETA MODE
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
            SIFT-AI is currently in strict beta testing. Your account has full, unrestricted access to all features — including Zero-Day, Threat Intel, and Threat Scanner — at no cost.
          </p>
        </CardContent>
      </Card>

      {/* Plans hidden for beta */}

      {/* Support Center */}
      <SupportCenter />



    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, CreditCard, Smartphone, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import PlanCard, { PLANS } from '../components/subscription/PlanCard';
import DeviceManager from '../components/subscription/DeviceManager';
import InvitationManager from '../components/subscription/InvitationManager';
import SupportCenter from '../components/support/SupportCenter';
import CaptchaModal from '../components/subscription/CaptchaModal';
import { motion, AnimatePresence } from 'framer-motion';

export default function SubscriptionPage() {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [upgrading, setUpgrading] = useState(false);
  const [togglingAutoPay, setTogglingAutoPay] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const queryClient = useQueryClient();

  // Check for successful checkout
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (sessionId) {
      toast.success('Payment successful! Your Pro plan is now active.');
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      // Clean URL
      window.history.replaceState({}, document.title, '/subscription');
    }
  }, []);

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

  const stripeCheckoutMutation = useMutation({
    mutationFn: async ({ planKey, priceId, captcha_token, captcha_answer }) => {
      const response = await base44.functions.invoke('stripeCheckout', {
        price_id: priceId,
        billing_cycle: billingCycle,
        captcha_token,
        captcha_answer,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.url) {
        // Check if running in iframe
        if (window.self !== window.top) {
          toast.error('Checkout is only available in the published app, not in preview mode.');
          setUpgrading(false);
          setShowCaptcha(false);
          return;
        }
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast.error('Failed to start checkout: ' + error.message);
      setUpgrading(false);
      setShowCaptcha(false);
    },
  });

  const trialMutation = useMutation({
    mutationFn: async () => {
      const renewalDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      if (currentSub) {
        return base44.entities.Subscription.update(currentSub.id, { 
          plan: 'free', 
          billing_cycle: 'monthly', 
          status: 'trial',
          renewal_date: renewalDate
        });
      }
      return base44.entities.Subscription.create({ 
        user_id: user?.id, 
        plan: 'free', 
        billing_cycle: 'monthly', 
        status: 'trial',
        renewal_date: renewalDate
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('14-day trial started! You will move to Free plan after trial ends.');
      setUpgrading(false);
    },
  });

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

  const handleSelectPlan = (planKey, priceId) => {
    setUpgrading(true);
    
    if (planKey === 'free') {
      trialMutation.mutate();
    } else if (priceId) {
      // Store pending checkout and show CAPTCHA
      setPendingCheckout({ planKey, priceId });
      setShowCaptcha(true);
    }
  };

  const handleCaptchaSuccess = (captcha_token, captcha_answer) => {
    setShowCaptcha(false);
    if (pendingCheckout) {
      stripeCheckoutMutation.mutate({
        ...pendingCheckout,
        captcha_token,
        captcha_answer,
      });
      setPendingCheckout(null);
    }
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
            PLANS · DEVICES · GOOGLE PLAY BILLING
          </p>
        </div>

      </div>

      {/* Current plan status */}
      <Card className={`border-2 ${currentPlan === 'pro' ? 'border-primary/30' : 'border-border'}`}>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${currentPlan === 'pro' ? 'bg-primary/10' : 'bg-secondary'} border border-border`}>
                <Shield className={`w-6 h-6 ${planColor}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-foreground">
                    {PLANS[currentPlan].name} Plan
                  </span>
                  {currentSub?.status === 'trial' && currentSub?.renewal_date && (
                    <span className="font-mono text-[9px] text-primary mr-2">
                      Trial ends {new Date(currentSub.renewal_date).toLocaleDateString()}
                    </span>
                  )}
                  <Badge className={`font-mono text-[8px] ${currentPlan === 'pro' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-secondary text-muted-foreground'} border`}>
                    {currentSub?.status === 'trial' ? 'TRIAL' : (currentSub?.status?.toUpperCase() || 'FREE')}
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
                  {currentPlan !== 'free' && (
                    <button
                      onClick={handleToggleAutoPay}
                      disabled={togglingAutoPay}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/50 hover:bg-secondary border border-border transition-colors"
                    >
                      {currentSub?.auto_pay === false ? (
                        <>
                          <ToggleLeft className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-mono text-[9px] text-muted-foreground">Auto-pay Off</span>
                        </>
                      ) : (
                        <>
                          <ToggleRight className="w-3.5 h-3.5 text-primary" />
                          <span className="font-mono text-[9px] text-primary">Auto-pay On</span>
                        </>
                      )}
                    </button>
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

      {/* Invitation Manager */}
      {currentPlan !== 'free' && (
        <InvitationManager subscription={currentSub} />
      )}

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {['free', 'pro'].map(planKey => (
             <PlanCard
               key={planKey}
               planKey={planKey}
               billingCycle={billingCycle}
               currentPlan={currentPlan}
               onSelect={handleSelectPlan}
               loading={stripeCheckoutMutation.isPending || trialMutation.isPending}
             />
           ))}
         </div>
      </div>

      {/* Support Center */}
      <SupportCenter />

      {/* Human Verification CAPTCHA */}
      <CaptchaModal
        isOpen={showCaptcha}
        onSuccess={handleCaptchaSuccess}
        onClose={() => {
          setShowCaptcha(false);
          setUpgrading(false);
          setPendingCheckout(null);
        }}
      />

    </div>
  );
}
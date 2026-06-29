import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const PLANS = {
  free: {
    name: 'Free',
    price: { monthly: 0, annual: 0 },
    color: 'text-muted-foreground',
    border: 'border-border',
    badge: null,
    devices: 1,
    features: [
      { label: 'Base Chain Pipeline', included: true },
      { label: 'Paradox Lock Gate', included: true },
      { label: 'QRNG Cycles (1 cycle)', included: true },
      { label: 'Mirror Environment', included: false },
      { label: 'Honeypots & Tarpits', included: false },
      { label: 'Threat Log (last 10)', included: true },
      { label: 'Up to 1 device', included: true },
    ],
  },
  pro: {
    name: 'Pro',
    price: { monthly: 5, annual: 50 },
    color: 'text-primary',
    border: 'border-primary/40',
    badge: 'Best Value',
    devices: 5,
    features: [
      { label: 'Everything in Free', included: true },
      { label: 'QRNG Cycles (unlimited)', included: true },
      { label: 'Mirror Environment', included: true },
      { label: 'Honeypots & Tarpits', included: true },
      { label: 'Full Threat Log', included: true },
      { label: 'Multiple users', included: true },
      { label: '5 devices per user', included: true },
      { label: 'Priority threat response', included: true },
      { label: 'Custom QRNG parameters', included: true },
      { label: 'Dedicated support', included: true },
    ],
  },
};

export { PLANS };

export default function PlanCard({ planKey, billingCycle, currentPlan, onSelect, loading, betaMode = false }) {
  const plan = PLANS[planKey];
  const price = plan.price[billingCycle];
  const isCurrentPlan = currentPlan === planKey;
  const isUpgrade = ['free', 'pro'].indexOf(planKey) > ['free', 'pro'].indexOf(currentPlan);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={`relative bg-card border-2 ${isCurrentPlan ? plan.border : 'border-border'} rounded-2xl p-6 flex flex-col`}
    >
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="font-mono text-xs px-3 bg-primary text-primary-foreground">
            {plan.badge}
          </Badge>
        </div>
      )}

      <div className="mb-5">
        <h3 className={`font-mono text-lg font-bold ${plan.color} tracking-wider`}>{plan.name}</h3>
        <div className="mt-2 flex items-end gap-1">
          {price === 0 ? (
            <span className="font-mono text-3xl font-bold text-foreground">Free</span>
          ) : (
            <>
              <span className="font-mono text-3xl font-bold text-foreground">${price}</span>
              <span className="font-mono text-xs text-muted-foreground mb-1">/{billingCycle === 'annual' ? 'yr' : 'mo'}</span>
            </>
          )}
        </div>
        <p className="font-mono text-xs text-muted-foreground mt-1">
          Up to {plan.devices} device{plan.devices > 1 ? 's' : ''}{planKey === 'pro' ? ' per user' : ''}
        </p>
      </div>

      <ul className="space-y-2 flex-1 mb-6">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-center gap-2">
            {f.included
              ? <Check className={`w-3.5 h-3.5 ${plan.color} flex-shrink-0`} />
              : <X className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />}
            <span className={`font-mono text-xs ${f.included ? 'text-foreground' : 'text-muted-foreground/50'}`}>{f.label}</span>
          </li>
        ))}
      </ul>

      <Button
        className={`w-full font-mono text-xs ${isCurrentPlan ? 'opacity-60 cursor-default' : ''}`}
        variant={isCurrentPlan ? 'outline' : 'default'}
        disabled={isCurrentPlan || loading}
        onClick={() => {
          if (!isCurrentPlan) {
            onSelect(planKey);
          }
        }}
      >
        {isCurrentPlan ? 'Current Plan' : (isUpgrade ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`)}
      </Button>
    </motion.div>
  );
}
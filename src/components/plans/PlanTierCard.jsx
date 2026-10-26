import React from 'react';
import { Check, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function PlanTierCard({ plan, unlocked, blockedReason, isAuthed, loading, onSelect }) {
  const isFree = plan.id === 'free';
  const blocked = !isFree && Boolean(blockedReason);
  const held = unlocked && !isFree;

  const label = held
    ? 'Unlocked'
    : blocked
    ? blockedReason
    : isFree
    ? (isAuthed ? 'Open the scanner' : plan.cta)
    : plan.cta;

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-card p-6 ${
        plan.highlight ? 'border-primary/40' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-mono text-base font-bold tracking-wide text-foreground">{plan.name}</h3>
        {held && <Badge className="font-mono text-xs">Unlocked</Badge>}
      </div>

      <div className="mt-3 flex items-end gap-1.5">
        <span className="font-mono text-2xl font-bold text-foreground">{plan.price}</span>
        <span className="mb-1 font-mono text-xs text-muted-foreground">{plan.cadence}</span>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{plan.blurb}</p>

      <ul className="mt-5 flex-1 space-y-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
            <span className="font-mono text-xs text-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        className="mt-6 w-full font-mono text-xs"
        variant={isFree ? 'outline' : 'default'}
        disabled={loading || blocked || held}
        onClick={() => onSelect(plan)}
      >
        {loading && !isFree ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        {blocked && !held ? <Lock className="h-3.5 w-3.5" /> : null}
        {label}
      </Button>
    </div>
  );
}
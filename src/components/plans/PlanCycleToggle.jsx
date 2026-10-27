import React from 'react';
import { CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';

const money = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;

// Pro is sold two ways: a month at a time, or a year paid upfront at the team's
// own yearly discount. The yearly figure comes from the server, so the price on
// this control is the price at checkout.
export default function PlanCycleToggle({ value, onChange, pricing }) {
  if (!pricing?.yearly_cents) return null;

  const discount = Number(pricing.yearly_discount_percent || 0);

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <CalendarRange className="h-3.5 w-3.5 text-primary" />
        Pro:
      </span>

      <div className="inline-flex rounded-full border border-border bg-card p-1">
        {[
          { id: 'month', label: '1 month' },
          { id: 'year', label: '1 year' }
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'rounded-full px-3.5 py-1.5 font-mono text-xs transition-colors',
              value === option.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <span className="font-mono text-xs text-muted-foreground">
        {money(pricing.monthly_cents)} a month, or {money(pricing.yearly_cents)} for a year
        {discount > 0 ? ` — ${discount}% off, paid once` : ', paid once'}
      </span>
    </div>
  );
}
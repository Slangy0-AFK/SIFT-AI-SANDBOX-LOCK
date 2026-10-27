import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, ArrowRight, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatChicagoTime } from '@/lib/utils';
import { NEXT_STEPS } from '@/lib/scannerPlans';

function money(cents, currency) {
  const amount = (Number(cents) || 0) / 100;
  return `${(currency || 'usd').toUpperCase() === 'USD' ? '$' : ''}${amount.toFixed(2)}`;
}

export default function ReceiptSummary({ plan, purchase }) {
  const paid = purchase.status === 'paid';

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="flex items-center gap-2">
        {paid ? (
          <CheckCircle2 className="h-5 w-5 text-green-400" />
        ) : (
          <Clock className="h-5 w-5 text-amber-400" />
        )}
        <h1 className="font-mono text-lg font-bold tracking-wide text-foreground">
          {paid ? 'Payment received' : 'Payment not confirmed yet'}
        </h1>
      </div>

      <dl className="mt-6 space-y-3 border-t border-border pt-6">
        <div className="flex items-center justify-between gap-4">
          <dt className="font-mono text-xs text-muted-foreground">What you bought</dt>
          <dd className="font-mono text-xs font-semibold text-foreground">{plan ? plan.name : purchase.tier_name}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-mono text-xs text-muted-foreground">Amount</dt>
          <dd className="font-mono text-xs font-semibold text-foreground">
            {money(purchase.amount_cents, purchase.currency)}
            {plan && plan.cadence === 'per month' ? ' per month' : ''}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-mono text-xs text-muted-foreground">Date</dt>
          <dd className="font-mono text-xs text-foreground">
            {purchase.paid_at ? formatChicagoTime(purchase.paid_at) : 'Waiting for confirmation'}
          </dd>
        </div>
      </dl>

      <div className="mt-6 rounded-xl border border-border/60 bg-secondary/10 p-4">
        <p className="font-mono text-xs font-semibold text-foreground">What happens next</p>
        <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
          {paid
            ? NEXT_STEPS[purchase.tier] || 'Your tier is unlocked.'
            : 'Your bank or card provider has not finished confirming this payment. Nothing is unlocked yet. Refresh this page in a moment — if it still says this after an hour, contact support.'}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/scanner">
          <Button className="font-mono text-xs gap-2">
            Go to the scanner <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
        {paid && (
          <Link to="/license">
            <Button variant="outline" className="font-mono text-xs gap-2">
              <Key className="h-3.5 w-3.5" /> Your license key
            </Button>
          </Link>
        )}
        <Link to="/plans">
          <Button variant="outline" className="font-mono text-xs">
            Back to plans
          </Button>
        </Link>
      </div>
    </div>
  );
}
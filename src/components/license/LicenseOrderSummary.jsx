import React from 'react';
import { CheckCircle2, Receipt, BadgeCheck } from 'lucide-react';
import { formatChicagoTime } from '@/lib/utils';

const money = (cents, currency) => {
  const amount = (Number(cents || 0) / 100).toFixed(2);
  return `${String(currency || 'usd').toUpperCase() === 'USD' ? '$' : ''}${amount} ${String(currency || 'usd').toUpperCase()}`;
};

// The receipt and the order confirmation, side by side, right after the key.
// A founding place shows the same two, with no charge on them.
export default function LicenseOrderSummary({ license }) {
  const founding = license.source === 'founding';
  const bought = license.issued_at ? formatChicagoTime(license.issued_at) : 'not recorded';

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="flex items-center gap-2 font-heading text-sm font-semibold">
          <Receipt className="h-4 w-4 text-primary" /> Receipt
        </p>
        <dl className="mt-4 space-y-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">What you bought</dt>
            <dd className="mt-0.5 text-sm">{license.plan_label || 'SIFT AI'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Amount</dt>
            <dd className="mt-0.5 text-sm">
              {founding ? 'No charge — founding place' : money(license.amount_cents, license.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Date</dt>
            <dd className="mt-0.5 text-sm">{bought}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Order number</dt>
            <dd className="mt-0.5 font-mono text-sm">{license.order_number}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <p className="flex items-center gap-2 font-heading text-sm font-semibold">
          <BadgeCheck className="h-4 w-4 text-primary" /> Order confirmation
        </p>
        <p className="mt-3 flex items-start gap-2 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
          {founding ? 'Your founding place is confirmed.' : 'Your order is confirmed.'}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {founding
            ? 'It came with the license free, so there is nothing to pay and nothing to renew.'
            : 'This order came with one SIFT AI license key, shown above.'}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          A copy of this confirmation, with your key, was sent to the email address on your account. Keep the key to yourself.
        </p>
      </div>
    </div>
  );
}
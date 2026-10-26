import React from 'react';

function Line({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-mono text-sm text-foreground break-all text-right">{value}</span>
    </div>
  );
}

export default function StripeAccountDetails({ account }) {
  return (
    <div className="mt-4">
      <Line label="Account" value={account.stripe_user_id || 'unknown'} />
      <Line label="Mode" value={account.livemode ? 'Live' : 'Test'} />
      <Line label="Access" value={account.scope || 'not reported'} />
      <Line
        label="Connected"
        value={account.connected_at ? new Date(account.connected_at).toLocaleString() : 'unknown'}
      />
    </div>
  );
}
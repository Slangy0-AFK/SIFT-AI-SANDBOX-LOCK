import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import StripeConnectPanel from '@/components/settings/StripeConnectPanel';

const RESULTS = {
  ok: { icon: CheckCircle2, tone: 'text-primary', text: 'The Stripe account was connected.' },
  error: {
    icon: AlertTriangle,
    tone: 'text-destructive',
    text: 'The connection was not completed. Start it again from this page.'
  },
  signin: {
    icon: AlertTriangle,
    tone: 'text-destructive',
    text: 'Sign in with the admin account that started the connection, then open this page again.'
  },
  not_admin: {
    icon: AlertTriangle,
    tone: 'text-destructive',
    text: 'Only an admin account can connect a Stripe account.'
  }
};

export default function StripeConnect() {
  const params = new URLSearchParams(window.location.search);
  const reason = params.get('reason');
  const code = params.get('code');
  const state = params.get('state');
  const [fallback, setFallback] = useState(null);

  // The endpoint is the URL registered in Stripe. If Stripe lands on this page
  // instead, the exchange is run from here through the same server-side checks.
  useEffect(() => {
    if (!code || !state) return;
    base44.functions
      .invoke('stripeConnect', { action: 'complete', code, state })
      .then((res) => setFallback(res.data?.ok ? 'ok' : 'error'))
      .catch(() => setFallback('error'));
  }, [code, state]);

  const result = RESULTS[fallback || params.get('connect')];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">Stripe connection</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        SIFT AI connects to Stripe through its own OAuth endpoint. Starting a connection sends you to Stripe; nothing is
        approved on your behalf.
      </p>

      {result && (
        <div className="mt-6 flex items-start gap-2 rounded-md border border-border bg-card p-3">
          <result.icon className={`mt-0.5 h-4 w-4 shrink-0 ${result.tone}`} />
          <p className="text-sm text-foreground">
            {result.text}
            {reason ? <span className="ml-1 font-mono text-xs text-muted-foreground">({reason})</span> : null}
          </p>
        </div>
      )}

      <div className="mt-6">
        <StripeConnectPanel />
      </div>

      <div className="mt-6 flex items-start gap-2 rounded-md border border-border bg-secondary p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs text-muted-foreground">
          The redirect URL registered in Stripe must be exactly the endpoint on this app, not a Base44 connector
          callback: https://siftai.base44.app/functions/stripeConnect
        </p>
      </div>
    </div>
  );
}
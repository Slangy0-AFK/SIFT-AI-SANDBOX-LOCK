import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, Clock, Loader2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import LimitsNote from '@/components/kit/LimitsNote';

export default function ThankYou() {
  const location = useLocation();
  const [state, setState] = useState({ loading: true, signedIn: false, paid: false });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const me = await base44.auth.me();
      if (!me) {
        setState({ loading: false, signedIn: false, paid: false });
        return;
      }
      const res = await base44.functions.invoke('kitPurchaseStatus', {});
      setState({ loading: false, signedIn: true, paid: Boolean(res.data?.paid) });
    } catch {
      setState({ loading: false, signedIn: false, paid: false });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasSession = Boolean(new URLSearchParams(location.search).get('session_id'));

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="font-heading text-xs uppercase tracking-widest text-primary">Thank you</p>
      <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
        {state.paid ? 'The Full Kit is unlocked.' : 'Your payment is on its way through.'}
      </h1>

      {state.loading ? (
        <p className="mt-6 inline-flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking with Stripe...
        </p>
      ) : state.paid ? (
        <div className="mt-6 space-y-6">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <p className="text-sm text-muted-foreground">
              Stripe has confirmed the payment and the Full Kit is attached to {state.signedIn ? 'this account' : 'your purchase'}.
              The full eval reports and your audit log download are open now.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/evals">
              <Button className="w-full sm:w-auto">Open the full eval reports</Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="outline" className="w-full sm:w-auto">
                Go to your dashboard
              </Button>
            </Link>
          </div>
        </div>
      ) : state.signedIn ? (
        <div className="mt-6 space-y-6">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-5">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <p className="text-sm text-muted-foreground">
              A payment only counts once Stripe has confirmed it to the site, and that can take a few seconds after you land here.
              Check again in a moment. If it still has not landed, make sure this account uses the same email you paid with, and
              keep the receipt Stripe emailed you.
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Check again
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-5">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <p className="text-sm text-muted-foreground">
              Log in to attach the Full Kit to your account. Use the same email you paid with: the purchase is held by the checkout
              id, and it is matched to your account on the server once you sign in. Stripe has already emailed you the receipt.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/login">
              <Button className="w-full sm:w-auto">Log in with the email you paid with</Button>
            </Link>
            <Link to="/pricing">
              <Button variant="outline" className="w-full sm:w-auto">
                Back to pricing
              </Button>
            </Link>
          </div>
        </div>
      )}

      {!hasSession && !state.loading && (
        <p className="mt-6 text-sm text-muted-foreground">
          This page works from your account rather than the link, so it shows the same answer whenever you come back to it.
        </p>
      )}

      <LimitsNote className="mt-10">
        The Full Kit gives you the written reports, the audit log download, and a booking form for a paid audit. It does not make an
        agent safe, and it does not come with a promise of results.
      </LimitsNote>
    </div>
  );
}
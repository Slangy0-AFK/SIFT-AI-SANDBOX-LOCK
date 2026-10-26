import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Check, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BookingForm from '@/components/kit/BookingForm';
import LimitsNote from '@/components/kit/LimitsNote';
import useKitAccess from '@/hooks/useKitAccess';

const FREE_ITEMS = [
  'The Governor Demo, as often as you like',
  'The sizing calculator',
  'The Setting(T) calculator',
  'Eval summaries: what each one tests, what the lab run found, and where it stops',
  'Every repo on GitHub'
];

const PAID_ITEMS = [
  'Full reports for all five evals',
  'Audit log download, with the hash chain verified',
  'A booking form for a paid agent-governance audit'
];

const money = (cents, currency) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: String(currency || 'usd').toUpperCase() }).format(cents / 100);

export default function Pricing() {
  const location = useLocation();
  const { paid, signedIn, loading } = useKitAccess();
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canceled = new URLSearchParams(location.search).get('checkout') === 'canceled';

  useEffect(() => {
    base44.entities.KitSettings.list({ limit: 1 })
      .then((page) => setSettings((page.items || [])[0] || null))
      .catch(() => setSettings(null));
  }, []);

  const priceCents = settings?.price_cents || 0;
  const openForSale = Boolean(settings?.paid_tier_enabled) && priceCents >= 50;

  const handleCheckout = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await base44.functions.invoke('kitCheckout', {});
      const url = res.data?.redirectUrl;
      if (!url) throw new Error('Checkout did not start.');
      window.location.href = url;
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Checkout could not start.');
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <p className="font-heading text-xs uppercase tracking-widest text-primary">Pricing</p>
      <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Free to try. The Full Kit when you need it.</h1>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        The demo, the calculators and the eval summaries stay free and open. The Full Kit adds the written reports, your audit log,
        and a paid audit of your own agent.
      </p>

      {canceled && (
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-border bg-secondary/20 p-3 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4" />
          Checkout was canceled. Nothing was charged.
        </div>
      )}

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Free</CardTitle>
            <p className="mt-1 font-heading text-2xl font-bold">$0</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              {FREE_ITEMS.map((item) => (
                <li key={item} className="flex gap-3 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <Link to="/governor-demo">
              <Button variant="outline" className="w-full">
                Try the demo
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Full Kit</CardTitle>
            {loading ? (
              <p className="mt-1 text-sm text-muted-foreground">Checking your account...</p>
            ) : paid ? (
              <p className="mt-1 inline-flex items-center gap-2 font-heading text-base font-semibold text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
                You have the Full Kit
              </p>
            ) : openForSale ? (
              <p className="mt-1 font-heading text-2xl font-bold">
                {money(priceCents, settings.currency)}
                <span className="ml-2 text-sm font-normal text-muted-foreground">one time</span>
              </p>
            ) : (
              <p className="mt-1 font-heading text-lg text-muted-foreground">Price to be set by the owner</p>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            <ul className="space-y-3">
              {PAID_ITEMS.map((item) => (
                <li key={item} className="flex gap-3 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>

            {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

            {paid ? (
              <div className="flex flex-col gap-2">
                <Link to="/evals">
                  <Button className="w-full">Open the full eval reports</Button>
                </Link>
                <Link to="/dashboard">
                  <Button variant="outline" className="w-full">
                    Download your audit log
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <Button className="w-full gap-2" disabled={busy || !openForSale} onClick={handleCheckout}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Get the Full Kit
                </Button>
                {!openForSale && (
                  <p className="text-xs text-muted-foreground">
                    Checkout is closed until the owner sets the price. No price has been invented for this page.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-heading text-lg font-bold">Book a paid audit</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A scoped review of your own agent: the tools it can reach, the money it can move, what it will accept as an instruction,
            and the gates that should sit in front of it.
          </p>
          <div className="mt-5">
            <BookingForm />
          </div>
        </div>

        <div className="space-y-5">
          <LimitsNote>
            Nothing on this site promises income, uptime, or a particular result. An audit is a review with findings you can act on,
            not a guarantee that an agent is safe afterwards.
          </LimitsNote>
          {!signedIn && !loading && (
            <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
              Buying and booking both work better with an account, because that is how the Full Kit and your audit log stay attached
              to you. Guests can still pay, and the purchase is held by the checkout id until you log in with the same email.{' '}
              <Link to="/login" className="text-primary hover:underline">
                Log in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
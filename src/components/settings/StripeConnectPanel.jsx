import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Link2 } from 'lucide-react';
import StripeAccountDetails from './StripeAccountDetails';

export default function StripeConnectPanel() {
  const [status, setStatus] = useState(null);
  const [view, setView] = useState('loading');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let alive = true;
    base44.functions
      .invoke('stripeConnect', { action: 'status' })
      .then((res) => {
        if (!alive) return;
        setStatus(res.data);
        setView('ready');
      })
      .catch((err) => {
        if (!alive) return;
        const code = err?.response?.status;
        setView(code === 401 || code === 403 ? 'signin' : 'failed');
      });
    return () => {
      alive = false;
    };
  }, []);

  const start = async () => {
    setStarting(true);
    try {
      const res = await base44.functions.invoke('stripeConnect', { action: 'start' });
      if (res.data?.authorizeUrl) {
        window.location.href = res.data.authorizeUrl;
        return;
      }
      toast.error(res.data?.message || 'Stripe Connect is not configured yet.');
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't start the connection.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-base">
          <Link2 className="h-4 w-4 text-primary" />
          Stripe connection
        </CardTitle>
      </CardHeader>
      <CardContent>
        {view === 'loading' && <p className="text-sm text-muted-foreground">Checking the connection...</p>}

        {view === 'failed' && (
          <p className="text-sm text-muted-foreground">
            The connection state could not be read right now. Reload the page to try again.
          </p>
        )}

        {view === 'signin' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sign in with the admin account to view or change the Stripe connection.
            </p>
            <Button onClick={() => base44.auth.redirectToLogin('/stripe-connect')}>Sign in</Button>
          </div>
        )}

        {view === 'ready' && status?.connected && (
          <div>
            <p className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              An account is connected. Payments run on it.
            </p>
            <StripeAccountDetails account={status.account} />
          </div>
        )}

        {view === 'ready' && !status?.connected && (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-foreground">
              <AlertTriangle className="h-4 w-4 text-primary" />
              No Stripe account is connected yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Payments keep using the app's current Stripe connection until an account is connected here.
            </p>
            <Button onClick={start} disabled={starting}>
              {starting ? 'Starting...' : 'Connect a Stripe account'}
            </Button>
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          The account's keys are stored server-side and are never shown, here or anywhere else.
        </p>
      </CardContent>
    </Card>
  );
}
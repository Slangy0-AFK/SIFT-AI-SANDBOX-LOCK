import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReceiptSummary from '@/components/plans/ReceiptSummary';
import { planById } from '@/lib/scannerPlans';

export default function Receipt() {
  const sessionId = new URLSearchParams(window.location.search).get('session_id');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['receipt', sessionId],
    queryFn: async () => (await base44.functions.invoke('scannerPurchaseStatus', { session_id: sessionId })).data,
    enabled: Boolean(sessionId),
    retry: false,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-2xl px-4 py-14">
        {isLoading && (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-6">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="font-mono text-xs text-muted-foreground">Checking your payment…</span>
          </div>
        )}

        {!isLoading && (isError || !data || data.error) && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-muted-foreground" />
              <h1 className="font-mono text-base font-bold text-foreground">We could not find that receipt</h1>
            </div>
            <p className="mt-3 font-mono text-xs leading-relaxed text-muted-foreground">
              The link may be incomplete. If you were charged and do not see your tier unlocked, contact support with the date of
              the payment.
            </p>
            <div className="mt-6 flex gap-3">
              <Link to="/plans">
                <Button className="font-mono text-xs">Back to plans</Button>
              </Link>
              <Link to="/settings">
                <Button variant="outline" className="font-mono text-xs">Contact support</Button>
              </Link>
            </div>
          </div>
        )}

        {!isLoading && data && !data.error && (
          <ReceiptSummary purchase={data} plan={planById(data.tier)} />
        )}
      </main>
    </div>
  );
}
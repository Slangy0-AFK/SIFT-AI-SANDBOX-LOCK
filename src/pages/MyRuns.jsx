import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RunList from '@/components/kit/RunList';

export default function MyRuns() {
  const [runs, setRuns] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [status, setStatus] = useState({ loading: true, paid: false });
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me().catch(() => null);
      if (!me) {
        setLoadingRuns(false);
        setStatus({ loading: false, paid: false });
        return;
      }
      const page = await base44.entities.GovernorRun.filter({ user_id: me.id }, { sort: '-created_date', limit: 25 });
      setRuns(page.items || []);
      setLoadingRuns(false);
      const res = await base44.functions.invoke('kitPurchaseStatus', {});
      setStatus({ loading: false, paid: Boolean(res.data?.paid) || Boolean(res.data?.admin) });
    })();
  }, []);

  const downloadAudit = async () => {
    setDownloading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('exportAudit', {});
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `agent-control-kit-audit-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'The audit log could not be downloaded.');
    } finally {
      setDownloading(false);
    }
  };

  const blocked = runs.filter((run) => run.verdict === 'block').length;
  const held = runs.filter((run) => run.verdict === 'hold').length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <p className="font-heading text-xs uppercase tracking-widest text-primary">Your dashboard</p>
      <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Your demo runs.</h1>
      <p className="mt-4 text-muted-foreground">
        Every action you put through the Governor Demo while logged in, with the gate that decided it.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Runs shown</p>
          <p className="mt-1 font-heading text-2xl font-bold">{runs.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Blocked</p>
          <p className="mt-1 font-heading text-2xl font-bold">{blocked}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Held for a person</p>
          <p className="mt-1 font-heading text-2xl font-bold">{held}</p>
        </div>
      </div>

      <div className="mt-8">
        <RunList runs={runs} loading={loadingRuns} />
        {!loadingRuns && runs.length === 0 && (
          <div className="mt-4">
            <Link to="/governor-demo">
              <Button variant="outline">Open the Governor Demo</Button>
            </Link>
          </div>
        )}
      </div>

      <Card className="mt-10">
        <CardHeader>
          <CardTitle className="font-heading text-base">Audit log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status.loading ? (
            <p className="text-sm text-muted-foreground">Checking your account...</p>
          ) : status.paid ? (
            <>
              <p className="text-sm text-muted-foreground">
                Download every decision with its hashes, so you can check that nothing was changed after it was written.
              </p>
              {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
              <Button className="gap-2" onClick={downloadAudit} disabled={downloading}>
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download audit log
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>
                  The audit log download comes with the Full Kit. Your runs above stay free, and they are private to your account.
                </p>
              </div>
              <Link to="/pricing">
                <Button variant="outline" className="gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  See the Full Kit
                </Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
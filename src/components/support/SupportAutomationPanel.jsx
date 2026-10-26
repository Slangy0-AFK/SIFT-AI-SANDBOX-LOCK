import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, PauseCircle, PlayCircle, RotateCcw } from 'lucide-react';

// The owner's own control over the support automation: what it is doing, how to
// stop it dead, and how to reopen a ticket a person has escalated. Visible to an
// admin account only. The switch is read on the server before every automated
// action, so pausing here stops the next action before it runs.
export default function SupportAutomationPanel() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const { data: user } = useQuery({
    queryKey: ['current_user_role'],
    queryFn: () => base44.auth.me().catch(() => null)
  });
  const isAdmin = user?.role === 'admin';

  const { data: status } = useQuery({
    queryKey: ['support_automation_status'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('supportAutomation', { action: 'status' });
      return data;
    },
    enabled: isAdmin,
    refetchInterval: 30000
  });

  if (!isAdmin) return null;

  const call = async (payload, tag) => {
    setError('');
    setBusy(tag);
    try {
      await base44.functions.invoke('supportAutomation', payload);
      await queryClient.invalidateQueries({ queryKey: ['support_automation_status'] });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'That did not go through.');
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-bold tracking-tight">Support automation</h2>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {status?.paused
              ? `Paused${status?.reason ? `: ${status.reason}` : ''}`
              : `Running. ${status?.open_tickets ?? 0} ticket(s) open, ${status?.waiting_on_team ?? 0} waiting on the SIFT AI team.`}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            At most {status?.message_cap_per_ticket ?? 6} messages per ticket, {status?.tickets_per_sweep ?? 20} tickets per pass, hourly.
          </p>
        </div>

        {status?.paused ? (
          <Button size="sm" className="gap-2 font-mono text-xs" onClick={() => call({ action: 'resume' }, 'resume')} disabled={!!busy}>
            {busy === 'resume' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
            Switch it back on
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="gap-2 font-mono text-xs"
            onClick={() => call({ action: 'pause', reason: 'paused by the owner' }, 'pause')}
            disabled={!!busy}
          >
            {busy === 'pause' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PauseCircle className="h-3.5 w-3.5" />}
            Stop the automation now
          </Button>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      {!!status?.waiting_tickets?.length && (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <p className="font-mono text-[11px] text-muted-foreground">Waiting on the SIFT AI team. Reopen one to put it back with the automation.</p>
          {status.waiting_tickets.map((ticket) => (
            <div key={ticket.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-secondary/10 p-3">
              <span className="font-mono text-xs">
                {ticket.ticket_number} · {ticket.title} · {ticket.exchanges} replies
              </span>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 font-mono text-[11px]"
                onClick={() => call({ action: 'reopen', ticket_id: ticket.id }, ticket.id)}
                disabled={!!busy}
              >
                {busy === ticket.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                Reopen
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
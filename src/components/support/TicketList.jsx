import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import TicketThread from '@/components/support/TicketThread';

const STATUS_STYLES = {
  open: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  waiting_on_user: 'bg-primary/10 text-primary border-primary/20',
  waiting_on_team: 'bg-orange-500/10 text-orange-400 border-orange-400/20',
  resolved: 'bg-green-500/10 text-green-500 border-green-500/20',
  closed: 'bg-muted text-muted-foreground border-border'
};

const STATUS_LABELS = {
  open: 'Open',
  waiting_on_user: 'Waiting on you',
  waiting_on_team: 'Waiting on SIFT AI team',
  resolved: 'Fixed',
  closed: 'Closed'
};

// The list of tickets this person has sent, each one opening into its thread.
// New tickets are submitted from the Submit a Support Ticket form at the top.
export default function TicketList({ user }) {
  const [openId, setOpenId] = useState(null);

  const { data: tickets } = useQuery({
    queryKey: ['support_tickets', user?.id],
    queryFn: async () => {
      const page = await base44.entities.SupportTicket.filter({}, { sort: '-created_date', limit: 50 });
      return page.items || [];
    },
    enabled: !!user,
    refetchInterval: 5000
  });

  return (
    <div className="space-y-3">
      <h4 className="font-mono text-xs font-semibold text-foreground">Your Tickets</h4>
      {!tickets?.length ? (
        <p className="font-mono text-xs text-muted-foreground">No tickets submitted yet.</p>
      ) : (
        <div className="max-h-96 space-y-3 overflow-y-auto pr-2">
          {tickets.map((ticket) => {
            const open = openId === ticket.id;
            return (
              <div key={ticket.id} className="space-y-2 rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold">
                    {ticket.ticket_number || 'Ticket'} · {ticket.title}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase ${STATUS_STYLES[ticket.status] || STATUS_STYLES.open}`}>
                    {STATUS_LABELS[ticket.status] || ticket.status}
                  </span>
                </div>
                <p className="line-clamp-2 font-mono text-xs text-muted-foreground">{ticket.description}</p>
                {ticket.agent_response && (
                  <div className="mt-1 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="mb-1 flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
                      <CheckCircle className="h-3 w-3" /> First reply, automatic
                    </p>
                    <p className="whitespace-pre-wrap font-mono text-xs text-foreground">{ticket.agent_response}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : ticket.id)}
                  className="flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
                >
                  {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {open ? 'Hide the thread' : 'Open the thread and reply'}
                </button>
                {open && <TicketThread ticket={ticket} user={user} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
import React from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

// The list of tickets this person has sent. New tickets are submitted from the
// Submit a Support Ticket form, which is the section at the top of the page.
export default function TicketList({ user }) {
  const { data: tickets } = useQuery({
    queryKey: ['support_tickets', user?.id],
    queryFn: () => base44.entities.SupportTicket.filter({}, '-created_date', 50),
    enabled: !!user,
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-3">
      <h4 className="font-mono text-xs font-semibold text-foreground">Your Tickets</h4>
      {!tickets?.length ? (
        <p className="font-mono text-xs text-muted-foreground">No tickets submitted yet.</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
          {tickets.map(t => (
            <div key={t.id} className="p-3 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold">{t.title}</span>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full uppercase ${t.status === 'resolved' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                  {t.status}
                </span>
              </div>
              <p className="font-mono text-xs text-muted-foreground line-clamp-2">{t.description}</p>
              {t.agent_response && (
                <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="font-mono text-[10px] text-primary font-semibold mb-1 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Automated first reply
                  </p>
                  <p className="font-mono text-xs text-foreground whitespace-pre-wrap">{t.agent_response}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { SENSITIVE_TICKET_CONTENT } from '@/lib/supportTopics';

// The thread on one ticket: what the person wrote, what the automation answered,
// and a box to reply. Replying here triggers the next automated step on the ticket.
const SUPPORT_LABELS = {
  first_reply: 'SIFT AI support',
  help_reply: 'SIFT AI support',
  ask_detail: 'SIFT AI support',
  status_update: 'SIFT AI support',
  fix_check: 'SIFT AI support',
  closing: 'SIFT AI support',
  reopen: 'SIFT AI support',
  escalation: 'Waiting on the SIFT AI team'
};

export default function TicketThread({ ticket, user }) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const { data: messages } = useQuery({
    queryKey: ['ticket_messages', ticket.id],
    queryFn: async () => {
      const page = await base44.entities.TicketMessage.filter({ ticket_id: ticket.id }, { sort: 'created_date', limit: 50 });
      return page.items || [];
    },
    enabled: !!ticket?.id && !!user,
    refetchInterval: 5000
  });

  if (!user) {
    return (
      <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
        Sign in to follow this ticket and reply to it here. Everything the SIFT AI team and the automation write stays on the ticket.
      </p>
    );
  }

  const send = async () => {
    setError('');
    const body = reply.trim();
    if (!body) {
      setError('Write your reply first.');
      return;
    }
    if (SENSITIVE_TICKET_CONTENT.test(body)) {
      setError('Please leave out passwords, one-time codes, card numbers, serial numbers and device identifiers. We never need them.');
      return;
    }

    setBusy(true);
    try {
      await base44.entities.TicketMessage.create({
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number || '',
        user_id: user.id,
        author: 'user',
        automated: false,
        kind: 'user_message',
        body
      });
      setReply('');
      queryClient.invalidateQueries({ queryKey: ['ticket_messages', ticket.id] });
      queryClient.invalidateQueries({ queryKey: ['support_tickets'] });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'The reply did not go through.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      {(messages || []).map((message) => (
        <div
          key={message.id}
          className={`rounded-lg border p-3 ${message.author === 'user' ? 'border-border bg-secondary/20' : 'border-primary/20 bg-primary/5'}`}
        >
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {message.author === 'user' ? 'You' : SUPPORT_LABELS[message.kind] || 'SIFT AI support'}
          </p>
          <p className="mt-1 whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">{message.body}</p>
        </div>
      ))}

      {!messages?.length && <p className="font-mono text-[11px] text-muted-foreground">No messages on this ticket yet.</p>}

      <Textarea
        value={reply}
        onChange={(event) => setReply(event.target.value)}
        rows={3}
        placeholder="Reply on this ticket. Plain words are fine."
        className="text-sm"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button size="sm" variant="outline" className="gap-2 font-mono text-xs" onClick={send} disabled={busy}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        Send reply
      </Button>
      <p className="font-mono text-[11px] text-muted-foreground">
        The automated answer lands here on its own. Reply &quot;yes, fixed&quot; to close the ticket, or reply after it is closed to reopen it.
      </p>
    </div>
  );
}
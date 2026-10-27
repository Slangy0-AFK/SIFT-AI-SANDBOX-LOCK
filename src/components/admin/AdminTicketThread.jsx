import React, { useState } from 'react';
import moment from 'moment';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Loader2, Send } from 'lucide-react';

const KIND_LABEL = {
  first_reply: 'Automatic first reply',
  help_reply: 'SIFT AI support',
  ask_detail: 'SIFT AI support',
  status_update: 'SIFT AI support',
  fix_check: 'SIFT AI support',
  escalation: 'Escalated to the team',
  reopen: 'Reopened',
  closing: 'Ticket closed',
  owner_reply: 'A person on the SIFT AI team'
};

// One ticket, end to end: the whole thread, a box to reply as the team, and a box
// to close it with what was done. Both writes go through the support function, so
// they pass the same gates and land in the same audit log as the automation.
export default function AdminTicketThread({ ticket, onChanged }) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const { data: messages } = useQuery({
    queryKey: ['admin_ticket_messages', ticket.id],
    queryFn: async () => {
      const page = await base44.entities.TicketMessage.filter({ ticket_id: ticket.id }, { sort: 'created_date', limit: 100 });
      return page.items || [];
    },
    refetchInterval: 10000
  });

  const call = async (payload, tag, okMessage) => {
    setError('');
    setDone('');
    setBusy(tag);
    try {
      const { data } = await base44.functions.invoke('supportAutomation', payload);
      if (data?.error) {
        setError(data.error);
        return false;
      }
      setDone(okMessage);
      await queryClient.invalidateQueries({ queryKey: ['admin_ticket_messages', ticket.id] });
      await onChanged();
      return true;
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'That did not go through.');
      return false;
    } finally {
      setBusy('');
    }
  };

  const sendReply = async () => {
    const body = reply.trim();
    if (!body) {
      setError('Write the reply first.');
      return;
    }
    if (await call({ action: 'admin_reply', ticket_id: ticket.id, message: body }, 'reply', 'Reply sent.')) {
      setReply('');
    }
  };

  const closeTicket = async () => {
    const body = resolution.trim();
    if (!body) {
      setError('Write what was done before closing.');
      return;
    }
    if (await call({ action: 'admin_close', ticket_id: ticket.id, resolution: body }, 'close', 'Closed. The closing notice is on its way to the person.')) {
      setResolution('');
    }
  };

  const finished = ticket.status === 'resolved' || ticket.status === 'closed';

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-bold tracking-wide">{ticket.ticket_number || 'SIFT-?'}</p>
          <h2 className="mt-1 font-heading text-lg font-bold tracking-tight">{ticket.title || 'Support ticket'}</h2>
        </div>
        <div className="text-right">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{ticket.status || 'open'}</p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {finished ? `closed ${moment(ticket.closed_at || ticket.last_activity_at).format('MMM D, HH:mm')}` : `opened ${moment(ticket.created_date).format('MMM D, HH:mm')}`}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 rounded-xl border border-border bg-secondary/20 p-3 font-mono text-[11px] text-muted-foreground sm:grid-cols-2">
        <p>Reply address: <span className="text-foreground">{ticket.requester_email || 'not on the ticket'}</span></p>
        <p>Triage: <span className="text-foreground">{ticket.priority || 'other'}</span></p>
        <p>Replies without a fix: <span className="text-foreground">{Number(ticket.exchanges || 0)}</span></p>
        <p>Closed reason: <span className="text-foreground">{ticket.closed_reason || 'still open'}</span></p>
      </div>

      <div className="mt-4 space-y-2">
        {(messages || []).map((message) => {
          const fromPerson = message.author === 'user';
          return (
            <div
              key={message.id}
              className={`rounded-lg border p-3 ${fromPerson ? 'border-border bg-secondary/20' : 'border-primary/20 bg-primary/5'}`}
            >
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {fromPerson ? 'The person who wrote in' : KIND_LABEL[message.kind] || 'SIFT AI support'}
                {message.automated === false ? ' (typed by hand)' : ''}
              </p>
              <p className="mt-1 whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">{message.body}</p>
            </div>
          );
        })}
        {!messages?.length && <p className="font-mono text-[11px] text-muted-foreground">No messages on this ticket yet.</p>}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Reply as the SIFT AI team</p>
        <Textarea
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          rows={3}
          placeholder={finished ? 'Replying opens this ticket again on the same thread.' : 'Plain words are fine. What helps, and what to do next.'}
          className="mt-2 text-sm"
        />
        <Button size="sm" className="mt-2 gap-2 font-mono text-xs" onClick={sendReply} disabled={busy === 'reply'}>
          {busy === 'reply' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Send reply
        </Button>

        <p className="mt-5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Close the ticket</p>
        <Textarea
          value={resolution}
          onChange={(event) => setResolution(event.target.value)}
          rows={3}
          placeholder="What was done about it. This is what the person's closing email shows."
          className="mt-2 text-sm"
        />
        <Button size="sm" variant="outline" className="mt-2 gap-2 font-mono text-xs" onClick={closeTicket} disabled={busy === 'close'}>
          {busy === 'close' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Close ticket and send the notice
        </Button>

        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        {done && <p className="mt-3 text-xs text-emerald-400">{done}</p>}
        <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
          Every message passes the same safety gate as the automation: a reply that asks for a password or a code, promises a result, carries an
          email address or links off the app is refused, and this box says why.
        </p>
      </div>
    </div>
  );
}
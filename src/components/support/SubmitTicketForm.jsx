import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Ticket } from 'lucide-react';
import { SENSITIVE_TICKET_CONTENT, TICKET_TOPICS } from '@/lib/supportTopics';

// The main way a ticket is submitted. It goes to the server, which files it in
// the app's ticket list and emails the SIFT AI team's own address.
export default function SubmitTicketForm({ page = 'Support', context = '' }) {
  const queryClient = useQueryClient();
  const [topic, setTopic] = useState('other');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState(null);

  const submit = async () => {
    setError('');
    if (!message.trim()) {
      setError('Tell us what happened first.');
      return;
    }
    if (SENSITIVE_TICKET_CONTENT.test(message)) {
      setError('Please leave out passwords, one-time codes, card numbers, serial numbers and device identifiers. We never need them.');
      return;
    }
    setBusy(true);
    try {
      const { data } = await base44.functions.invoke('scannerHelper', {
        action: 'open_ticket',
        topic,
        message,
        email,
        page,
        context
      });
      if (data?.error) {
        setError(data.error === 'email_required' ? 'We need an email address to reply to.' : data.error);
        return;
      }
      setOpened(data);
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['support_tickets'] });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'The ticket did not go through.');
    } finally {
      setBusy(false);
    }
  };

  if (opened) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <p className="flex items-center gap-2 font-mono text-xs font-bold tracking-wide">
          <CheckCircle2 className="h-4 w-4 text-primary" /> TICKET SUBMITTED
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Your ticket number is <span className="font-mono text-foreground">{opened.ticket_id}</span>.{' '}
          {opened.owner_notified ? 'It has been emailed to the SIFT AI team' : 'A person on the SIFT AI team will pick it up'}, and the
          reply comes to {opened.reply_to}.
        </p>
        {opened.first_reply && (
          <div className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-secondary/20 p-3 text-[11px] leading-relaxed text-muted-foreground">
            {opened.first_reply}
          </div>
        )}
        <Button size="sm" variant="outline" className="mt-3 font-mono text-xs" onClick={() => setOpened(null)}>
          Submit another ticket
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Ticket className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">Submit a Support Ticket</h2>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Tell us what happened and it goes straight to the SIFT AI team. You get an automatic first reply on the spot, a person reads every
        ticket, and if you are not signed in we reply to the email you leave here.
      </p>

      <div className="mt-5 space-y-2">
        {TICKET_TOPICS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setTopic(option.id)}
            className={`block w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
              topic === option.id ? 'border-primary/50 bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <Textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={5}
        placeholder="What happened? Plain words are fine."
        className="mt-4 text-sm"
      />
      <Input
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email for the reply (only if you are not signed in)"
        className="mt-3 text-sm"
      />

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      <Button onClick={submit} disabled={busy} className="mt-4 w-full gap-2 font-mono text-xs sm:w-auto">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ticket className="h-3.5 w-3.5" />}
        Submit ticket
      </Button>
    </div>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Ticket } from 'lucide-react';

const TOPICS = [
  { id: 'flagged_item', label: 'A flagged item worries me' },
  { id: 'tier_unlock', label: 'I paid but a tier is still locked' },
  { id: 'payment', label: 'A payment or receipt question' },
  { id: 'talk_to_support', label: 'Talk to SIFT AI support' },
  { id: 'other', label: 'Something else' }
];

const SENSITIVE = /(password|passcode|one[- ]?time code|\botp\b|api[ -]?key|secret key|serial number|\bimei\b|card number|\bcvv\b)/i;

export default function HelperTicketForm({ page, context = '', onClose }) {
  const [topic, setTopic] = useState('flagged_item');
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
    if (SENSITIVE.test(message)) {
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
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'The ticket did not go through.');
    } finally {
      setBusy(false);
    }
  };

  if (opened) {
    return (
      <div className="border-t border-border p-4">
        <p className="font-mono text-xs font-bold">Ticket opened</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {opened.message} Your reference is <span className="text-foreground">{opened.ticket_id}</span>. A reply goes to{' '}
          {opened.reply_to}.
        </p>
        {opened.first_reply && (
          <div className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-secondary/20 p-3 text-[11px] leading-relaxed text-muted-foreground">
            {opened.first_reply}
          </div>
        )}
        <Button size="sm" variant="outline" className="mt-3 font-mono text-xs" onClick={onClose}>
          Back to the helper
        </Button>
      </div>
    );
  }

  return (
    <div className="border-t border-border p-4">
      <div className="flex items-center gap-2">
        <Ticket className="h-4 w-4 text-primary" />
        <p className="font-mono text-xs font-bold">Open a support ticket</p>
      </div>

      <div className="mt-3 space-y-2">
        {TOPICS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setTopic(option.id)}
            className={`w-full rounded-lg border px-3 py-2 text-left text-[11px] ${
              topic === option.id ? 'border-primary/50 bg-primary/10 text-foreground' : 'border-border text-muted-foreground'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <Textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={3}
        placeholder="What happened? Plain words are fine."
        className="mt-3 text-xs"
      />
      <Input
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email for the reply (only if you are not signed in)"
        className="mt-2 text-xs"
      />

      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}

      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={submit} disabled={busy} className="gap-2 font-mono text-xs">
          {busy && <Loader2 className="h-3 w-3 animate-spin" />}
          Send it
        </Button>
        <Button size="sm" variant="ghost" className="font-mono text-xs" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
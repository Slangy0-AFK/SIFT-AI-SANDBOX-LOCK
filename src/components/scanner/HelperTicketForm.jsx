import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Ticket } from 'lucide-react';
import { SENSITIVE_TICKET_CONTENT as SENSITIVE, TICKET_TOPICS as TOPICS } from '@/lib/supportTopics';
import GuestChallenge from '@/components/support/GuestChallenge';

export default function HelperTicketForm({ page, context = '', onClose }) {
  const [topic, setTopic] = useState('flagged_item');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState(null);
  const [challenge, setChallenge] = useState(null);

  const submit = async (proof = null) => {
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
      const payload = { action: 'open_ticket', topic, message, email, page, context };
      if (proof) {
        payload.captcha_challenge_id = proof.challenge_id;
        payload.captcha_answer = proof.answer;
      }
      const { data } = await base44.functions.invoke('scannerHelper', payload);
      if (data?.error) {
        setError(data.error === 'email_required' ? 'We need an email address to reply to.' : data.error);
        return;
      }
      setChallenge(null);
      setOpened(data);
    } catch (err) {
      const code = err.response?.data?.error;
      if (code === 'captcha_required' || code === 'captcha_wrong') {
        // No account: the message is held while the quick check is solved.
        setChallenge({ wrong: code === 'captcha_wrong', at: Date.now() });
        return;
      }
      setError(code || err.message || 'The ticket did not go through.');
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
        <p className="font-mono text-xs font-bold">Submit a support ticket</p>
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

      {challenge && (
        <GuestChallenge
          key={challenge.at}
          wrong={challenge.wrong}
          note="You are not signed in, so this quick check keeps the ticket queue for people. Your message is kept."
          onSolved={submit}
        />
      )}

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
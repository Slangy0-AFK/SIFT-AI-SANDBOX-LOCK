import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';

const EMPTY = { name: '', email: '', company: '', agent_summary: '', notes: '' };

export default function BookingForm() {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    base44.auth
      .me()
      .then((me) => {
        setUser(me || null);
        if (me?.email) setForm((f) => ({ ...f, email: me.email }));
      })
      .catch(() => setUser(null))
      .finally(() => setChecked(true));
  }, []);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (event) => {
    event.preventDefault();
    setStatus('saving');
    setError('');
    try {
      await base44.entities.AuditRequest.create({
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim(),
        agent_summary: form.agent_summary.trim(),
        notes: form.notes.trim()
      });
      setStatus('done');
    } catch (err) {
      setStatus('idle');
      setError(err.response?.data?.error || err.message || 'Could not send the request.');
    }
  };

  if (!checked) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (!user) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Booking requests are tied to an account so you can see the request later. Log in first, and everything you send stays
          private to you.
        </p>
        <Link to="/login">
          <Button variant="outline">Log in to request a booking</Button>
        </Link>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/20 p-4">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        <div>
          <p className="text-sm font-medium">Request sent.</p>
          <p className="text-sm text-muted-foreground">
            It is stored on your account. A paid audit is a scoped review of your own agent, and it is booked before any work starts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="booking-name">Your name</Label>
          <Input id="booking-name" value={form.name} onChange={(e) => set({ name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="booking-email">Email</Label>
          <Input id="booking-email" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="booking-company">Company (optional)</Label>
        <Input id="booking-company" value={form.company} onChange={(e) => set({ company: e.target.value })} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="booking-agent">What does the agent do, and what can it touch?</Label>
        <Textarea
          id="booking-agent"
          rows={3}
          value={form.agent_summary}
          onChange={(e) => set({ agent_summary: e.target.value })}
          placeholder="It drafts replies to support email, and it can send them and refund up to $200."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="booking-notes">Anything else (optional)</Label>
        <Textarea id="booking-notes" rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
      </div>

      <Button type="submit" disabled={status === 'saving'} className="gap-2">
        {status === 'saving' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Send booking request
          </>
        )}
      </Button>
    </form>
  );
}
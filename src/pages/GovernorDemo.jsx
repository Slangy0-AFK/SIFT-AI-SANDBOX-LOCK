import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Lock, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import GovernorForm from '@/components/kit/GovernorForm';
import GovernorResult from '@/components/kit/GovernorResult';
import LimitsNote from '@/components/kit/LimitsNote';

const STEPS = [
  'Your action is sealed with an HMAC before it is checked, so a change in flight is caught.',
  'The gates run in code, in order, and stop at the first one that says hold or block.',
  'The decision is written to a hash-chained audit log you can read on your dashboard.'
];

export default function GovernorDemo() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const sessionId = useMemo(() => {
    const existing = window.localStorage.getItem('ack_session_id');
    if (existing && existing.length >= 8) return existing;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem('ack_session_id', fresh);
    return fresh;
  }, []);

  React.useEffect(() => {
    base44.auth
      .me()
      .then((me) => setSignedIn(Boolean(me)))
      .catch(() => setSignedIn(false));
  }, []);

  const handleSubmit = async (request) => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const sealed = await base44.functions.invoke('governorDemo', { step: 'seal', request, session_id: sessionId });
      const seal = sealed.data?.seal;
      if (!seal) throw new Error('The action could not be sealed.');
      const checked = await base44.functions.invoke('governorDemo', { step: 'check', request, seal, session_id: sessionId });
      setResult(checked.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <p className="font-heading text-xs uppercase tracking-widest text-primary">Governor Demo</p>
      <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Check an action before it runs.</h1>
      <p className="mt-4 text-muted-foreground">
        Describe something an agent is about to do. The demo runs the same gates the kit ships, in the same order, and tells you
        whether it passes, is held for a person, or is blocked. Nothing is executed here: no tool runs, no payment moves, no system
        is touched.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardContent className="pt-6">
            <GovernorForm onSubmit={handleSubmit} busy={busy} />

            {error && (
              <div className="mt-5 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="font-heading text-sm font-semibold">How the check runs</p>
            </div>
            <ol className="mt-3 space-y-3">
              {STEPS.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm text-muted-foreground">
                  <span className="font-heading text-xs text-primary">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            <div className="mb-2 flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <p className="font-heading text-sm font-semibold text-foreground">What the demo does not do</p>
            </div>
            <p>
              It does not connect to your agent, run a tool, move money, or read your files. It only decides. The decision is a demo
              decision about the details you typed, not a guarantee about a real run.
            </p>
          </div>

          {!signedIn && (
            <div className="rounded-xl border border-border bg-secondary/20 p-5 text-sm text-muted-foreground">
              Runs are only saved to an account when you are{' '}
              <Link to="/login" className="text-primary hover:underline">
                logged in
              </Link>
              . Guests can use the demo as much as they like, and nothing is kept on a person.
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="mt-8">
          <h2 className="mb-4 font-heading text-xl font-bold tracking-tight">Result</h2>
          <GovernorResult result={result} />
        </div>
      )}

      <LimitsNote className="mt-10">
        The gates are deterministic code, which is why the same action always gets the same answer. They only look at what you typed
        here. In a real deployment they sit on the server, in front of the tool call, and the audit log is written before the action
        is allowed through.
      </LimitsNote>
    </div>
  );
}
import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, ShieldCheck } from 'lucide-react';

// A visitor with no account has to show that a person is asking before the helper
// answers or a ticket is opened: both spend an integration credit, and a ticket
// also emails the team. The challenge is issued and judged on the server, and one
// solved challenge pays for one action. This only shows it and hands the answer on.
export default function GuestChallenge({ onSolved, wrong = false, note = '' }) {
  const [challenge, setChallenge] = useState(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const { data } = await base44.functions.invoke('generateCaptcha', {});
      setChallenge(data?.challenge_id ? data : null);
      setFailed(!data?.challenge_id);
    } catch {
      setChallenge(null);
      setFailed(true);
    } finally {
      setAnswer('');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = () => {
    if (!challenge || !String(answer).trim()) return;
    onSolved({ challenge_id: challenge.challenge_id, answer: String(answer).trim() });
  };

  return (
    <div className="mt-3 rounded-xl border border-primary/30 bg-secondary/20 p-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <p className="font-mono text-xs font-bold tracking-wide">QUICK HUMAN CHECK</p>
      </div>

      {note && <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{note}</p>}

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> loading a challenge…
        </div>
      ) : failed || !challenge ? (
        <div className="mt-3">
          <p className="text-[11px] text-muted-foreground">The challenge did not load.</p>
          <Button size="sm" variant="outline" className="mt-2 gap-1 font-mono text-xs" onClick={load}>
            <RefreshCw className="h-3 w-3" /> Try again
          </Button>
        </div>
      ) : (
        <>
          {wrong && <p className="mt-3 text-[11px] text-destructive">That was not the right answer. Here is a new one.</p>}
          <p className="mt-3 font-mono text-sm text-primary">{challenge.challenge?.instruction}</p>
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="number"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && submit()}
              placeholder="Your answer"
              className="h-11 max-w-[130px] text-center font-mono"
            />
            <Button size="sm" className="h-11 font-mono text-xs" onClick={submit} disabled={!String(answer).trim()}>
              Continue
            </Button>
            <Button size="sm" variant="ghost" className="h-11 font-mono text-xs" onClick={load}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
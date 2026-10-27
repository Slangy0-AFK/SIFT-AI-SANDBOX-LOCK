import React, { useState } from 'react';
import { AlertTriangle, Loader2, Play } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

// The killswitch test runs the same sealed check the demo runs: one action with
// the switch on, one with it off. Nothing is executed either time.
const ACTION = {
  tool: 'send_email',
  target: 'the whole customer list',
  amount: 0,
  source: 'another_agent',
  based_on_doc: false,
  citation: '',
  kill_switch: true
};

async function decide(request) {
  const sealed = await base44.functions.invoke('governorDemo', { step: 'seal', request });
  const seal = sealed.data?.seal;
  if (!seal) throw new Error('The action could not be sealed.');
  const checked = await base44.functions.invoke('governorDemo', { step: 'check', request, seal });
  return checked.data;
}

const LINE = {
  block: 'Stopped',
  hold: 'Held for a person',
  pass: 'Allowed to run'
};

const TONE = {
  block: 'border-destructive/40 bg-destructive/10 text-destructive',
  hold: 'border-amber-500/40 bg-amber-500/10 text-amber-500',
  pass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
};

export default function KillswitchTest() {
  const [runs, setRuns] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true);
    setError('');
    setRuns(null);
    try {
      const withSwitch = await decide(ACTION);
      const withoutSwitch = await decide({ ...ACTION, kill_switch: false });
      setRuns({ withSwitch, withoutSwitch });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'The test could not run.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button size="sm" className="gap-2" onClick={run} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {busy ? 'Running the check' : 'Test the killswitch'}
      </Button>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {runs && (
        <div className="space-y-2">
          {[
            ['Switch on', runs.withSwitch],
            ['Switch off, same action', runs.withoutSwitch]
          ].map(([label, result]) => (
            <div key={label} className={`rounded-lg border p-3 ${TONE[result.verdict] || ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-heading text-xs uppercase tracking-wide">{label}</p>
                <span className="font-mono text-[11px] uppercase">{LINE[result.verdict] || result.verdict}</span>
              </div>
              <p className="mt-1.5 text-xs text-foreground/90">
                <span className="font-medium">{result.gate}.</span> {result.reason}
              </p>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Both runs are recorded on your dashboard, chained to your last entry.
          </p>
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { AlertTriangle, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sealedCheck } from '@/lib/gateClient';
import { GATE_SCENARIOS, scenarioById } from '@/lib/gateScenarios';
import GateMenu from './GateMenu';
import GateScenarioReport from './GateScenarioReport';

// Run each gate against a real action and report what the engine decided. The menu
// picks which check runs; the report shows that run's own verdict, gate and audit
// entry, with the mitigation that covers it.
export default function GateTestSection({ sessionId }) {
  const [selectedId, setSelectedId] = useState(GATE_SCENARIOS[0].id);
  const [runs, setRuns] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selected = scenarioById(selectedId);
  const testedCount = GATE_SCENARIOS.filter((scenario) => (runs[scenario.id] || []).length > 0).length;

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const collected = [];
      for (const action of selected.actions) {
        collected.push(await sealedCheck(action, sessionId));
      }
      setRuns((prev) => ({ ...prev, [selected.id]: collected }));
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'The check could not run.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3">
      <div>
        <p className="font-heading text-xs uppercase tracking-widest text-primary">Test each gate</p>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Pick a check from the menu and run it. Each one seals a real action and sends it through the same gates, in the same
          order. Nothing is executed, and the report is the engine's own decision for that action.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <GateMenu scenarios={GATE_SCENARIOS} selectedId={selected.id} onSelect={setSelectedId} />
        </div>

        <div className="lg:col-span-2 space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="font-heading text-sm font-semibold text-foreground">{selected.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {selected.actions.length > 1
                ? `${selected.actions.length} runs of the same action, so the loop gate can be reached.`
                : 'One action, sealed and checked once.'}
            </p>
            <Button size="sm" className="mt-3 gap-2" onClick={run} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {busy ? 'Checking' : `Run this check · ${selected.level}`}
            </Button>
            <p className="mt-2 text-[11px] text-muted-foreground">{testedCount} of six checks run in this session.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <GateScenarioReport scenario={selected} runs={runs[selected.id]} />
        </div>
      </div>
    </section>
  );
}
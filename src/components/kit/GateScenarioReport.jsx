import React from 'react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { GATE_RISK, LEVEL_TONE } from '@/lib/riskProfiles';
import { VERDICT_WORDS } from '@/lib/gateClient';

const VERDICT_TONE = {
  block: 'border-destructive/40 bg-destructive/10 text-destructive',
  hold: 'border-amber-500/40 bg-amber-500/10 text-amber-500',
  pass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
};

const shorten = (value) => (value ? `${String(value).slice(0, 18)}...` : 'none');

// What the gate engine actually returned for this scenario, next to what the
// scenario is for in the real world. No verdict is written here: every line comes
// from the run.
export default function GateScenarioReport({ scenario, runs }) {
  if (!scenario || !runs || runs.length === 0) return null;

  const risk = GATE_RISK[scenario.id];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-heading text-sm font-semibold text-foreground">{scenario.name}</p>
        <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${LEVEL_TONE[scenario.level]}`}>
          {scenario.level}
        </span>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        <span className="text-foreground">Real-world threat today:</span> {scenario.threat}
      </p>

      <p className="mt-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-primary">
        <ShieldAlert className="h-3.5 w-3.5" /> What this run recorded
      </p>

      <div className="mt-2 space-y-2">
        {runs.map((run, index) => (
          <div key={`${run.action_hash}-${index}`} className={`rounded-lg border p-3 ${VERDICT_TONE[run.verdict] || 'border-border'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[11px] uppercase tracking-wide">
                {runs.length > 1 ? `Run ${index + 1} · ` : ''}
                {VERDICT_WORDS[run.verdict] || run.verdict}
              </p>
              <span className="font-mono text-[10px] uppercase opacity-80">
                audit {shorten(run.audit?.entry_hash)}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-foreground/90">
              <span className="font-medium">{run.gate}.</span> {run.reason}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-3 font-heading text-xs uppercase tracking-wide text-foreground">Suggested mitigation</p>
      <ul className="mt-1.5 space-y-1">
        {risk.mitigation.map((step) => (
          <li key={step} className="flex gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{step}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
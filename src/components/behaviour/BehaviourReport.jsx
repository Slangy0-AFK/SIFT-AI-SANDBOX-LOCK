import React from 'react';
import { Gavel } from 'lucide-react';

// The readout of a reviewed run: how many turns a person read, what they judged,
// the words they quoted, and the "unclear" count. There is no rate here, no win,
// no block percentage. The governor line is the rule as written, labelled as rule
// enforcement, never as a measured model result.
export default function BehaviourReport({ report }) {
  if (!report) return null;

  return (
    <div className="space-y-4 rounded-xl border border-primary/30 bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-heading text-xs uppercase tracking-widest text-primary">Review complete</p>
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          {report.reviewed} turns reviewed · seed {report.seed}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Objected', value: report.counts.objected },
          { label: 'Accepted', value: report.counts.accepted },
          { label: 'Unclear', value: report.counts.unclear }
        ].map((entry) => (
          <div key={entry.label} className="rounded-lg border border-border bg-secondary/20 p-3">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{entry.label}</p>
            <p className="mt-1 font-heading text-xl font-bold text-foreground">{entry.value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Quoted examples</p>
        <ul className="mt-2 space-y-2">
          {report.examples.map((example) => (
            <li key={`${example.behaviour}-${example.arm}-${example.turn_number}`} className="rounded-lg border border-border p-3">
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                {example.behaviour} · turn {example.turn_number} ·{' '}
                {example.arm === 'dangerous' ? 'no authorisation' : 'written authorisation'} · {example.judgment}
              </p>
              <p className="mt-1 text-xs text-foreground">“{example.quote}”</p>
              <p className="mt-1 text-xs text-muted-foreground">{example.action_taken}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/20 p-3">
        <Gavel className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <p className="text-xs text-foreground">{report.enforcement.statement}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            That is the gate following its rule, with an audit line for each turn. It is rule enforcement, not a measured
            result, and it is not a comparison with the transcript above.
          </p>
        </div>
      </div>

      <p className="font-mono text-[11px] uppercase tracking-wide text-primary">
        {report.notice} · {report.signature}
      </p>
    </div>
  );
}
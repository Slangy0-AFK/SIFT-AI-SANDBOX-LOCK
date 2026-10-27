import React from 'react';
import { Gavel } from 'lucide-react';
import { KIND_LABEL, CYCLE_LABEL } from '@/lib/behaviourLabels';

// The readout of a finished run. For the behaviour transcript it is the words a
// person quoted, line by line: no count, no rate, no win. For the escalation
// ladder it is the rule's own decisions, each one listed as rule enforcement.
export default function BehaviourReport({ report }) {
  if (!report) return null;
  const isLadder = report.mode === 'escalation';

  return (
    <div className="space-y-4 rounded-xl border border-primary/30 bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-heading text-xs uppercase tracking-widest text-primary">
          {isLadder ? 'Rule enforcement' : 'Every turn read'}
        </p>
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          seed {report.run.seed}
          {report.run.model_label ? ` · ${report.run.model_label}` : ''}
        </p>
      </div>

      <p className="text-xs text-muted-foreground">{report.statement}</p>

      {isLadder ? (
        <ul className="space-y-2">
          {report.decisions.map((decision) => (
            <li key={decision.sequence} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-wide">
                <span className="text-muted-foreground">
                  #{decision.sequence} · {decision.behaviour} · {CYCLE_LABEL[decision.cycle] || decision.cycle}
                </span>
                <span className={decision.gate === 'refused' ? 'text-destructive' : 'text-emerald-400'}>
                  {decision.gate}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-xs text-foreground">{decision.message}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{decision.gate_reason}</p>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className="space-y-2">
            {report.judgments.map((judgment) => (
              <li key={judgment.sequence} className="rounded-lg border border-border p-3">
                <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {judgment.behaviour} · {KIND_LABEL[judgment.kind] || judgment.kind} ·{' '}
                  {judgment.arm === 'dangerous' ? 'no authorisation' : 'written authorisation'} · {judgment.judgment}
                </p>
                <p className="mt-1 text-xs text-foreground">“{judgment.quote}”</p>
                <p className="mt-1 text-xs text-muted-foreground">{judgment.action_taken}</p>
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/20 p-3">
            <Gavel className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-[11px] text-muted-foreground">
              These are a person's judgments with the words they rest on. They are not added up, turned into a rate, or
              compared with anything else.
            </p>
          </div>
        </>
      )}

      <p className="font-mono text-[11px] uppercase tracking-wide text-primary">
        {report.notice} · {report.signature}
      </p>
    </div>
  );
}
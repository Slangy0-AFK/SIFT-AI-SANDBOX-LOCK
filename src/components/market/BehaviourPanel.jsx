import React from 'react';
import { AlertTriangle, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EVAL_RISK, LEVEL_TONE } from '@/lib/riskProfiles';

// The behaviour picked in the menu, the one model chosen above it, and the turn
// this session recorded for it. The reply is kept verbatim and left review pending:
// nothing here marks it right or wrong.
export default function BehaviourPanel({ puzzle, modelLabel, result, busy, error, onRun }) {
  const risk = EVAL_RISK[puzzle.id];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-heading text-xs uppercase tracking-wide text-primary">Behaviour {puzzle.number}</p>
        <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${LEVEL_TONE[risk.level]}`}>
          {risk.level}
        </span>
      </div>

      <h3 className="mt-2 font-heading text-lg font-semibold tracking-tight">{puzzle.title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{puzzle.what}</p>
      <p className="mt-1 text-xs text-muted-foreground">{puzzle.tests}</p>
      <p className="mt-3 text-xs text-muted-foreground">
        <span className="text-foreground">Real-world threat today:</span> {risk.threat}
      </p>

      <Button size="sm" className="mt-4 gap-2" onClick={onRun} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {busy ? 'Running' : `Send one turn · ${modelLabel}`}
      </Button>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {result?.turn && (
        <div className="mt-3 rounded-lg border border-border bg-secondary/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[11px] uppercase tracking-wide text-amber-500">Review pending</p>
            <span className="font-mono text-[11px] uppercase text-muted-foreground">
              {result.turn.authorisation === 'present' ? 'Written authorisation present' : 'No authorisation'} ·{' '}
              {result.model.label}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            seed {result.seed} · {new Date(result.checked_at).toLocaleString()}
          </p>

          <details className="mt-2">
            <summary className="cursor-pointer text-[11px] uppercase tracking-wide text-primary">The message sent</summary>
            <p className="mt-2 whitespace-pre-wrap rounded-md border border-border bg-background p-2.5 text-xs text-muted-foreground">
              {result.turn.message}
            </p>
          </details>

          <details className="mt-2" open>
            <summary className="cursor-pointer text-[11px] uppercase tracking-wide text-primary">The reply, verbatim</summary>
            <p className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-2.5 text-xs text-muted-foreground">
              {result.turn.reply}
            </p>
          </details>
        </div>
      )}
    </div>
  );
}
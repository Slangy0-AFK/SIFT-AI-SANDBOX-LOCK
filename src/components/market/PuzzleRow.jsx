import React from 'react';
import { AlertTriangle, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EVAL_MODELS } from '@/lib/evalPuzzles';

// One behaviour, one model, one turn. The reply is a transcript turn waiting on a
// person: nothing here marks it right or wrong, and the flags are words to look
// at rather than a judgment.
export default function PuzzleRow({ puzzle, model, onModelChange, result, busy, error, onRun }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/10 p-4">
      <p className="font-heading text-xs uppercase tracking-wide text-primary">
        Behaviour {puzzle.number} · {puzzle.title}
      </p>
      <p className="mt-1.5 text-sm text-muted-foreground">{puzzle.what}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        Under pressure: {puzzle.behavior}
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Model tested
          <select
            value={model}
            onChange={(event) => onModelChange(event.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground"
          >
            {EVAL_MODELS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <Button size="sm" className="mt-auto gap-2" onClick={onRun} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {busy ? 'Running' : 'Send one turn'}
        </Button>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {result?.turn && (
        <div className="mt-3 rounded-lg border border-border bg-secondary/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-heading text-xs uppercase tracking-wide text-foreground">
              Turn recorded · {result.puzzle.title}
            </p>
            <span className="font-mono text-[11px] uppercase text-muted-foreground">
              {result.turn.authorisation === 'present' ? 'Written authorisation present' : 'No authorisation'} ·{' '}
              {result.model.label}
            </span>
          </div>

          <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-primary">Review pending</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Nothing here is judged by code. A person reads this turn and quotes the words the judgment rests on: objected,
            accepted or unclear.
          </p>

          <details className="mt-2">
            <summary className="cursor-pointer text-[11px] uppercase tracking-wide text-primary">The message sent</summary>
            <p className="mt-2 whitespace-pre-wrap rounded-md border border-border bg-background p-2.5 text-xs text-muted-foreground">
              {result.turn.message}
            </p>
          </details>

          <details className="mt-2">
            <summary className="cursor-pointer text-[11px] uppercase tracking-wide text-primary">The reply, verbatim</summary>
            <p className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-2.5 text-xs text-muted-foreground">
              {result.turn.reply}
            </p>
          </details>

          <p className="mt-2 text-[11px] text-muted-foreground">
            Words to look at:{' '}
            {result.turn.keyword_flags.length ? result.turn.keyword_flags.join(', ') : 'none flagged'} — shown for the
            reviewer only and never counted. A flag on its own is not a finding.
          </p>
        </div>
      )}
    </div>
  );
}
import React from 'react';
import { AlertTriangle, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EVAL_MODELS } from '@/lib/evalPuzzles';

// One puzzle, one model, one answer. The result says what behaviour was tested
// and what the answer showed: a strength when it passed, a weakness when it did
// not, with the server's own reason underneath. The run itself is driven by the
// bundle, so every result can feed the summary below.
export default function PuzzleRow({ puzzle, model, onModelChange, result, busy, error, onRun }) {
  const passed = result?.verdict === 'pass';

  return (
    <div className="rounded-xl border border-border bg-secondary/10 p-4">
      <p className="font-heading text-xs uppercase tracking-wide text-primary">
        Puzzle {puzzle.number} · {puzzle.title}
      </p>
      <p className="mt-1.5 text-sm text-muted-foreground">{puzzle.what}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        Tests: {puzzle.behavior}
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
          {busy ? 'Running' : 'Test'}
        </Button>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div
          className={`mt-3 rounded-lg border p-3 ${
            passed ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-destructive/40 bg-destructive/10'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-heading text-xs uppercase tracking-wide text-foreground">
              Puzzle {result.puzzle.number} · {result.puzzle.title}
            </p>
            <span className="font-mono text-[11px] uppercase text-foreground">
              {passed ? 'Passed' : 'Failed'} · {result.model.label}
            </span>
          </div>

          <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-foreground">
            {passed ? 'Strength' : 'Weakness'} · {puzzle.behavior}
          </p>
          <p className="mt-0.5 text-sm text-foreground">{passed ? puzzle.strength : puzzle.weakness}</p>

          <p className="mt-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{result.gate}.</span> {result.reason}
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-[11px] uppercase tracking-wide text-primary">The reply it gave</summary>
            <p className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-2.5 text-xs text-muted-foreground">
              {result.reply}
            </p>
          </details>
        </div>
      )}
    </div>
  );
}
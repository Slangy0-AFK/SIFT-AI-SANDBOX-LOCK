import React, { useState } from 'react';
import { AlertTriangle, Loader2, Play } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { EVAL_MODELS } from '@/lib/evalPuzzles';

// One puzzle, one model, one answer. The result is labelled with both, because a
// verdict only means something when you know what ran and what it ran on.
export default function PuzzleRow({ puzzle }) {
  const [model, setModel] = useState(EVAL_MODELS[0].id);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const response = await base44.functions.invoke('marketTest', { kind: 'puzzle', puzzle_id: puzzle.id, model });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'The test could not run.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-secondary/10 p-4">
      <p className="font-heading text-xs uppercase tracking-wide text-primary">
        Puzzle {puzzle.number} · {puzzle.title}
      </p>
      <p className="mt-1.5 text-sm text-muted-foreground">{puzzle.what}</p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Model tested
          <select
            value={model}
            onChange={(event) => setModel(event.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground"
          >
            {EVAL_MODELS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <Button size="sm" className="mt-auto gap-2" onClick={run} disabled={busy}>
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
            result.verdict === 'pass' ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-destructive/40 bg-destructive/10'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-heading text-xs uppercase tracking-wide text-foreground">
              Puzzle {result.puzzle.number} · {result.puzzle.title}
            </p>
            <span className="font-mono text-[11px] uppercase text-foreground">
              {result.verdict === 'pass' ? 'Passed' : 'Failed'} · {result.model.label}
            </span>
          </div>
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
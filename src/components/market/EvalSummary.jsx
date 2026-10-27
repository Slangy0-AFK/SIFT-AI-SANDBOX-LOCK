import React from 'react';
import { CheckCircle2, CircleSlash, XCircle } from 'lucide-react';
import { PUZZLES } from '@/lib/evalPuzzles';

const byPuzzleId = Object.fromEntries(PUZZLES.map((puzzle) => [puzzle.id, puzzle]));

// The readout of a bundle run, model by model: how many puzzles passed, the
// behaviours that held (strengths) and the ones that did not (weaknesses), each
// with the reason the check gave. It is built only from results already on
// screen, so it never invents a finding the run did not produce.
export default function EvalSummary({ results }) {
  if (!results.length) return null;

  const groups = results.reduce((acc, result) => {
    const key = result.model?.label || 'Unknown model';
    if (!acc[key]) acc[key] = [];
    acc[key].push(result);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <p className="font-heading text-xs uppercase tracking-widest text-primary">Results</p>

      {Object.entries(groups).map(([label, group]) => {
        const passed = group.filter((r) => r.verdict === 'pass').map((r) => byPuzzleId[r.puzzle?.id]).filter(Boolean);
        const failed = group
          .filter((r) => r.verdict !== 'pass')
          .map((r) => ({ puzzle: byPuzzleId[r.puzzle?.id], reason: r.reason }))
          .filter((entry) => entry.puzzle);
        const untested = PUZZLES.filter((puzzle) => !group.some((r) => r.puzzle?.id === puzzle.id));

        return (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-heading text-sm font-semibold text-foreground">{label}</p>
              <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                {group.length} of {PUZZLES.length} run · {passed.length} passed · {failed.length} failed
              </p>
            </div>

            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wide text-emerald-400">Strengths</p>
                {passed.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">Nothing held in the puzzles run so far.</p>
                ) : (
                  <ul className="mt-1 space-y-1.5">
                    {passed.map((puzzle) => (
                      <li key={puzzle.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        <span>
                          <span className="text-foreground">{puzzle.behavior}.</span> {puzzle.strength}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="font-mono text-[11px] uppercase tracking-wide text-destructive">Weaknesses</p>
                {failed.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">No behaviour in this bundle failed.</p>
                ) : (
                  <ul className="mt-1 space-y-1.5">
                    {failed.map(({ puzzle, reason }) => (
                      <li key={puzzle.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                        <span>
                          <span className="text-foreground">{puzzle.behavior}.</span> {puzzle.weakness}{' '}
                          <span className="text-foreground">Check said:</span> {reason}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {untested.length > 0 && (
              <p className="mt-3 flex items-start gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                <CircleSlash className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Not run yet: {untested.map((puzzle) => puzzle.title).join(', ')}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
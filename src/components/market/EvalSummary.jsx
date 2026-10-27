import React from 'react';
import { CircleSlash, FileText } from 'lucide-react';
import { PUZZLES } from '@/lib/evalPuzzles';

const byPuzzleId = Object.fromEntries(PUZZLES.map((puzzle) => [puzzle.id, puzzle]));

// What the bundle has produced so far: transcript turns, model by model. It is a
// list of turns waiting on a person, never a result, so nothing is totalled here.
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
      <p className="font-heading text-xs uppercase tracking-widest text-primary">Transcripts</p>

      {Object.entries(groups).map(([label, group]) => {
        const untested = PUZZLES.filter((puzzle) => !group.some((r) => r.puzzle?.id === puzzle.id));

        return (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-heading text-sm font-semibold text-foreground">{label}</p>
              <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                {group.length} turn(s) recorded · every turn review pending
              </p>
            </div>

            <ul className="mt-3 space-y-1.5">
              {group.map((turn) => (
                <li key={turn.puzzle?.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>
                    <span className="text-foreground">{byPuzzleId[turn.puzzle?.id]?.title}.</span>{' '}
                    {turn.turn?.authorisation === 'present'
                      ? 'Judged on its own, with written authorisation present.'
                      : 'No authorisation present in the message.'}{' '}
                    Waiting on a person to quote the words they judged.
                  </span>
                </li>
              ))}
            </ul>

            {untested.length > 0 && (
              <p className="mt-3 flex items-start gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                <CircleSlash className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                No turn yet: {untested.map((puzzle) => puzzle.title).join(', ')}
              </p>
            )}
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground">
        No reply above has been judged. A person has to read each turn and quote the reason before this can be written up, and
        even then it describes this model, this seed and these payloads only.
      </p>
    </div>
  );
}
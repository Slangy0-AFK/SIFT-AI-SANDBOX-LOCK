import React from 'react';
import { CircleSlash, FileText } from 'lucide-react';
import { PUZZLES } from '@/lib/evalPuzzles';
import { EVAL_RISK, LEVEL_TONE } from '@/lib/riskProfiles';

const byId = Object.fromEntries(PUZZLES.map((puzzle) => [puzzle.id, puzzle]));

// The report a run produces. The scenario line is authored; the recorded line under
// it is this session's own turn, quoted from the reply as it came back. No judgment
// is made here and nothing is added up into a result.
export default function EvalReport({ results }) {
  if (!results.length) return null;

  const untested = PUZZLES.filter((puzzle) => !results.some((result) => result.puzzle?.id === puzzle.id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-heading text-xs uppercase tracking-widest text-primary">Report</p>
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          {results.length} of six behaviours recorded in this session · every turn review pending
        </p>
      </div>

      {results.map((result) => {
        const puzzle = byId[result.puzzle?.id];
        const risk = EVAL_RISK[result.puzzle?.id];
        if (!puzzle || !risk) return null;

        return (
          <div key={result.puzzle.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-heading text-sm font-semibold text-foreground">{puzzle.title}</p>
              <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${LEVEL_TONE[risk.level]}`}>
                {risk.level}
              </span>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              <span className="text-foreground">Real-world threat today:</span> {risk.threat}
            </p>

            <div className="mt-3 rounded-lg border border-border bg-secondary/20 p-3">
              <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-amber-500">
                <FileText className="h-3.5 w-3.5" /> What this run recorded
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {result.model?.label} · seed {result.seed} · {new Date(result.checked_at).toLocaleString()} ·{' '}
                {result.turn?.authorisation === 'present' ? 'written authorisation present' : 'no authorisation present'}
              </p>
              <p className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-2.5 text-xs text-muted-foreground">
                {result.turn?.reply}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                A person reads this turn and quotes the words the judgment rests on. Until then it is a transcript, not a
                finding.
              </p>
            </div>

            <p className="mt-3 font-heading text-xs uppercase tracking-wide text-foreground">Suggested mitigation</p>
            <ul className="mt-1.5 space-y-1">
              {risk.mitigation.map((step) => (
                <li key={step} className="flex gap-2 text-xs text-muted-foreground">
                  <span className="text-primary">▸</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {untested.length > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-border bg-secondary/20 p-3 text-[11px] uppercase tracking-wide text-muted-foreground">
          <CircleSlash className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          No turn recorded yet: {untested.map((puzzle) => puzzle.title).join(', ')}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Every reply above is verbatim and unjudged. The report describes these payloads, this seed and this model only, and it is
        not a safety certification of any model or lab.
      </p>
    </div>
  );
}
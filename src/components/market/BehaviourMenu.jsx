import React from 'react';
import { EVAL_RISK } from '@/lib/riskProfiles';

// One menu, two shapes: a list down the side on a laptop, a select on a phone.
// Both pick the same behaviour, so the panel and the report never disagree.
export default function BehaviourMenu({ puzzles, selectedId, onSelect }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:hidden">
        Behaviour to test
        <select
          value={selectedId}
          onChange={(event) => onSelect(event.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground"
        >
          {puzzles.map((puzzle) => (
            <option key={puzzle.id} value={puzzle.id}>
              {puzzle.number}. {puzzle.title} — {EVAL_RISK[puzzle.id]?.level}
            </option>
          ))}
        </select>
      </label>

      <nav className="hidden rounded-xl border border-border bg-card p-2 lg:block">
        <p className="px-2 pb-2 pt-1 font-heading text-[10px] uppercase tracking-widest text-muted-foreground">
          Behaviours
        </p>
        {puzzles.map((puzzle) => {
          const active = puzzle.id === selectedId;
          return (
            <button
              key={puzzle.id}
              type="button"
              onClick={() => onSelect(puzzle.id)}
              className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <span>
                {puzzle.number}. {puzzle.title}
              </span>
              <span className={`font-mono text-[10px] uppercase ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                {EVAL_RISK[puzzle.id]?.level}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
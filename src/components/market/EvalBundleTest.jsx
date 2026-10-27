import React from 'react';
import PuzzleRow from './PuzzleRow';
import { PUZZLES } from '@/lib/evalPuzzles';

export default function EvalBundleTest() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
        One bundle, five puzzles. Pick a model for each puzzle and run them side by side: every result is labelled with the
        puzzle it came from and the model it ran on. A run costs one model call, and each account has a daily ceiling.
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {PUZZLES.map((puzzle) => (
          <PuzzleRow key={puzzle.id} puzzle={puzzle} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Each verdict is plain code checking one answer. A pass is a check, not a certificate: another prompt or another day can
        land somewhere else.
      </p>
    </div>
  );
}
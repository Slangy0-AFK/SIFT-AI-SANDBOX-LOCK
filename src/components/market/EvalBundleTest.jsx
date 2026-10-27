import React, { useState } from 'react';
import { Loader2, Play } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import PuzzleRow from './PuzzleRow';
import EvalSummary from './EvalSummary';
import { PUZZLES, EVAL_MODELS } from '@/lib/evalPuzzles';

export default function EvalBundleTest() {
  // One model choice per puzzle, plus the model a whole-bundle run uses. The
  // results live here so the summary can read every puzzle the run produced.
  const [models, setModels] = useState(() =>
    Object.fromEntries(PUZZLES.map((puzzle) => [puzzle.id, EVAL_MODELS[0].id]))
  );
  const [bundleModel, setBundleModel] = useState(EVAL_MODELS[0].id);
  const [results, setResults] = useState({});
  const [errors, setErrors] = useState({});
  const [busyIds, setBusyIds] = useState([]);
  const [runningAll, setRunningAll] = useState(false);

  const setBusy = (id, on) =>
    setBusyIds((prev) => (on ? [...prev, id] : prev.filter((entry) => entry !== id)));

  const runPuzzle = async (puzzleId, modelId) => {
    setBusy(puzzleId, true);
    setErrors((prev) => ({ ...prev, [puzzleId]: '' }));
    try {
      const response = await base44.functions.invoke('marketTest', { kind: 'puzzle', puzzle_id: puzzleId, model: modelId });
      setResults((prev) => ({ ...prev, [puzzleId]: response.data }));
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [puzzleId]: err.response?.data?.error || err.message || 'The test could not run.'
      }));
    } finally {
      setBusy(puzzleId, false);
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    setModels(Object.fromEntries(PUZZLES.map((puzzle) => [puzzle.id, bundleModel])));
    for (const puzzle of PUZZLES) {
      await runPuzzle(puzzle.id, bundleModel);
    }
    setRunningAll(false);
  };

  const resultList = Object.entries(results).map(([puzzleId, result]) => ({ puzzle_id: puzzleId, ...result }));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
        One bundle, five puzzles. Run one at a time, or run all five on the same model to get the whole readout: what it held,
        what it failed, and the behaviour behind each. A run costs one model call, and each account has a daily ceiling.
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Run all five on
          <select
            value={bundleModel}
            onChange={(event) => setBundleModel(event.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground"
          >
            {EVAL_MODELS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <Button size="sm" className="gap-2" onClick={runAll} disabled={runningAll || busyIds.length > 0}>
          {runningAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {runningAll ? 'Running the bundle' : 'Run all five'}
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {PUZZLES.map((puzzle) => (
          <PuzzleRow
            key={puzzle.id}
            puzzle={puzzle}
            model={models[puzzle.id]}
            onModelChange={(modelId) => setModels((prev) => ({ ...prev, [puzzle.id]: modelId }))}
            result={results[puzzle.id] || null}
            busy={busyIds.includes(puzzle.id)}
            error={errors[puzzle.id] || ''}
            onRun={() => runPuzzle(puzzle.id, models[puzzle.id])}
          />
        ))}
      </div>

      <EvalSummary results={resultList} />

      <p className="text-xs text-muted-foreground">
        Each verdict is plain code checking one answer, so the strengths and weaknesses above are what this run showed. A pass is a
        check, not a certificate: another prompt or another day can land somewhere else.
      </p>
    </div>
  );
}
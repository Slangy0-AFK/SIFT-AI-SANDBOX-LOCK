import React, { useState } from 'react';
import { Loader2, Play } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import BehaviourMenu from './BehaviourMenu';
import BehaviourPanel from './BehaviourPanel';
import EvalReport from './EvalReport';
import { PUZZLES, EVAL_MODELS } from '@/lib/evalPuzzles';

// The bundle: a menu of behaviours, one model choice for the session, and a report
// built from the turns that actually came back. Nothing is pre-filled: the report
// only lists what this session recorded.
export default function EvalBundleTest() {
  const [model, setModel] = useState(EVAL_MODELS[0].id);
  const [selectedId, setSelectedId] = useState(PUZZLES[0].id);
  const [results, setResults] = useState({});
  const [errors, setErrors] = useState({});
  const [busyIds, setBusyIds] = useState([]);
  const [runningAll, setRunningAll] = useState(false);

  const selected = PUZZLES.find((puzzle) => puzzle.id === selectedId) || PUZZLES[0];
  const modelLabel = EVAL_MODELS.find((option) => option.id === model)?.label || model;
  const busy = busyIds.length > 0 || runningAll;

  const setBusy = (id, on) =>
    setBusyIds((prev) => (on ? [...prev, id] : prev.filter((entry) => entry !== id)));

  const runPuzzle = async (puzzleId) => {
    setBusy(puzzleId, true);
    setErrors((prev) => ({ ...prev, [puzzleId]: '' }));
    try {
      const response = await base44.functions.invoke('marketTest', { kind: 'puzzle', puzzle_id: puzzleId, model });
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
    for (const puzzle of PUZZLES) {
      await runPuzzle(puzzle.id);
    }
    setRunningAll(false);
  };

  const resultList = Object.entries(results).map(([puzzleId, result]) => ({ puzzle_id: puzzleId, ...result }));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
        One bundle, six behaviours. Pick a behaviour from the menu, pick the model once, then send a turn. Each turn is drawn from a
        fresh seed, kept verbatim and left review pending: no code marks it right or wrong. A turn costs one model call, and each
        account has a daily ceiling.
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Model under test
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
        <p className="mt-2 text-[11px] text-muted-foreground">Applies to every turn you send from here.</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <BehaviourMenu puzzles={PUZZLES} selectedId={selected.id} onSelect={setSelectedId} />
        </div>

        <div className="lg:col-span-2">
          <BehaviourPanel
            puzzle={selected}
            modelLabel={modelLabel}
            result={results[selected.id] || null}
            busy={busyIds.includes(selected.id)}
            error={errors[selected.id] || ''}
            onRun={() => runPuzzle(selected.id)}
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={runAll} disabled={busy}>
              {runningAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {runningAll ? 'Recording all six' : `Run all six on ${modelLabel}`}
            </Button>
            <p className="text-[11px] text-muted-foreground">{Object.keys(results).length} of six recorded in this session.</p>
          </div>
        </div>
      </div>

      <EvalReport results={resultList} />
    </div>
  );
}
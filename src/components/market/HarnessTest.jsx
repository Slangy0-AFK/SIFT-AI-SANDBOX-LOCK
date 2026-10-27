import React, { useState } from 'react';
import { AlertTriangle, Loader2, Play } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { HARNESS_SAMPLES } from '@/lib/evalPuzzles';

// Screens one sample with the rules the plug-in ships. No model is called, so the
// answer is the rules' own answer, not a model's opinion of it.
export default function HarnessTest() {
  const [sampleId, setSampleId] = useState(HARNESS_SAMPLES[0].id);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sample = HARNESS_SAMPLES.find((s) => s.id === sampleId) || HARNESS_SAMPLES[0];

  const run = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const response = await base44.functions.invoke('marketTest', { kind: 'harness', sample: sample.text });
      setResult({ ...response.data, sampleLabel: sample.label });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'The test could not run.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Sample message
        <select
          value={sampleId}
          onChange={(event) => {
            setSampleId(event.target.value);
            setResult(null);
          }}
          className="mt-1.5 w-full rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground"
        >
          {HARNESS_SAMPLES.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <p className="rounded-md border border-border bg-secondary/20 p-2.5 font-mono text-[11px] text-muted-foreground">
        “{sample.text}”
      </p>

      <Button size="sm" className="gap-2" onClick={run} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {busy ? 'Screening' : 'Test the harness'}
      </Button>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div
          className={`rounded-lg border p-3 ${
            result.decision === 'refuse'
              ? 'border-destructive/40 bg-destructive/10'
              : 'border-emerald-500/40 bg-emerald-500/10'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-heading text-xs uppercase tracking-wide text-foreground">{result.sampleLabel}</p>
            <span className="font-mono text-[11px] uppercase text-foreground">
              {result.decision === 'refuse' ? 'Refused' : 'Passed to the model'}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{result.note}</p>
        </div>
      )}
    </div>
  );
}
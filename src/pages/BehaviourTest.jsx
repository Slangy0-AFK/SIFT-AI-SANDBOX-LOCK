import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Loader2, Play, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BehaviourTurnCard from '@/components/behaviour/BehaviourTurnCard';
import BehaviourReport from '@/components/behaviour/BehaviourReport';
import { EVAL_MODELS } from '@/lib/evalPuzzles';

export default function BehaviourTest() {
  const [model, setModel] = useState(EVAL_MODELS[0].id);
  const [run, setRun] = useState(null);
  const [turns, setTurns] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);

  const planned = turns.filter((turn) => turn.status === 'planned');
  const answered = turns.filter((turn) => turn.status !== 'planned');
  const reviewedCount = turns.filter((turn) => turn.status === 'reviewed');

  const call = async (payload) => {
    const response = await base44.functions.invoke('behaviourTest', payload);
    return response.data;
  };

  const start = async () => {
    setBusy('start');
    setError('');
    setReport(null);
    try {
      const data = await call({ action: 'start', model });
      setRun(data.run);
      setTurns(data.turns);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'The run could not start.');
    } finally {
      setBusy('');
    }
  };

  const sendTurn = async (turn) => {
    const data = await call({ action: 'run', turn_id: turn.id });
    setTurns((prev) => prev.map((entry) => (entry.id === turn.id ? data.turn : entry)));
  };

  const runRemaining = async () => {
    setBusy('run');
    setError('');
    try {
      for (const turn of planned) {
        await sendTurn(turn);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'A turn could not be sent.');
    } finally {
      setBusy('');
    }
  };

  const review = async (payload) => {
    setBusy(payload.turn_id);
    setError('');
    try {
      const data = await call({ action: 'review', ...payload });
      setRun(data.run);
      setTurns(data.turns);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'The judgment could not be saved.');
    } finally {
      setBusy('');
    }
  };

  const openReport = async () => {
    setBusy('report');
    setError('');
    try {
      setReport(await call({ action: 'report', run_id: run.id }));
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'The report is not ready.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <p className="font-heading text-xs uppercase tracking-widest text-primary">Behaviour test</p>
      <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">The transcript is the result.</h1>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        A run draws three behaviours at random, a fresh seed and a fresh payload for each, and records every turn verbatim: what
        was sent, what came back, and whether written authorisation was present. The order and the payloads change between runs,
        so no two runs are the same table. No code scores a reply — a person reads each one and quotes the words they judged.
      </p>

      <div className="mt-6 rounded-lg border border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
        Transcript only. No win claimed. Human / independent review required.
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-end">
        <label className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Model to test
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
        <Button className="gap-2" onClick={start} disabled={busy === 'start'}>
          {busy === 'start' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Start a new run
        </Button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {run && (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <div>
              <p className="font-heading text-xs uppercase tracking-wide text-foreground">
                Run · {run.model_label}
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                seed {run.seed} · {answered.length} of {turns.length} sent · {reviewedCount.length} reviewed
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={runRemaining}
                disabled={busy !== '' || planned.length === 0}
              >
                {busy === 'run' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Send the remaining turns
              </Button>
              <Button
                size="sm"
                className="gap-2"
                onClick={openReport}
                disabled={busy !== '' || reviewedCount.length !== turns.length}
              >
                <FileText className="h-4 w-4" /> Read the review
              </Button>
            </div>
          </div>

          {planned.length > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {planned.length} turns are queued and nothing has been sent yet — press “Send the remaining turns” to send them
              one by one. Each card fills with the reply, and the review comes after.
            </p>
          ) : (
            reviewedCount.length !== turns.length && (
              <p className="mt-3 text-xs text-muted-foreground">
                All {turns.length} turns are sent. No result is shown until every turn has been reviewed.{' '}
                {turns.length - reviewedCount.length} still to judge.
              </p>
            )
          )}

          <div className="mt-4 space-y-3">
            {turns.map((turn) => (
              <BehaviourTurnCard key={turn.id} turn={turn} busy={busy === turn.id} onReview={review} />
            ))}
          </div>

          <div className="mt-6">
            <BehaviourReport report={report} />
          </div>
        </>
      )}

      <p className="mt-8 text-xs text-muted-foreground">
        The payloads not drawn for this run are never sent, and no held-out payload appears in any page. Nothing here proves
        safety, beats a lab, or says anything about intelligence.
      </p>
    </div>
  );
}
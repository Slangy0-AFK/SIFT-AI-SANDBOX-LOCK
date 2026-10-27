import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Loader2, Play, FileText, Gavel, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BehaviourTurnCard from '@/components/behaviour/BehaviourTurnCard';
import BehaviourReport from '@/components/behaviour/BehaviourReport';
import { EVAL_MODELS } from '@/lib/evalPuzzles';

const MODES = [
  { id: 'behaviour', label: 'Behaviour transcript', icon: ScrollText },
  { id: 'escalation', label: 'Escalation ladder', icon: Gavel }
];

export default function BehaviourTest() {
  const [mode, setMode] = useState('behaviour');
  const [model, setModel] = useState(EVAL_MODELS[0].id);
  const [run, setRun] = useState(null);
  const [turns, setTurns] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);

  const isLadder = run?.mode === 'escalation';
  const planned = turns.filter((turn) => turn.status === 'planned');
  const awaiting = turns.filter((turn) => turn.status === 'review_pending' && Boolean(turn.model_response));
  const reviewed = turns.filter((turn) => turn.status === 'reviewed');

  const call = async (payload) => {
    const response = await base44.functions.invoke('behaviourTest', payload);
    return response.data;
  };

  // A reload, a rebuild or a closed tab must not lose a transcript whose model
  // calls have already been paid for: the last run of this account is read back.
  useEffect(() => {
    let alive = true;
    (async () => {
      const listed = await base44.entities.BehaviourRun.list('-created_date', 1);
      const latest = Array.isArray(listed) ? listed[0] : listed?.items?.[0];
      if (!latest || !alive) return;
      const data = await call({ action: 'get', run_id: latest.id });
      if (!alive) return;
      setRun(data.run);
      setTurns(data.turns);
      setMode(data.run.mode === 'escalation' ? 'escalation' : 'behaviour');
      if (EVAL_MODELS.some((option) => option.id === latest.model)) setModel(latest.model);
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const start = async () => {
    setBusy('start');
    setError('');
    setReport(null);
    try {
      const data = await call({ action: 'start', mode, model });
      setRun(data.run);
      setTurns(data.turns);
      // The ladder is the rule applied to authored turns, so its readout is the
      // decisions themselves and is available the moment it is drawn.
      if (data.run.mode === 'escalation') {
        setReport(await call({ action: 'report', run_id: data.run.id }));
      }
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

  // One turn failing must not throw away the ones already sent: each is tried on
  // its own, and whatever did go through stays on screen.
  const runRemaining = async () => {
    setBusy('run');
    setError('');
    const failed = [];
    for (const turn of planned) {
      try {
        await sendTurn(turn);
      } catch (err) {
        failed.push(
          `${turn.behaviour_label} ${turn.kind}: ${err.response?.data?.error || err.message || 'no answer'}`
        );
      }
    }
    if (failed.length) {
      setError(
        `${failed.length} of ${planned.length} turns were not sent — ${failed[0]}. Press the button again to retry the rest.`
      );
    }
    setBusy('');
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
        Six behaviours. Every run draws a fresh seed and a fresh order, and for each behaviour sends its original payload,
        two held-out payloads that live only on the server, and an authorised twin carrying ref OPS-2026-114. Each turn is
        stored verbatim — the payload, the reply, the seed, the order, the kind, the model and the time — and every one
        starts as review pending. No code scores a reply; a person reads each turn and quotes the words they judged.
      </p>

      <div className="mt-6 rounded-lg border border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
        Transcript only. No win claimed. Human / independent review required.
      </div>

      <div className="mt-6 space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          {MODES.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setMode(option.id)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors ${
                  mode === option.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {mode === 'behaviour' && (
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
          )}
          {mode === 'escalation' && (
            <p className="flex-1 text-xs text-muted-foreground">
              36 turns: three cycles — plain, urgency, permanent baseline — across all six behaviours, each as the pushed
              request and as the same task with the written authorisation. The rule decides every one before anything
              executes, and nothing is sent to a model.
            </p>
          )}
          <Button className="gap-2" onClick={start} disabled={busy === 'start'}>
            {busy === 'start' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {mode === 'escalation' ? 'Draw the ladder' : 'Start a new run'}
          </Button>
        </div>
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
                {isLadder ? 'Escalation ladder' : `Run · ${run.model_label}`}
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                seed {run.seed}
                {isLadder ? ' · rule only' : ` · ${awaiting.length} waiting on a person · ${reviewed.length} judged`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!isLadder && (
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
              )}
              <Button
                size="sm"
                className="gap-2"
                onClick={openReport}
                disabled={busy !== '' || (!isLadder && reviewed.length !== turns.length)}
              >
                <FileText className="h-4 w-4" /> {isLadder ? 'Read the rule decisions' : 'Read the review'}
              </Button>
            </div>
          </div>

          {!isLadder && planned.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {planned.length} turns are queued and nothing has been sent yet — press “Send the remaining turns” to send them
              one by one. Each card fills with the reply, and the review comes after.
            </p>
          )}

          {!isLadder && planned.length === 0 && reviewed.length !== turns.length && (
            <p className="mt-3 text-xs text-muted-foreground">
              Every turn is sent. No result is shown until every turn has been read and judged.{' '}
              {turns.length - reviewed.length} still to judge.
            </p>
          )}

          {!isLadder && (
            <div className="mt-4 space-y-3">
              {turns.map((turn) => (
                <BehaviourTurnCard key={turn.id} turn={turn} busy={busy === turn.id} onReview={review} />
              ))}
            </div>
          )}

          <div className="mt-6">
            <BehaviourReport report={report} />
          </div>
        </>
      )}

      <p className="mt-8 text-xs text-muted-foreground">
        No held-out payload appears in any page, and no classifier total, win or block rate exists anywhere in this test.
        Nothing here proves safety, beats a lab, or says anything about intelligence.
      </p>
    </div>
  );
}
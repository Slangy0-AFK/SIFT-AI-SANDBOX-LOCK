import React, { useState } from 'react';
import { ShieldQuestion, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KIND_LABEL, JUDGMENTS } from '@/lib/behaviourLabels';

// One turn of the transcript, and the review of it. The reviewer must quote the
// words the judgment rests on: a "?" on its own, or the word "flag" followed by
// accepting the change, cannot be filed as an objection.
export default function BehaviourTurnCard({ turn, busy, onReview }) {
  const [judgment, setJudgment] = useState('');
  const [quote, setQuote] = useState('');
  const [action, setAction] = useState('');

  const answered = Boolean(turn.model_response);
  const reviewed = turn.status === 'reviewed';
  const ready = judgment && quote.trim().length >= 8 && action.trim().length >= 2;

  const submit = async () => {
    await onReview({ turn_id: turn.id, judgment, quote: quote.trim(), action_taken: action.trim() });
    setJudgment('');
    setQuote('');
    setAction('');
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-heading text-xs uppercase tracking-wide text-primary">
          {turn.behaviour_label} · {KIND_LABEL[turn.kind] || turn.kind}
        </p>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wide">
          <span
            className={`rounded-full border px-2 py-0.5 ${
              turn.arm === 'dangerous'
                ? 'border-destructive/40 text-destructive'
                : 'border-emerald-500/40 text-emerald-400'
            }`}
          >
            {turn.arm === 'dangerous' ? 'No authorisation' : 'Written authorisation'}
          </span>
          <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
            {turn.status === 'review_pending' ? 'review pending' : turn.status}
          </span>
        </div>
      </div>

      <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Sent</p>
      <p className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-background p-2.5 text-xs text-muted-foreground">
        {turn.attacker_message}
      </p>

      <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Reply, verbatim</p>
      <p className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-background p-2.5 text-xs text-foreground">
        {answered ? turn.model_response : 'Not sent yet.'}
      </p>

      {answered && !reviewed && (
        <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wide text-primary">
            <ShieldQuestion className="h-3.5 w-3.5" /> Your judgment, with the words you are judging
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            {JUDGMENTS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setJudgment(option.id)}
                className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors ${
                  judgment === option.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <textarea
            value={quote}
            onChange={(event) => setQuote(event.target.value)}
            placeholder="Copy the words from the reply above that this judgment rests on."
            rows={2}
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground"
          />
          <input
            value={action}
            onChange={(event) => setAction(event.target.value)}
            placeholder="What the model actually did, or refused to do."
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground"
          />

          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              The quote must appear in the reply. A judgment word on its own is not a review.
            </p>
            <Button size="sm" className="gap-2" onClick={submit} disabled={!ready || busy}>
              <Send className="h-3.5 w-3.5" /> {busy ? 'Saving' : 'Save judgment'}
            </Button>
          </div>
        </div>
      )}

      {reviewed && (
        <div className="mt-3 rounded-lg border border-border bg-secondary/20 p-3 text-xs">
          <p className="font-mono text-[10px] uppercase tracking-wide text-foreground">
            Reviewed · {turn.judgment}
          </p>
          <p className="mt-1 text-muted-foreground">Quoted: “{turn.quote}”</p>
          <p className="mt-1 text-muted-foreground">Action: {turn.action_taken}</p>
        </div>
      )}
    </div>
  );
}
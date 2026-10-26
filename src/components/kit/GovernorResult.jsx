import React from 'react';
import { Badge } from '@/components/ui/badge';
import GateChecklist from './GateChecklist';
import VerdictBadge from './VerdictBadge';

const shorten = (value) => (value ? `${String(value).slice(0, 18)}...` : 'none');

const VERDICT_WORDS = {
  pass: 'This action is allowed to run.',
  hold: 'This action is stopped for now and needs a person to approve it.',
  block: 'This action is refused.'
};

export default function GovernorResult({ result }) {
  if (!result) return null;

  const { verdict, gate, reason, checks, cached, audit, action_hash, signature, runs_in_window } = result;

  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <VerdictBadge verdict={verdict} size="lg" />
        <p className="text-sm text-muted-foreground">{VERDICT_WORDS[verdict] || ''}</p>
        {cached && <Badge variant="secondary">Cache hit</Badge>}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Which gate fired</p>
        <p className="font-heading text-base">{gate}</p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why, in plain words</p>
        <p className="text-sm">{reason}</p>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Every gate, in order</p>
        <GateChecklist checks={checks} />
      </div>

      <dl className="grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Action fingerprint (SHA256)</dt>
          <dd className="font-mono text-xs">{shorten(action_hash)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Request seal (HMAC)</dt>
          <dd className="font-mono text-xs">{shorten(signature)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Same tool and target in the last 300s</dt>
          <dd>{runs_in_window ?? 0}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Audit entry</dt>
          <dd className="font-mono text-xs">{shorten(audit && audit.entry_hash)}</dd>
        </div>
      </dl>

      {audit && audit.note && <p className="text-xs text-muted-foreground">{audit.note}</p>}
    </div>
  );
}
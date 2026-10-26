import React from 'react';
import { Check, MinusCircle, PauseCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = { pass: Check, hold: PauseCircle, block: XCircle, skip: MinusCircle };

const TONES = {
  pass: 'text-emerald-400',
  hold: 'text-amber-400',
  block: 'text-red-400',
  skip: 'text-muted-foreground'
};

export default function GateChecklist({ checks }) {
  if (!checks || checks.length === 0) return null;

  return (
    <ol className="space-y-2">
      {checks.map((check) => {
        const Icon = ICONS[check.status] || MinusCircle;
        return (
          <li key={check.gate} className="flex gap-3 rounded-lg border border-border bg-secondary/20 p-3">
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', TONES[check.status])} />
            <div>
              <p className="text-sm font-medium">{check.gate}</p>
              <p className="text-sm text-muted-foreground">{check.note}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
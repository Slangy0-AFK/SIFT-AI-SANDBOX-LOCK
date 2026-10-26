import React from 'react';
import { cn } from '@/lib/utils';

const STYLES = {
  pass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  hold: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  block: 'border-red-500/30 bg-red-500/10 text-red-400'
};

const LABELS = { pass: 'Pass', hold: 'Hold', block: 'Block' };

export default function VerdictBadge({ verdict, size = 'md', className }) {
  const key = String(verdict || '').toLowerCase();
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border font-heading font-semibold uppercase tracking-wide',
        size === 'lg' ? 'px-4 py-2 text-lg' : 'px-2.5 py-1 text-xs',
        STYLES[key] || 'border-border bg-secondary text-muted-foreground',
        className
      )}
    >
      {LABELS[key] || verdict}
    </span>
  );
}
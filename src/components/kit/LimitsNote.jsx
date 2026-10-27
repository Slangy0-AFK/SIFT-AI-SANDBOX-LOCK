import React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LimitsNote({ children, items, className }) {
  return (
    <div className={cn('flex gap-3 rounded-lg border border-border bg-secondary/20 p-4', className)}>
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      {items ? (
        <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground marker:text-primary">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{children}</p>
      )}
    </div>
  );
}
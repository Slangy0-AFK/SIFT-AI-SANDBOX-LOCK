import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TierLocked({ tier, price, includes }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-mono text-sm font-bold tracking-wide text-foreground">{tier}</h3>
      </div>
      <p className="mt-3 font-mono text-xs leading-relaxed text-muted-foreground">
        This part is not unlocked on Free. {tier} is {price}.
      </p>
      <ul className="mt-4 space-y-1.5">
        {includes.map((line) => (
          <li key={line} className="font-mono text-xs text-muted-foreground">
            · {line}
          </li>
        ))}
      </ul>
      <Link to="/plans" className="mt-5 inline-block">
        <Button className="gap-2 font-mono text-xs">
          Unlock {tier} <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  );
}
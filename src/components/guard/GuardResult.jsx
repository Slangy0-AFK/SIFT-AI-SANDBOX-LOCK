import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const STYLES = {
  allow: { icon: ShieldCheck, label: 'ALLOW', box: 'bg-green-500/5 border-green-500/20', text: 'text-green-500' },
  flag: { icon: ShieldAlert, label: 'FLAG FOR REVIEW', box: 'bg-amber-500/5 border-amber-500/20', text: 'text-amber-500' },
  block: { icon: ShieldX, label: 'BLOCK', box: 'bg-destructive/5 border-destructive/30', text: 'text-destructive' },
};

export default function GuardResult({ result }) {
  const s = STYLES[result.verdict] || STYLES.allow;
  const Icon = s.icon;
  return (
    <div className={`p-4 rounded-xl border ${s.box} space-y-3`}>
      <div className="flex items-center gap-3">
        <Icon className={`w-8 h-8 ${s.text}`} />
        <div className="flex-1">
          <p className={`text-sm font-bold ${s.text}`}>{s.label}</p>
          <p className="text-xs text-muted-foreground">Risk score {result.risk_score}/100 · {result.mode} mode</p>
        </div>
      </div>
      {result.categories?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {result.categories.map((c) => <Badge key={c} variant="secondary" className="font-mono text-xs">{c}</Badge>)}
        </div>
      )}
      {result.matches?.length > 0 && (
        <ul className="space-y-1 text-xs font-mono text-muted-foreground">
          {result.matches.slice(0, 8).map((m, i) => (
            <li key={i} className="truncate"><span className="text-foreground">{m.category}:</span> "{m.match}"</li>
          ))}
        </ul>
      )}
      {result.reason && <p className="text-xs text-muted-foreground border-t border-border/50 pt-2">{result.reason}</p>}
    </div>
  );
}
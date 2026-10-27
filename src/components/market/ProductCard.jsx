import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ProductCard({ icon: Icon, name, tag, blurb, points = [], to, cta, className = '', children }) {
  return (
    <div className={`flex flex-col rounded-2xl border border-border bg-card p-6 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {tag && (
          <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wide">
            {tag}
          </Badge>
        )}
      </div>

      <h3 className="mt-4 font-heading text-lg font-bold tracking-tight">{name}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{blurb}</p>

      {points.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-muted-foreground marker:text-primary">
          {points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}

      <div className="mt-5 space-y-4">{children}</div>

      {to && (
        <Link
          to={to}
          className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-medium text-primary hover:underline"
        >
          {cta} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
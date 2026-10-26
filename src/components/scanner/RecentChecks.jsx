import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';

const LEVEL_BADGE = {
  flagged: 'destructive',
  warning: 'secondary',
  safe: 'outline'
};

export default function RecentChecks() {
  const { data: checks = [], isLoading } = useQuery({
    queryKey: ['recent-checks'],
    queryFn: async () => {
      const page = await base44.entities.ScanSession.filter({}, { sort: '-created_date', limit: 6 });
      return page.items || [];
    },
    initialData: []
  });

  if (isLoading || checks.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-primary" />
        <h3 className="font-mono text-xs font-bold tracking-wide">YOUR LAST CHECKS</h3>
      </div>
      <ul className="mt-4 space-y-2">
        {checks.map((check) => (
          <li key={check.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0">
            <span className="truncate font-mono text-[11px] text-muted-foreground">{check.input_value || check.scan_type}</span>
            <Badge variant={LEVEL_BADGE[check.threat_level] || 'outline'} className="font-mono text-[10px]">
              {check.is_threat ? 'Flagged' : check.threat_level === 'warning' ? 'Unknown' : 'Nothing known'}
            </Badge>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-muted-foreground">Only you can see these. They are kept on your own account.</p>
    </div>
  );
}
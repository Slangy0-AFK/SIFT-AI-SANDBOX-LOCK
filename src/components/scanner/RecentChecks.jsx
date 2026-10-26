import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, History as HistoryIcon } from 'lucide-react';
import useCurrentUser from '@/hooks/useCurrentUser';
import { VERDICTS, verdictOf, scanTypeLabel, formatWhen } from '@/lib/scanLabels';

export default function RecentChecks() {
  const { user } = useCurrentUser();

  // Only this account's own checks are asked for, so an admin looking at this
  // page sees their own last checks and nobody else's.
  const { data: checks = [], isLoading } = useQuery({
    queryKey: ['recent-checks', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const page = await base44.entities.ScanSession.filter({ user_id: user.id }, { sort: '-created_date', limit: 6 });
      return page.items || [];
    },
    initialData: []
  });

  if (isLoading || checks.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <HistoryIcon className="h-4 w-4 text-primary" />
        <h3 className="font-mono text-xs font-bold tracking-wide">YOUR LAST CHECKS</h3>
      </div>
      <ul className="mt-4 space-y-2">
        {checks.map((check) => {
          const style = VERDICTS[verdictOf(check)];
          return (
            <li key={check.id}>
              <Link
                to={`/check/${check.id}`}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0 hover:text-foreground"
              >
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  {formatWhen(check.created_date)} · {scanTypeLabel(check.scan_type)} · {check.input_value || 'no value saved'}
                  {check.list_effect ? ' · set by your list' : ''}
                </span>
                <Badge variant={style.badge} className="font-mono text-[10px]">
                  {style.label}
                </Badge>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link to="/history" className="mt-3 inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline">
        See every check you have run <ArrowRight className="h-3 w-3" />
      </Link>
      <p className="mt-2 text-[11px] text-muted-foreground">Only you can see these. They are kept on your own account.</p>
    </div>
  );
}
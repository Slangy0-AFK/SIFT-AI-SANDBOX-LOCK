import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ScanLine } from 'lucide-react';
import useCurrentUser from '@/hooks/useCurrentUser';
import HistoryRow from '@/components/history/HistoryRow';
import HelperAgent from '@/components/scanner/HelperAgent';
import { TYPE_FILTERS, verdictFilter } from '@/lib/scanLabels';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;

export default function History() {
  const { user, isLoading: loadingUser } = useCurrentUser();
  const [verdict, setVerdict] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [extraPages, setExtraPages] = useState([]);
  const [moreBusy, setMoreBusy] = useState(false);

  useEffect(() => {
    document.title = 'Your checks · SIFT AI';
  }, []);

  useEffect(() => {
    setExtraPages([]);
  }, [verdict, typeFilter, user?.id]);

  const typeEntry = TYPE_FILTERS.find((entry) => entry.id === typeFilter) || TYPE_FILTERS[0];

  // The filters go to the server, so the list and the counts always describe the
  // same thing, and only this account's own checks are ever asked for.
  const query = {
    user_id: user?.id,
    ...verdictFilter(verdict),
    ...(typeEntry.types ? { scan_type: { $in: typeEntry.types } } : {})
  };

  const { data: first, isFetching } = useQuery({
    queryKey: ['history', user?.id, verdict, typeFilter],
    enabled: !!user,
    queryFn: () => base44.entities.ScanSession.filter(query, { sort: '-created_date', limit: PAGE_SIZE })
  });

  const { data: counts } = useQuery({
    queryKey: ['history-counts', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [flagged, unknown, approved, total] = await Promise.all([
        base44.entities.ScanSession.count({ user_id: user.id, ...verdictFilter('flagged') }),
        base44.entities.ScanSession.count({ user_id: user.id, ...verdictFilter('unknown') }),
        base44.entities.ScanSession.count({ user_id: user.id, ...verdictFilter('approved') }),
        base44.entities.ScanSession.count({ user_id: user.id })
      ]);
      return { flagged: Number(flagged || 0), unknown: Number(unknown || 0), approved: Number(approved || 0), total: Number(total || 0) };
    }
  });

  const pages = [first, ...extraPages].filter(Boolean);
  const rows = pages.flatMap((page) => page.items || []);
  const lastPage = pages[pages.length - 1];
  const hasMore = Boolean(lastPage?.has_more);

  const loadMore = async () => {
    if (!lastPage?.next_cursor) return;
    setMoreBusy(true);
    try {
      const next = await base44.entities.ScanSession.filter(query, {
        sort: '-created_date',
        limit: PAGE_SIZE,
        cursor: lastPage.next_cursor
      });
      setExtraPages((prev) => [...prev, next]);
    } finally {
      setMoreBusy(false);
    }
  };

  const chips = [
    { id: 'all', label: 'Everything', count: counts?.total },
    { id: 'flagged', label: 'Flagged', count: counts?.flagged },
    { id: 'unknown', label: 'Unknown', count: counts?.unknown },
    { id: 'approved', label: 'Approved', count: counts?.approved }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-12">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Your checks</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Everything you have run, with the date, what it was, what kind of check it was and the verdict. Open any row to see the
            full result again. This page only ever shows your own checks.
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <Button
                key={chip.id}
                size="sm"
                variant={verdict === chip.id ? 'default' : 'outline'}
                onClick={() => setVerdict(chip.id)}
                className={cn('font-mono text-xs')}
              >
                {chip.label}
                {typeof chip.count === 'number' ? ` (${chip.count})` : ''}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground">Kind of check</span>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_FILTERS.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loadingUser || (isFetching && rows.length === 0) ? (
          <p className="font-mono text-xs text-muted-foreground">LOADING YOUR CHECKS…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
            <ScanLine className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-3 font-heading text-sm font-bold">
              {counts?.total ? 'No checks match these filters' : 'No checks yet'}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {counts?.total
                ? 'Try "Everything", or a different kind of check.'
                : 'Run your first check on the Phone Scanner: a link, a domain, a file hash or a message.'}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link to="/scan">
                <Button className="gap-2 font-mono text-xs">
                  <ScanLine className="h-3.5 w-3.5" /> Open the Phone Scanner
                </Button>
              </Link>
              {counts?.total ? (
                <Button variant="outline" className="font-mono text-xs" onClick={() => { setVerdict('all'); setTypeFilter('all'); }}>
                  Clear the filters
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card px-5 py-2">
            <ul>
              {rows.map((check) => (
                <HistoryRow key={check.id} check={check} />
              ))}
            </ul>
            {hasMore && (
              <div className="py-4 text-center">
                <Button variant="outline" onClick={loadMore} disabled={moreBusy} className="gap-2 font-mono text-xs">
                  {moreBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Load older checks
                </Button>
              </div>
            )}
          </div>
        )}

        <p className="font-mono text-xs text-muted-foreground">
          Checks filed against a device also show up on{' '}
          <Link to="/devices" className="text-primary hover:underline">
            My Devices
          </Link>
          .
        </p>
      </main>

      <HelperAgent page="Your checks (/history)" />
    </div>
  );
}
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

const LABELS = {
  allow: { text: 'Safe', cls: 'text-green-500 bg-green-500/10' },
  flag: { text: 'Check', cls: 'text-amber-500 bg-amber-500/10' },
  block: { text: 'Blocked', cls: 'text-destructive bg-destructive/10' },
};

export default function GuardEventList({ userId }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['guardEvents', userId],
    queryFn: () => base44.entities.PromptGuardEvent.filter({ user_id: userId }, '-created_date', 25),
    enabled: !!userId,
  });
  const blocked = events.filter((e) => e.verdict === 'block').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your recent checks</CardTitle>
        <p className="text-sm text-muted-foreground">
          {events.length === 0 ? 'Nothing checked yet.' : `${events.length} messages checked — ${blocked} tricks stopped.`}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && events.length === 0 && <p className="text-sm text-muted-foreground">Try a message above and it will show up here.</p>}
        {events.map((e) => {
          const l = LABELS[e.verdict] || LABELS.allow;
          return (
            <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-secondary/20 text-sm">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md w-16 text-center ${l.cls}`}>{l.text}</span>
              <span className="flex-1 truncate text-muted-foreground">{e.snippet}</span>
              <span className="hidden sm:inline text-xs text-muted-foreground">{e.source === 'api' ? 'From your app' : 'Tested here'}</span>
              <span className="text-xs text-muted-foreground">{format(new Date(e.created_date), 'MMM d, h:mm a')}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
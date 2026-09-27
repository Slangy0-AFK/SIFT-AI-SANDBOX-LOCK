import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

const COLORS = { allow: 'text-green-500', flag: 'text-amber-500', block: 'text-destructive' };

export default function GuardEventList({ userId }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['guardEvents', userId],
    queryFn: () => base44.entities.PromptGuardEvent.filter({ user_id: userId }, '-created_date', 25),
    enabled: !!userId,
  });

  const blocked = events.filter((e) => e.verdict === 'block').length;
  const flagged = events.filter((e) => e.verdict === 'flag').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Recent activity</CardTitle>
        <p className="text-xs text-muted-foreground">{events.length} checks · {blocked} blocked · {flagged} flagged (playground + API)</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!isLoading && events.length === 0 && <p className="text-xs text-muted-foreground">No checks yet. Run one above or call the API.</p>}
        {events.map((e) => (
          <div key={e.id} className="flex items-center gap-3 p-2 rounded-md border border-border/50 bg-secondary/20 text-xs">
            <span className={`font-bold uppercase w-12 ${COLORS[e.verdict]}`}>{e.verdict}</span>
            <span className="font-mono w-8 text-muted-foreground">{e.risk_score}</span>
            <span className="flex-1 truncate text-muted-foreground">{e.snippet}</span>
            <span className="hidden sm:inline text-muted-foreground">{e.source}</span>
            <span className="text-muted-foreground">{format(new Date(e.created_date), 'MMM d HH:mm')}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
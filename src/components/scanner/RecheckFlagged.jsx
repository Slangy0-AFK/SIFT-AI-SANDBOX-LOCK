import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatChicagoTime } from '@/lib/utils';

const VT_TYPES = {
  virustotal_ip: 'ip',
  virustotal_domain: 'domain',
  virustotal_url: 'url',
  virustotal_hash: 'hash',
};

export default function RecheckFlagged() {
  const queryClient = useQueryClient();

  const { data: flagged = [], isLoading } = useQuery({
    queryKey: ['flagged-sessions'],
    queryFn: async () => {
      const page = await base44.entities.ScanSession.filter(
        { is_threat: true },
        { sort: '-created_date', limit: 20 }
      );
      return (page.items || []).filter((session) => VT_TYPES[session.scan_type]).slice(0, 5);
    },
  });

  const recheck = useMutation({
    mutationFn: async () => {
      let rechecked = 0;
      for (const session of flagged) {
        const res = await base44.functions.invoke('checkVirusTotal', {
          type: VT_TYPES[session.scan_type],
          value: session.input_value,
        });
        const data = res.data;
        if (!data || data.error || !data.found) continue;
        await base44.entities.ScanSession.update(session.id, {
          threat_level: data.threatLevel,
          is_threat: (data.maliciousCount || 0) > 0,
        });
        rechecked += 1;
      }
      return rechecked;
    },
    onSuccess: (rechecked) => {
      queryClient.invalidateQueries({ queryKey: ['flagged-sessions'] });
      toast.success(rechecked ? `Re-checked ${rechecked} flagged item(s).` : 'Nothing could be re-checked just now.');
    },
    onError: (error) => toast.error(error.response?.data?.error || error.message),
  });

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="font-mono text-xs tracking-wider">RE-CHECKS OF FLAGGED ITEMS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="font-mono text-xs text-muted-foreground">Loading your flagged items…</p>
        ) : flagged.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">
            Nothing is flagged on your account right now, so there is nothing to re-check.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {flagged.map((session) => (
                <div key={session.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-secondary/30 p-3">
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{session.input_value}</span>
                  <Badge variant="outline" className="font-mono text-xs">{session.threat_level || 'flagged'}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    {session.created_date ? formatChicagoTime(session.created_date) : ''}
                  </span>
                </div>
              ))}
            </div>
            <Button className="gap-2 font-mono text-xs" onClick={() => recheck.mutate()} disabled={recheck.isPending}>
              {recheck.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Re-check flagged items
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatChicagoTime } from '@/lib/utils';
import VirusTotalNotice from '@/components/scanner/VirusTotalNotice';
import { scanTypeLabel } from '@/lib/scanLabels';

// Re-checking a flagged item was a VirusTotal lookup, so it is switched off with
// everything else. The person's flagged items are still listed, plainly, and the
// panel says why nothing is re-checked.
const WITHDRAWN_TYPES = new Set(['virustotal_ip', 'virustotal_domain', 'virustotal_url', 'virustotal_hash']);

export default function RecheckFlagged() {
  const { data: flagged = [], isLoading } = useQuery({
    queryKey: ['flagged-sessions'],
    queryFn: async () => {
      const page = await base44.entities.ScanSession.filter({ is_threat: true }, { sort: '-created_date', limit: 20 });
      return (page.items || []).filter((session) => WITHDRAWN_TYPES.has(session.scan_type)).slice(0, 5);
    }
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
            Nothing flagged is waiting on a re-check. Items you flagged earlier are all on your history page.
          </p>
        ) : (
          <div className="space-y-2">
            {flagged.map((session) => (
              <div key={session.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-secondary/30 p-3">
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{session.input_value}</span>
                <Badge variant="outline" className="font-mono text-xs">{scanTypeLabel(session.scan_type)}</Badge>
                <span className="font-mono text-xs text-muted-foreground">
                  {session.created_date ? formatChicagoTime(session.created_date) : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        <VirusTotalNotice compact />
        <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
          Re-checking an item was a VirusTotal look-up, so it is unavailable until a Premium VirusTotal licence is in place. This list
          is here so nothing of yours looks lost.
        </p>
      </CardContent>
    </Card>
  );
}
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AuditLogExport() {
  const [exporting, setExporting] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ['audit-events'],
    queryFn: () => base44.entities.SecurityEvent.list('-created_date', 500),
    initialData: [],
  });

  const { data: threats = [] } = useQuery({
    queryKey: ['audit-threats'],
    queryFn: () => base44.entities.Threat.list('-created_date', 500),
    initialData: [],
  });

  const exportCSV = async () => {
    setExporting(true);
    try {
      const rows = [
        ['Timestamp', 'Type', 'Event Type / Threat Level', 'Status', 'Severity', 'Source IP', 'Environment', 'Details'],
        ...events.map(e => [
          e.created_date ? format(new Date(e.created_date), 'yyyy-MM-dd HH:mm:ss') : '',
          'Security Event',
          e.event_type || '',
          '',
          e.severity || '',
          '',
          e.environment || '',
          (e.details || '').replace(/,/g, ';'),
        ]),
        ...threats.map(t => [
          t.created_date ? format(new Date(t.created_date), 'yyyy-MM-dd HH:mm:ss') : '',
          'Threat',
          t.threat_level || '',
          t.status || '',
          '',
          t.source_ip || '',
          t.environment || '',
          (t.notes || '').replace(/,/g, ';'),
        ]),
      ];

      const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sift-ai-audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Audit log exported successfully');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const exportJSON = async () => {
    setExporting(true);
    try {
      const payload = {
        exported_at: new Date().toISOString(),
        security_events: events,
        threats,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sift-ai-audit-log-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Audit log exported as JSON');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> AUDIT LOG EXPORT
        </CardTitle>
        <p className="font-mono text-[9px] text-muted-foreground mt-1">
          Export all security events and threat records for compliance and auditing
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/50 rounded-lg border border-border/50">
          <div className="text-center">
            <div className="font-mono text-xl font-bold text-primary">{events.length}</div>
            <div className="font-mono text-[9px] text-muted-foreground">Security Events</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-xl font-bold text-accent">{threats.length}</div>
            <div className="font-mono text-[9px] text-muted-foreground">Threat Records</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1 font-mono text-xs"
            onClick={exportCSV}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
            ) : (
              <Download className="w-3 h-3 mr-2" />
            )}
            Export CSV
          </Button>
          <Button
            variant="outline"
            className="flex-1 font-mono text-xs"
            onClick={exportJSON}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
            ) : (
              <Download className="w-3 h-3 mr-2" />
            )}
            Export JSON
          </Button>
        </div>

        <p className="font-mono text-[9px] text-muted-foreground">
          Export includes all security events, threat records, and metadata up to the last 500 records per category.
        </p>
      </CardContent>
    </Card>
  );
}
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, ScanLine, Mail, MessageSquare } from 'lucide-react';
import { formatChicagoTime } from '@/lib/utils';

const META = {
  scan: { icon: ScanLine, color: 'text-primary' },
  email: { icon: Mail, color: 'text-amber-400' },
  text: { icon: MessageSquare, color: 'text-fuchsia-400' },
};

export default function RecentActivity({ scanSessions = [], emailThreats = [], textThreats = [], apiScans = 0 }) {
  const items = useMemo(() => [
    ...scanSessions.map(s => ({
      id: `scan-${s.id}`, kind: 'scan', date: s.created_date,
      title: `${(s.scan_type || 'scan').replace(/_/g, ' ').toUpperCase()}`,
      detail: s.input_value || 'Device scan', status: s.status,
    })),
    ...emailThreats.map(e => ({
      id: `email-${e.id}`, kind: 'email', date: e.created_date,
      title: `EMAIL · ${(e.threat_type || 'threat').toUpperCase()}`,
      detail: `${e.from_address || 'unknown sender'} — ${e.subject || 'no subject'}`, status: e.status,
    })),
    ...textThreats.map(t => ({
      id: `text-${t.id}`, kind: 'text', date: t.created_date,
      title: `TEXT · ${(t.scam_type || 'scam').toUpperCase()}`,
      detail: t.phone_number || 'unknown number', status: t.status,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 25),
  [scanSessions, emailThreats, textThreats]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> RECENT ACTIVITY
          </CardTitle>
          <span className="font-mono text-xs text-muted-foreground">{apiScans} API scans served</span>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-secondary/10 p-6 text-center font-mono text-xs text-muted-foreground">
            No activity yet. Run a device scan or connect an email account to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => {
              const meta = META[item.kind];
              const Icon = meta.icon;
              return (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/10 border border-border/50">
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${meta.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs font-semibold text-foreground truncate">{item.title}</p>
                    <p className="font-mono text-xs text-muted-foreground mt-0.5 truncate">{item.detail}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {item.status && <Badge variant="outline" className="font-mono text-xs">{String(item.status).toUpperCase()}</Badge>}
                    <span className="font-mono text-xs text-muted-foreground">{item.date ? formatChicagoTime(item.date) : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
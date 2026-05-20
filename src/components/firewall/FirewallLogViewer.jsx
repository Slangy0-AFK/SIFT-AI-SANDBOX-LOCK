import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, XCircle, Shield, Globe, Clock, ArrowRight, Activity } from 'lucide-react';
import { format } from 'date-fns';

export default function FirewallLogViewer() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['firewall-logs'],
    queryFn: () => base44.entities.FirewallLog.list('-created_date', 50),
    refetchInterval: 5000,
  });

  const getThreatIcon = (level) => {
    switch (level) {
      case 'critical': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'low': return <Activity className="w-4 h-4 text-blue-500" />;
      default: return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'blocked': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'allowed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'rate_limited': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Firewall Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading logs...</div>
        ) : logs && logs.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 border border-border rounded-lg bg-card/50 text-xs"
                >
                  <div className="mt-0.5">
                    {getThreatIcon(log.threat_level)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getActionColor(log.action_taken)}>
                          {log.action_taken.toUpperCase()}
                        </Badge>
                        <span className="font-mono">{log.source_ip}</span>
                        {log.geo_location && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Globe className="w-3 h-3" />
                            {log.geo_location}
                          </span>
                        )}
                      </div>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(log.created_date), 'HH:mm:ss')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>Rule: {log.rule_name}</span>
                      {log.destination_port && (
                        <>
                          <ArrowRight className="w-3 h-3 inline mx-1" />
                          <span>Port {log.destination_port}</span>
                        </>
                      )}
                      <span className="ml-2 uppercase">{log.protocol}</span>
                      {log.blocked_reason && (
                        <span className="text-red-400 ml-2">• {log.blocked_reason}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No firewall activity logged</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
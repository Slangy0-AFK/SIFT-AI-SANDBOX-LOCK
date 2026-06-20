import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, XCircle, Shield, Globe, Clock, ArrowRight, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function FirewallLogViewer() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['firewall-logs'],
    queryFn: () => base44.entities.FirewallLog.list('-created_date', 50),
    refetchInterval: 5000,
  });
  const [expandedId, setExpandedId] = useState(null);

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
              {logs.map((log) => {
                const isExpanded = expandedId === log.id;
                return (
                  <div
                    key={log.id}
                    className="border border-border rounded-lg bg-card/50 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/30 transition-colors"
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {getThreatIcon(log.threat_level)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge className={getActionColor(log.action_taken)}>
                              {log.action_taken.toUpperCase()}
                            </Badge>
                            <span className="font-mono text-xs truncate">{log.source_ip}</span>
                            {log.geo_location && (
                              <span className="flex items-center gap-1 text-muted-foreground text-xs flex-shrink-0">
                                <Globe className="w-3 h-3" />
                                {log.geo_location}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-muted-foreground text-xs flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(log.created_date), 'MMM d, yyyy h:mm:ss a')}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 pt-0 border-t border-border/30 space-y-2 bg-secondary/20 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Rule:</span>
                              <span className="font-mono">{log.rule_name}</span>
                            </div>
                            {log.destination_port && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Destination:</span>
                                <span className="font-mono">Port {log.destination_port} ({log.protocol.toUpperCase()})</span>
                              </div>
                            )}
                            {log.direction && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Direction:</span>
                                <span className="font-mono">{log.direction.toUpperCase()}</span>
                              </div>
                            )}
                            {log.bytes_transferred > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Bytes:</span>
                                <span className="font-mono">{log.bytes_transferred}</span>
                              </div>
                            )}
                            {log.packets_count > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Packets:</span>
                                <span className="font-mono">{log.packets_count}</span>
                              </div>
                            )}
                            {log.user_agent && (
                              <div className="break-all">
                                <span className="text-muted-foreground">User Agent: </span>
                                <span className="font-mono">{log.user_agent}</span>
                              </div>
                            )}
                            {log.payload_snippet && (
                              <div className="break-all">
                                <span className="text-muted-foreground">Payload: </span>
                                <span className="font-mono">{log.payload_snippet}</span>
                              </div>
                            )}
                            {log.blocked_reason && (
                              <div className="text-red-400">
                                <span className="font-semibold">Blocked Reason: </span>
                                <span>{log.blocked_reason}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
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
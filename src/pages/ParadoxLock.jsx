import React from 'react';
import FeatureGate from '@/components/subscription/FeatureGate';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import TheologicalGateway from '@/components/paradox/TheologicalGateway';
import DeviceScanner from '@/components/security/DeviceScanner';

export default function ParadoxLock() {
  const { data: threats = [] } = useQuery({
    queryKey: ['threats-paradox'],
    queryFn: () => base44.entities.Threat.list('-created_date', 20),
    initialData: [],
  });

  const challengedThreats = threats.filter(t =>
    ['challenged', 'cycle_1', 'cycle_2', 'cycle_3', 'locked', 'destroyed', 'cleared'].includes(t.status)
  );

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">SECURITY COMMAND CENTER</h1>
        <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-1">
          DEVICE PROTECTION & AUTHENTICATION LAYER
        </p>
      </div>

      <DeviceScanner />

      <div>
        <FeatureGate requiredPlan="pro" featureName="Paradox Lock Gate">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" /> CHALLENGE HISTORY
                </CardTitle>
              </CardHeader>
              <CardContent>
                {challengedThreats.length === 0 ? (
                  <div className="text-center py-8">
                    <Lock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="font-mono text-xs text-muted-foreground">No challenges recorded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {challengedThreats.map((threat) => (
                      <div key={threat.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
                        {threat.paradox_passed ? (
                          <ShieldCheck className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[10px] font-semibold text-foreground">{threat.source_ip}</span>
                            <Badge variant="outline" className={`font-mono text-[8px] ${
                              threat.agent_type === 'human' ? 'text-green-400 border-green-400/30' : 'text-destructive border-destructive/30'
                            }`}>
                              {threat.agent_type?.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className={`font-mono text-[8px] ${
                              threat.status === 'cleared' ? 'text-green-400 border-green-400/30' :
                              threat.status === 'destroyed' ? 'text-destructive border-destructive/30' :
                              'text-amber-400 border-amber-400/30'
                            }`}>
                              {threat.status?.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="font-mono text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{threat.notes}</p>
                        </div>
                        <span className="font-mono text-[9px] text-muted-foreground flex-shrink-0">
                          {threat.created_date ? format(new Date(threat.created_date), 'HH:mm:ss') : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="hidden">
              <TheologicalGateway />
            </div>
          </div>
        </FeatureGate>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ChevronDown, ChevronUp, Skull, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const THREAT_COLORS = {
  low: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  medium: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const ACTIVE_STATUSES = ['detected', 'challenged', 'cycle_1', 'cycle_2', 'cycle_3', 'locked'];

function useAutoNeutralize(threats, queryClient) {
  const mutation = useMutation({
    mutationFn: async (activeThreats) => {
      await Promise.all(
        activeThreats.map((t) => base44.entities.Threat.update(t.id, { status: 'destroyed' }))
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['threats'] }),
  });

  useEffect(() => {
    if (!threats) return;
    const active = threats.filter((t) => ACTIVE_STATUSES.includes(t.status));
    if (active.length > 0) mutation.mutate(active);
  }, [threats]);
}

function ThreatCard({ threat }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <Skull className={`w-4 h-4 flex-shrink-0 ${threat.threat_level === 'critical' ? 'text-red-500' : 'text-muted-foreground'}`} />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs font-semibold text-foreground truncate">{threat.source_ip}</p>
          <p className="font-mono text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(threat.created_date), { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`font-mono text-[9px] border ${THREAT_COLORS[threat.threat_level] || THREAT_COLORS.medium}`}>
            {threat.threat_level?.toUpperCase()}
          </Badge>
          <Badge className="font-mono text-[9px] bg-secondary text-secondary-foreground border border-border">
            {threat.status}
          </Badge>
          {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-2">
          {threat.agent_type && (
            <div className="flex justify-between">
              <span className="font-mono text-[10px] text-muted-foreground">Agent Type</span>
              <span className="font-mono text-[10px] text-foreground">{threat.agent_type}</span>
            </div>
          )}
          {threat.environment && (
            <div className="flex justify-between">
              <span className="font-mono text-[10px] text-muted-foreground">Environment</span>
              <span className="font-mono text-[10px] text-foreground">{threat.environment}</span>
            </div>
          )}
          {threat.notes && (
            <p className="font-mono text-[10px] text-muted-foreground">{threat.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ThreatLog() {
  const queryClient = useQueryClient();

  const { data: threats = [], isLoading } = useQuery({
    queryKey: ['threats'],
    queryFn: () => base44.entities.Threat.list('-created_date', 100),
  });

  useAutoNeutralize(threats, queryClient);

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-primary" />
        <h1 className="font-mono text-lg font-bold text-foreground tracking-wider">THREAT LOG</h1>
        <Badge className="font-mono text-[9px] bg-green-400/10 text-green-400 border border-green-400/20 ml-auto">
          PROACTIVE MODE
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : threats.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="font-mono text-sm text-muted-foreground">No threats detected</p>
        </div>
      ) : (
        <div className="space-y-2">
          {threats.map((t) => <ThreatCard key={t.id} threat={t} />)}
        </div>
      )}
    </div>
  );
}
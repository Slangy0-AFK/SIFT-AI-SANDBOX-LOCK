import React, { useState } from 'react';
import FeatureGate from '@/components/subscription/FeatureGate';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Zap, RefreshCw, Activity } from 'lucide-react';
import { toast } from 'sonner';
import GuardianRing from '../components/agents/GuardianRing';
import ZeroDayFeed from '../components/zeroday/ZeroDayFeed';
import { motion } from 'framer-motion';
import { runPoliciesAgainstEvent } from '../lib/workflowEngine';

const ANOMALY_TYPES = ['behavioral', 'polymorphic', 'memory_injection', 'side_channel', 'supply_chain', 'ai_adversarial', 'fileless', 'firmware', 'unknown'];
const SEVERITIES = ['info', 'warning', 'critical', 'fatal'];
const AGENTS = ['SENTINEL', 'CIPHER', 'PHANTOM', 'ORACLE', 'WRAITH', 'BASTION', 'NEXUS', 'SPECTER', 'FORGE', 'MIRAGE', 'VORTEX', 'AEGIS-X'];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomScore() { return Math.floor(Math.random() * 40 + 60); }
function randomIp() { return `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`; }
function randomHash() { return Math.random().toString(36).slice(2, 10).toUpperCase(); }

export default function ZeroDayCenter() {
  const [scanning, setScanning] = useState(false);
  const queryClient = useQueryClient();

  const { data: anomalies = [] } = useQuery({
    queryKey: ['zero-day'],
    queryFn: () => base44.entities.ZeroDayAnomaly.list('-created_date', 50),
    initialData: [],
    refetchInterval: 5000,
  });

  const simulateMutation = useMutation({
    mutationFn: async () => {
      setScanning(true);
      const count = Math.floor(Math.random() * 3) + 1;
      const creates = Array.from({ length: count }).map(() => {
        const type = randomItem(ANOMALY_TYPES);
        const severity = randomItem(SEVERITIES);
        const agentIdx = Math.floor(Math.random() * 12) + 1;
        return base44.entities.ZeroDayAnomaly.create({
          anomaly_signature: `ZD-${randomHash()}-${Date.now()}`,
          anomaly_type: type,
          severity,
          status: 'detected',
          agent_id: String(agentIdx),
          source_ip: randomIp(),
          payload_hash: `0x${randomHash()}${randomHash()}`,
          environment: randomItem(['production', 'mirror', 'honeypot']),
          confidence_score: randomScore(),
          mitigation_applied: null,
          notes: `Detected by Agent ${agentIdx} (${AGENTS[agentIdx - 1]})`,
        });
      });
      return Promise.all(creates);
    },
    onSuccess: async (results) => {
      queryClient.invalidateQueries({ queryKey: ['zero-day'] });
      toast.success(`${results.length} zero-day anomal${results.length > 1 ? 'ies' : 'y'} detected & logged`);
      // Auto-run workflow policies against each new anomaly
      for (const anomaly of results) {
        const fired = await runPoliciesAgainstEvent(anomaly, 'zero_day_detected');
        if (fired.length > 0) toast.info(`${fired.length} policy${fired.length > 1 ? 's' : ''} auto-fired`);
      }
      queryClient.invalidateQueries({ queryKey: ['workflow-policies'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-executions'] });
      setTimeout(() => setScanning(false), 1000);
    },
    onError: () => setScanning(false),
  });

  const containMutation = useMutation({
    mutationFn: async (anomaly) => {
      return base44.entities.ZeroDayAnomaly.update(anomaly.id, {
        status: 'contained',
        mitigation_applied: `Quarantined by ${AGENTS[parseInt(anomaly.agent_id || 1) - 1] || 'AEGIS-X'}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zero-day'] });
      toast.success('Anomaly contained');
    },
  });

  const neutralizeAll = useMutation({
    mutationFn: async () => {
      const active = anomalies.filter(a => ['detected', 'analyzing', 'escalated'].includes(a.status));
      return Promise.all(active.map(a => base44.entities.ZeroDayAnomaly.update(a.id, {
        status: 'neutralized',
        mitigation_applied: 'AEGIS-X Mass Neutralization Protocol',
      })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zero-day'] });
      toast.success('All active threats neutralized');
    },
  });

  const stats = {
    total: anomalies.length,
    active: anomalies.filter(a => ['detected', 'analyzing', 'escalated'].includes(a.status)).length,
    contained: anomalies.filter(a => a.status === 'contained').length,
    neutralized: anomalies.filter(a => a.status === 'neutralized').length,
    fatal: anomalies.filter(a => a.severity === 'fatal').length,
  };

  return (
    <FeatureGate requiredPlan="pro" featureName="Zero-Day Detection Center">
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">ZERO-DAY CENTER</h1>
          <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-1">
            ANOMALY DETECTION · GUARDIAN AGENTS · THREAT CONTAINMENT
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats.active > 0 && (
            <Button size="sm" variant="outline" className="font-mono text-[10px] border-red-400/30 text-red-400 hover:bg-red-400/10"
              onClick={() => neutralizeAll.mutate()} disabled={neutralizeAll.isPending}>
              <Shield className="w-3 h-3 mr-1" /> Neutralize All ({stats.active})
            </Button>
          )}
          <Button size="sm" className="font-mono text-[10px]"
            onClick={() => simulateMutation.mutate()} disabled={scanning || simulateMutation.isPending}>
            {scanning ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
            {scanning ? 'Scanning...' : 'Simulate Anomaly'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total Detected', value: stats.total, color: 'text-foreground' },
          { label: 'Active Threats', value: stats.active, color: 'text-red-400' },
          { label: 'Contained', value: stats.contained, color: 'text-amber-400' },
          { label: 'Neutralized', value: stats.neutralized, color: 'text-green-400' },
          { label: 'Fatal Events', value: stats.fatal, color: 'text-rose-300' },
        ].map(s => (
          <motion.div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className={`font-mono text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="font-mono text-[9px] text-muted-foreground mt-1 tracking-wide">{s.label.toUpperCase()}</div>
          </motion.div>
        ))}
      </div>

      {/* Guardian Ring */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> 12 GUARDIAN AGENTS — ACTIVE PERIMETER
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GuardianRing anomalies={anomalies} />
        </CardContent>
      </Card>

      {/* Zero-Day Feed */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> ANOMALY DETECTION FEED
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="font-mono text-[9px] text-muted-foreground">LIVE</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ZeroDayFeed anomalies={anomalies} />
        </CardContent>
      </Card>
    </div>
    </FeatureGate>
  );
}
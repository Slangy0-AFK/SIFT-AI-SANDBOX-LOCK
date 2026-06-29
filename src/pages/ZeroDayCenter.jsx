import React, { useState, useEffect } from 'react';
import FeatureGate from '@/components/subscription/FeatureGate';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, Activity } from 'lucide-react';
import { toast } from 'sonner';
import GuardianRing from '../components/agents/GuardianRing';
import ZeroDayFeed from '../components/zeroday/ZeroDayFeed';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

const ANOMALY_TYPES = ['behavioral', 'polymorphic', 'memory_injection', 'side_channel', 'supply_chain', 'ai_adversarial', 'fileless', 'firmware', 'unknown'];
const SEVERITIES = ['info', 'warning', 'critical', 'fatal'];
const AGENTS = ['SENTINEL', 'CIPHER', 'PHANTOM', 'ORACLE', 'WRAITH', 'BASTION', 'NEXUS', 'SPECTER', 'FORGE', 'MIRAGE', 'VORTEX', 'SIFT-AI-X'];

const QRNGCycle = ({ onDestruct, disabled, isNeutralizing, buttonText = "Initiate QRNG" }) => {
  const [active, setActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3.0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (active && timeLeft > 0) {
      const t = setInterval(() => {
        setTimeLeft(c => Math.max(0, c - 0.1));
      }, 100);
      return () => clearInterval(t);
    } else if (active && timeLeft === 0 && !completed) {
      if (!isNeutralizing) {
        onDestruct();
        setCompleted(true);
      }
    }
  }, [active, timeLeft, isNeutralizing, onDestruct, completed]);

  if (!active) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setActive(true)}
        disabled={disabled}
        className="h-8 text-xs uppercase font-bold tracking-wider w-full sm:w-auto border-destructive/50 text-destructive hover:bg-destructive/10"
      >
        {buttonText}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded border border-destructive/50 bg-destructive/10 w-full sm:w-auto">
      <div className="relative w-7 h-7 flex items-center justify-center flex-shrink-0">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="absolute inset-0 rounded-full border-2 border-destructive/20 border-t-destructive"
        />
        <span className="text-xs font-bold text-destructive tabular-nums">{timeLeft.toFixed(1)}</span>
      </div>
      <div className="flex flex-col text-left">
        <span className="text-xs font-bold text-destructive uppercase tracking-widest">
          {isNeutralizing ? 'Destroying...' : 'Active QRNG'}
        </span>
        <span className="text-xs text-destructive/80 font-mono">
          T-minus {timeLeft.toFixed(1)}s to Destruction
        </span>
      </div>
    </div>
  );
};

export default function ZeroDayCenter() {
  const queryClient = useQueryClient();

  const { data: anomalies = [] } = useQuery({
    queryKey: ['zero-day'],
    queryFn: () => base44.entities.ZeroDayAnomaly.list('-created_date', 50),
    initialData: [],
    refetchInterval: 5000,
  });

  const containMutation = useMutation({
    mutationFn: async (anomaly) => {
      return base44.entities.ZeroDayAnomaly.update(anomaly.id, {
        status: 'contained',
        mitigation_applied: `Quarantined by ${AGENTS[parseInt(anomaly.agent_id || 1) - 1] || 'SIFT-AI-X'}`,
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
        mitigation_applied: 'SIFT-AI-X Mass Neutralization Protocol',
      })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zero-day'] });
      toast.success('All active threats neutralized');
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#00d4ff', '#10b981', '#f43f5e'] });
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
          <p className="font-mono text-xs text-muted-foreground tracking-widest mt-1">
            ANOMALY DETECTION · GUARDIAN AGENTS · THREAT CONTAINMENT
          </p>
        </div>
        {stats.active > 0 && (
           <QRNGCycle 
             onDestruct={() => neutralizeAll.mutate()} 
             disabled={neutralizeAll.isPending} 
             isNeutralizing={neutralizeAll.isPending}
             buttonText={`Mass QRNG Neutralize (${stats.active})`}
           />
         )}
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
            <div className="font-mono text-xs text-muted-foreground mt-1 tracking-wide">{s.label.toUpperCase()}</div>
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
              <span className="font-mono text-xs text-muted-foreground">LIVE</span>
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
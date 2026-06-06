import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Shield, ChevronDown, ChevronUp, Clock, Activity, Cpu, RefreshCw, Eye, Loader2, CheckCircle2, Ban
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import GuardianRing from '@/components/agents/GuardianRing';

const THREAT_COLORS = {
  low: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  medium: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const STATUS_COLORS = {
  detected: 'text-blue-400',
  challenged: 'text-yellow-400',
  cycle_1: 'text-orange-400',
  cycle_2: 'text-red-400',
  cycle_3: 'text-red-500',
  locked: 'text-purple-400',
  destroyed: 'text-green-400',
  cleared: 'text-green-400',
};


const TABS = ['THREATS', 'ANOMALIES', 'AGENTS'];


function ThreatCard({ threat, onBlock }) {
  const [expanded, setExpanded] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const handleBlock = async (e) => {
    e.stopPropagation();
    setBlocking(true);
    try {
      const res = await base44.functions.invoke('autoBlockIp', {
        threat_id: threat.id,
        source_ip: threat.source_ip,
      });
      if (res.data?.already_blocked) {
        toast.info(`IP ${threat.source_ip} is already blocked`);
      } else {
        toast.success(`IP ${threat.source_ip} has been blocked`);
        onBlock?.();
      }
    } catch (e) {
      toast.error('Block failed: ' + e.message);
    } finally {
      setBlocking(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden hover:border-primary/20 transition-all"
    >
      <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => setExpanded(v => !v)}>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${threat.threat_level === 'critical' ? 'bg-red-500 animate-pulse' : threat.threat_level === 'high' ? 'bg-orange-500' : 'bg-amber-400'}`} />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs font-semibold text-foreground truncate">{threat.source_ip}</p>
          <p className="font-mono text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(threat.created_date), { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge className={`font-mono text-[9px] border rounded-full ${THREAT_COLORS[threat.threat_level] || THREAT_COLORS.medium}`}>
            {threat.threat_level?.toUpperCase()}
          </Badge>
          <span className={`font-mono text-[9px] ${STATUS_COLORS[threat.status] || 'text-muted-foreground'}`}>
            {threat.status?.replace(/_/g, ' ').toUpperCase()}
          </span>
          <button
            onClick={handleBlock}
            disabled={blocking}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 transition-all font-mono text-[8px] font-bold disabled:opacity-50"
            title={`Block ${threat.source_ip}`}
          >
            {blocking ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Ban className="w-2.5 h-2.5" />}
            {blocking ? 'BLOCKING' : 'BLOCK'}
          </button>
          {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-border/30 space-y-2 bg-secondary/20">
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
              {threat.qrng_cycle > 0 && (
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground">QRNG Cycle</span>
                  <span className="font-mono text-[10px] text-foreground">{threat.qrng_cycle}</span>
                </div>
              )}
              {threat.notes && (
                <p className="font-mono text-[10px] text-muted-foreground mt-1">{threat.notes}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AnomalyCard({ anomaly }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/50 p-4 hover:border-accent/20 transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-accent" />
          <span className="font-mono text-[10px] font-semibold text-foreground">
            {anomaly.anomaly_type?.replace(/_/g, ' ').toUpperCase()}
          </span>
        </div>
        <Badge className={`font-mono text-[8px] rounded-full border ${
          anomaly.severity === 'fatal' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
          anomaly.severity === 'critical' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
          'bg-secondary text-muted-foreground border-border'
        }`}>
          {anomaly.severity?.toUpperCase()}
        </Badge>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="font-mono text-[9px] text-muted-foreground">
          Confidence: {anomaly.confidence_score || 0}%
        </span>
        <span className="font-mono text-[9px] text-muted-foreground">
          {formatDistanceToNow(new Date(anomaly.created_date), { addSuffix: true })}
        </span>
      </div>
    </motion.div>
  );
}

export default function ThreatLog() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('THREATS');
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const { data: threats = [], isLoading: loadingThreats, refetch } = useQuery({
    queryKey: ['threats-log'],
    queryFn: () => base44.entities.Threat.list('-created_date', 50),
    refetchInterval: 8000,
  });

  const { data: anomalies = [], isLoading: loadingAnomalies } = useQuery({
    queryKey: ['anomalies-log'],
    queryFn: () => base44.entities.ZeroDayAnomaly.list('-created_date', 30),
    refetchInterval: 8000,
  });

  const activeThreats = threats.filter(t => !['destroyed', 'cleared'].includes(t.status));
  const openAnomalies = anomalies.filter(a => a.status !== 'neutralized');

  const handleAIAnalyze = async () => {
    setAnalyzingAI(true);
    setAiResult(null);
    try {
      const res = await base44.functions.invoke('threatDetectionEngine', {});
      setAiResult(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzingAI(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-mono text-base font-bold text-foreground tracking-wider">THREAT LOG</h1>
            <p className="font-mono text-[9px] text-muted-foreground">Proactive · Auto-neutralize active</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="font-mono text-[9px] bg-green-400/10 text-green-400 border border-green-400/20 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse mr-1.5" />
            LIVE
          </Badge>
          <button onClick={() => refetch()} className="w-7 h-7 rounded-xl bg-secondary/50 border border-border flex items-center justify-center hover:bg-secondary transition-all">
            <RefreshCw className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'ACTIVE', value: activeThreats.length, color: 'text-red-400', bg: 'bg-red-500/5 border-red-500/15' },
          { label: 'TOTAL', value: threats.length, color: 'text-primary', bg: 'bg-primary/5 border-primary/15' },
          { label: 'ANOMALIES', value: openAnomalies.length, color: 'text-accent', bg: 'bg-accent/5 border-accent/15' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-3 text-center ${s.bg}`}>
            <p className={`font-mono text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="font-mono text-[8px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab Pills */}
      <div className="flex gap-2 p-1 bg-secondary/40 rounded-2xl">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-xl font-mono text-[10px] font-semibold transition-all ${
              activeTab === tab
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'THREATS' && (
          <motion.div key="threats" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            {/* AI Analyze */}
            <Button
              variant="outline"
              className="w-full font-mono text-xs rounded-2xl border-primary/20 hover:border-primary/40"
              onClick={handleAIAnalyze}
              disabled={analyzingAI}
            >
              {analyzingAI ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" />AI ANALYZING...</> : <><Eye className="w-3 h-3 mr-2" />RUN AI THREAT ANALYSIS</>}
            </Button>

            {aiResult && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-2xl bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="w-3.5 h-3.5 text-primary" />
                  <span className="font-mono text-[10px] font-bold text-primary">AI ANALYSIS COMPLETE</span>
                </div>
                <p className="font-mono text-[9px] text-muted-foreground">Processed: {aiResult.processed || 0} threats · Action: {aiResult.action || 'N/A'}</p>
              </motion.div>
            )}

            {loadingThreats ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
            ) : threats.length === 0 ? (
              <div className="text-center py-12 rounded-2xl bg-green-500/5 border border-green-500/15">
                <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <p className="font-mono text-sm text-green-400 font-semibold">System Clean</p>
                <p className="font-mono text-[10px] text-muted-foreground mt-1">No threats detected</p>
              </div>
            ) : (
              <div className="space-y-2">
                {threats.map(t => <ThreatCard key={t.id} threat={t} onBlock={() => queryClient.invalidateQueries({ queryKey: ['threats-log'] })} />)}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'ANOMALIES' && (
          <motion.div key="anomalies" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            {loadingAnomalies ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
            ) : anomalies.length === 0 ? (
              <div className="text-center py-12 rounded-2xl bg-green-500/5 border border-green-500/15">
                <Shield className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <p className="font-mono text-sm text-green-400 font-semibold">No Anomalies</p>
                <p className="font-mono text-[10px] text-muted-foreground mt-1">Zero-day sensors clear</p>
              </div>
            ) : (
              <div className="space-y-2">
                {anomalies.map(a => <AnomalyCard key={a.id} anomaly={a} />)}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'AGENTS' && (
          <motion.div key="agents" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/50 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-primary" />
                <span className="font-mono text-xs font-bold text-foreground tracking-wider">GUARDIAN RING — 12 AGENTS</span>
                <div className="ml-auto flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="font-mono text-[9px] text-green-400">ALL ONLINE</span>
                </div>
              </div>
              <GuardianRing anomalies={anomalies} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Zap, Shield, Lock, Skull, CheckCircle, AlertTriangle, Bug, Clock, Atom, ArrowRight } from 'lucide-react';

const AGENT_TYPES = ['autonomous_agent', 'bot', 'autonomous_agent', 'bot', 'human'];
const THREAT_LEVELS = ['low', 'medium', 'high', 'critical'];

function randomIP() {
  return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`;
}

const PIPELINE_STEPS = [
  { id: 'base1',   label: 'BASE 1',  color: 'text-blue-400',    bg: 'bg-blue-400',    border: 'border-blue-400/40' },
  { id: 'base0',   label: 'BASE 0',  color: 'text-purple-400',  bg: 'bg-purple-400',  border: 'border-purple-400/40' },
  { id: 'base12',  label: 'BASE 12', color: 'text-cyan-400',    bg: 'bg-cyan-400',    border: 'border-cyan-400/40' },
  { id: 'base60',  label: 'BASE 60', color: 'text-emerald-400', bg: 'bg-emerald-400', border: 'border-emerald-400/40' },
  { id: 'pi',      label: 'π',       color: 'text-amber-400',   bg: 'bg-amber-400',   border: 'border-amber-400/40' },
  { id: 'qrng',    label: 'QRNG',    color: 'text-primary',     bg: 'bg-primary',     border: 'border-primary/40' },
  { id: 'paradox', label: 'PARADOX', color: 'text-accent',      bg: 'bg-accent',      border: 'border-accent/40' },
];

function ThreatRow({ threat }) {
  const stepIndex = PIPELINE_STEPS.findIndex(s => s.id === threat.pipelineStep);
  const isHuman = threat.agentType === 'human';

  const statusColor =
    threat.status === 'cleared'   ? 'text-green-400 border-green-400/30 bg-green-400/10' :
    threat.status === 'destroyed' ? 'text-destructive border-destructive/30 bg-destructive/10' :
    threat.status === 'locked'    ? 'text-amber-400 border-amber-400/30 bg-amber-400/10' :
                                    'text-primary border-primary/30 bg-primary/10';

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      className="bg-secondary/40 border border-border/60 rounded-lg p-3 space-y-2"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            threat.status === 'cleared' ? 'bg-green-400' :
            threat.status === 'destroyed' || threat.status === 'locked' ? 'bg-destructive' :
            'bg-primary animate-pulse'
          }`} />
          <span className="font-mono text-[11px] font-bold text-foreground">{threat.ip}</span>
          <Badge variant="outline" className={`font-mono text-[8px] ${isHuman ? 'text-green-400 border-green-400/30' : 'text-accent border-accent/30'}`}>
            {threat.agentType.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
        <Badge className={`font-mono text-[8px] border ${statusColor}`}>
          {threat.status.toUpperCase()}
        </Badge>
      </div>

      {/* Pipeline progress */}
      <div className="flex items-center gap-1">
        {PIPELINE_STEPS.map((step, i) => {
          const done = threat.status === 'cleared' || threat.status === 'destroyed' || threat.status === 'locked'
            ? true
            : i < stepIndex;
          const active = i === stepIndex && !['cleared', 'destroyed', 'locked'].includes(threat.status);
          return (
            <React.Fragment key={step.id}>
              <div className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border transition-all duration-300 ${
                done || active
                  ? `${step.color} ${step.border} bg-opacity-10`
                  : 'text-muted-foreground/30 border-muted-foreground/10'
              } ${active ? 'animate-pulse' : ''}`}>
                {step.label}
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <ArrowRight className={`w-2 h-2 ${done ? 'text-muted-foreground' : 'text-muted-foreground/20'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Status message */}
      {threat.message && (
        <p className="font-mono text-[9px] text-muted-foreground">{threat.message}</p>
      )}
    </motion.div>
  );
}

export default function AttackSimulator() {
  const [running, setRunning] = useState(false);
  const [threats, setThreats] = useState([]);
  const [stats, setStats] = useState({ total: 0, cleared: 0, locked: 0, destroyed: 0, inProgress: 0 });
  const [log, setLog] = useState([]);
  const intervalRef = useRef(null);
  const processingRef = useRef(new Set());
  const queryClient = useQueryClient();
  const logRef = useRef(null);

  const createThreat = useMutation({ mutationFn: (d) => base44.entities.Threat.create(d) });
  const updateThreat = useMutation({ mutationFn: ({ id, d }) => base44.entities.Threat.update(id, d) });
  const createEvent  = useMutation({ mutationFn: (d) => base44.entities.SecurityEvent.create(d) });

  const addLog = (msg, color = 'text-muted-foreground') => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLog(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 60));
  };

  const processThreat = async (local) => {
    if (processingRef.current.has(local.localId)) return;
    processingRef.current.add(local.localId);

    const isHuman = local.agentType === 'human';
    const isBad   = !isHuman;
    const delay   = (ms) => new Promise(r => setTimeout(r, ms));

    const updateLocal = (patch) => {
      setThreats(prev => prev.map(t => t.localId === local.localId ? { ...t, ...patch } : t));
    };

    addLog(`⚡ New ${local.agentType} detected: ${local.ip}`, 'text-accent');

    // DB record
    const dbThreat = await createThreat.mutateAsync({
      source_ip: local.ip,
      threat_level: local.threatLevel,
      status: 'detected',
      agent_type: local.agentType,
      environment: isBad ? 'mirror' : 'production',
    });

    // Walk through BASE CHAIN steps
    for (let i = 0; i < 6; i++) {
      const step = PIPELINE_STEPS[i];
      updateLocal({ pipelineStep: step.id, message: `Computing ${step.label}...` });
      addLog(`  ↳ ${local.ip} — ${step.label} processing`);
      await delay(400);
    }

    // PARADOX LOCK
    updateLocal({ pipelineStep: 'paradox', message: 'Evaluating paradox challenge...' });
    addLog(`  🔒 ${local.ip} — PARADOX LOCK engaged`, 'text-amber-400');
    await delay(700);

    if (isHuman) {
      // Human passes
      await updateThreat.mutateAsync({ id: dbThreat.id, d: { status: 'cleared', paradox_passed: true, qrng_cycle: 0 } });
      await createEvent.mutateAsync({
        event_type: 'access_granted', severity: 'info',
        details: `Human ${local.ip} passed paradox lock. Access granted.`,
        environment: 'production', threat_id: String(dbThreat.id),
      });
      updateLocal({ pipelineStep: 'done', status: 'cleared', message: '✓ Human verified — access granted' });
      addLog(`  ✅ ${local.ip} — CLEARED (human passed paradox)`, 'text-green-400');
      setStats(p => ({ ...p, cleared: p.cleared + 1, inProgress: Math.max(0, p.inProgress - 1) }));
    } else {
      // Agent fails — QRNG cycles
      addLog(`  ⚠ ${local.ip} — PARADOX FAILED (agent cannot fact-check faith)`, 'text-destructive');
      await createEvent.mutateAsync({
        event_type: 'paradox_challenge', severity: 'critical',
        details: `${local.agentType} ${local.ip} failed paradox. Initiating 3 QRNG cycles.`,
        environment: 'mirror', threat_id: String(dbThreat.id),
      });

      // Redirect to mirror / honeypot
      const env = Math.random() > 0.5 ? 'honeypot' : 'tarpit';
      await createEvent.mutateAsync({
        event_type: env === 'honeypot' ? 'honeypot_trigger' : 'tarpit_engage',
        severity: 'warning',
        details: `${local.ip} redirected to ${env} in mirror environment`,
        environment: env, threat_id: String(dbThreat.id),
      });
      addLog(`  🪤 ${local.ip} — redirected to ${env.toUpperCase()}`, 'text-amber-400');

      for (let cycle = 1; cycle <= 3; cycle++) {
        updateLocal({ message: `QRNG Cycle ${cycle}/3 computing...` });
        addLog(`  ⚛ ${local.ip} — QRNG cycle ${cycle}/3`);
        await delay(600);
        await updateThreat.mutateAsync({ id: dbThreat.id, d: { status: `cycle_${cycle}`, qrng_cycle: cycle } });
        await createEvent.mutateAsync({
          event_type: 'qrng_cycle', severity: cycle === 3 ? 'fatal' : 'critical',
          details: `QRNG Cycle ${cycle}/3 for ${local.ip}. ${cycle === 3 ? 'THREAT NEUTRALIZED.' : ''}`,
          base_chain_step: 'qrng', environment: 'mirror', threat_id: String(dbThreat.id),
        });
      }

      const finalStatus = Math.random() > 0.3 ? 'destroyed' : 'locked';
      await updateThreat.mutateAsync({ id: dbThreat.id, d: { status: finalStatus, paradox_passed: false } });
      updateLocal({ status: finalStatus, message: finalStatus === 'destroyed' ? '💀 Threat destroyed' : '🔒 Threat locked out' });
      addLog(`  ${finalStatus === 'destroyed' ? '💀 DESTROYED' : '🔒 LOCKED'}: ${local.ip}`, 'text-destructive');
      setStats(p => ({
        ...p,
        [finalStatus]: p[finalStatus] + 1,
        inProgress: Math.max(0, p.inProgress - 1),
      }));
    }

    queryClient.invalidateQueries();
    processingRef.current.delete(local.localId);
  };

  const spawnThreat = () => {
    const agentType = AGENT_TYPES[Math.floor(Math.random() * AGENT_TYPES.length)];
    const local = {
      localId: `${Date.now()}-${Math.random()}`,
      ip: randomIP(),
      agentType,
      threatLevel: THREAT_LEVELS[Math.floor(Math.random() * THREAT_LEVELS.length)],
      pipelineStep: 'base1',
      status: 'processing',
      message: 'Detected...',
    };
    setThreats(prev => [local, ...prev].slice(0, 12));
    setStats(p => ({ ...p, total: p.total + 1, inProgress: p.inProgress + 1 }));
    processThreat(local);
  };

  useEffect(() => {
    if (running) {
      spawnThreat();
      intervalRef.current = setInterval(() => spawnThreat(), 2800);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [log]);

  const handleToggle = () => {
    if (running) {
      setRunning(false);
      addLog('--- SIMULATION STOPPED ---', 'text-muted-foreground');
    } else {
      setThreats([]);
      setStats({ total: 0, cleared: 0, locked: 0, destroyed: 0, inProgress: 0 });
      setLog([]);
      setRunning(true);
      addLog('--- SIMULATION STARTED ---', 'text-primary');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">ATTACK SIMULATOR</h1>
          <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-1">
            REAL-TIME THREAT GENERATION & PIPELINE PROCESSING
          </p>
        </div>
        <Button
          onClick={handleToggle}
          className={`font-mono text-xs px-6 ${running ? 'bg-destructive hover:bg-destructive/80' : 'bg-primary hover:bg-primary/80'}`}
        >
          {running
            ? <><Square className="w-4 h-4 mr-2" /> STOP</>
            : <><Play  className="w-4 h-4 mr-2" /> START SIMULATION</>}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'TOTAL',       value: stats.total,      color: 'text-primary',     icon: Zap },
          { label: 'IN PROGRESS', value: stats.inProgress, color: 'text-amber-400',   icon: Atom },
          { label: 'CLEARED',     value: stats.cleared,    color: 'text-green-400',   icon: CheckCircle },
          { label: 'LOCKED',      value: stats.locked,     color: 'text-amber-500',   icon: Lock },
          { label: 'DESTROYED',   value: stats.destroyed,  color: 'text-destructive', icon: Skull },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
            <Icon className={`w-4 h-4 ${color} mx-auto mb-2`} />
            <motion.div key={value} initial={{ scale: 0.7 }} animate={{ scale: 1 }} className={`font-mono text-2xl font-bold ${color}`}>
              {value}
            </motion.div>
            <div className="font-mono text-[9px] text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Live threats */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {running && <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />}
            <h3 className="font-mono text-[10px] text-muted-foreground tracking-widest">
              LIVE THREAT PIPELINE {running && '— ACTIVE'}
            </h3>
          </div>

          {threats.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Shield className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="font-mono text-xs text-muted-foreground">Press START to begin simulation</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              <AnimatePresence>
                {threats.map(t => <ThreatRow key={t.localId} threat={t} />)}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Terminal log */}
        <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive/70" />
            <div className="w-3 h-3 rounded-full bg-amber-400/70" />
            <div className="w-3 h-3 rounded-full bg-green-400/70" />
            <span className="font-mono text-[10px] text-muted-foreground ml-2 tracking-wider">AEGIS — SECURITY LOG</span>
          </div>
          <div ref={logRef} className="flex-1 p-4 overflow-y-auto max-h-[520px] space-y-0.5 font-mono text-[10px]">
            {log.length === 0 ? (
              <span className="text-muted-foreground">{'>'} Awaiting simulation start...</span>
            ) : (
              log.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`leading-relaxed ${
                    line.includes('CLEARED') || line.includes('✅') ? 'text-green-400' :
                    line.includes('DESTROYED') || line.includes('💀') ? 'text-destructive' :
                    line.includes('LOCKED') || line.includes('🔒') ? 'text-amber-400' :
                    line.includes('FAILED') || line.includes('⚠') ? 'text-accent' :
                    line.includes('STARTED') || line.includes('STOPPED') ? 'text-primary font-bold' :
                    'text-muted-foreground'
                  }`}
                >
                  {line}
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
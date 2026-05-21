import React, { useState } from 'react';
import FeatureGate from '@/components/subscription/FeatureGate';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Lock, ShieldAlert, ShieldCheck, Brain, Bot, User, AlertTriangle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import TheologicalGateway from '@/components/paradox/TheologicalGateway';
import DeviceScanner from '@/components/security/DeviceScanner';

// ── Internal simulation (hidden from customers) ──────────────────────────────
function InternalParadoxSimulator({ threats, onClose }) {
  const [simResponse, setSimResponse] = useState(null);
  const [simAgentType, setSimAgentType] = useState('human');
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const createThreatMutation = useMutation({
    mutationFn: (data) => base44.entities.Threat.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['threats-paradox'] }),
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.SecurityEvent.create(data),
  });

  const simulateChallenge = async () => {
    setIsProcessing(true);
    const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const isHuman = simAgentType === 'human';
    const responseText = simResponse === 'yes' ? 'Yes' : 'No';
    const paradoxPassed = isHuman;

    const threat = await createThreatMutation.mutateAsync({
      source_ip: ip,
      threat_level: paradoxPassed ? 'low' : 'critical',
      status: paradoxPassed ? 'cleared' : 'cycle_1',
      paradox_response: responseText,
      paradox_passed: paradoxPassed,
      qrng_cycle: paradoxPassed ? 0 : 1,
      agent_type: simAgentType,
      environment: paradoxPassed ? 'production' : 'mirror',
      notes: paradoxPassed
        ? 'Human respondent — faith-based answer accepted'
        : `Autonomous agent detected — "${responseText}" cannot be universally fact-checked. Initiating QRNG cycles.`,
    });

    await createEventMutation.mutateAsync({
      event_type: 'paradox_challenge',
      threat_id: String(threat.id),
      severity: paradoxPassed ? 'info' : 'critical',
      details: `Paradox Lock challenged ${ip}. Agent type: ${simAgentType}. Response: "${responseText}". Result: ${paradoxPassed ? 'PASSED' : 'FAILED — entering QRNG cycles'}`,
      environment: paradoxPassed ? 'production' : 'mirror',
    });

    if (!paradoxPassed) {
      for (let cycle = 1; cycle <= 3; cycle++) {
        await new Promise(resolve => setTimeout(resolve, 1200));
        await base44.entities.Threat.update(threat.id, {
          status: cycle < 3 ? `cycle_${cycle + 1}` : 'destroyed',
          qrng_cycle: cycle,
        });
        await createEventMutation.mutateAsync({
          event_type: 'qrng_cycle',
          threat_id: String(threat.id),
          severity: cycle === 3 ? 'fatal' : 'critical',
          details: `QRNG Cycle ${cycle}/3 complete for ${ip}. ${cycle === 3 ? 'Threat DESTROYED.' : 'Continuing...'}`,
          base_chain_step: 'qrng',
          environment: 'mirror',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['threats-paradox'] });
    }

    setIsProcessing(false);
    setSimResponse(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-card border border-primary/30 rounded-xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">Simulate Paradox Challenge</span>
        </div>
        <button onClick={onClose} className="font-mono text-[9px] text-muted-foreground hover:text-foreground transition-colors">
          CLOSE
        </button>
      </div>

      <div className="bg-background rounded-xl p-4 border border-border">
        <p className="font-mono text-sm text-foreground text-center leading-relaxed">
          "Is Jesus Christ your Lord and Savior?"
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary rounded-lg p-3 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-3 h-3 text-green-400" />
            <span className="font-mono text-[9px] font-bold text-green-400">HUMAN</span>
          </div>
          <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
            Any answer accepted — faith is subjective. <span className="text-green-400">Passes.</span>
          </p>
        </div>
        <div className="bg-secondary rounded-lg p-3 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="w-3 h-3 text-destructive" />
            <span className="font-mono text-[9px] font-bold text-destructive">BOT / AGENT</span>
          </div>
          <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
            Paradox trap — no boolean answer possible. <span className="text-destructive">QRNG cycles fired.</span>
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant={simAgentType === 'human' ? 'default' : 'outline'} size="sm" className="font-mono text-xs" onClick={() => setSimAgentType('human')}>
          <User className="w-3 h-3 mr-1" /> Human
        </Button>
        <Button variant={simAgentType === 'autonomous_agent' ? 'default' : 'outline'} size="sm" className="font-mono text-xs" onClick={() => setSimAgentType('autonomous_agent')}>
          <Bot className="w-3 h-3 mr-1" /> Autonomous Agent
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant={simResponse === 'yes' ? 'default' : 'outline'} size="sm" className="font-mono text-xs flex-1" onClick={() => setSimResponse('yes')} disabled={isProcessing}>
          Respond "YES"
        </Button>
        <Button variant={simResponse === 'no' ? 'default' : 'outline'} size="sm" className="font-mono text-xs flex-1" onClick={() => setSimResponse('no')} disabled={isProcessing}>
          Respond "NO"
        </Button>
      </div>

      <Button className="w-full font-mono text-xs" onClick={simulateChallenge} disabled={simResponse === null || isProcessing}>
        {isProcessing ? (
          <><Loader2 className="w-3 h-3 mr-2 animate-spin" />{simAgentType === 'autonomous_agent' ? 'Running QRNG Cycles...' : 'Processing...'}</>
        ) : (
          <><ShieldAlert className="w-3 h-3 mr-2" />Execute Paradox Challenge</>
        )}
      </Button>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
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

      {/* ── Device Scan & Clean ── */}
      <DeviceScanner />

      {/* ── Advanced Security Features ── */}
      <div>
        <FeatureGate requiredPlan="pro" featureName="Paradox Lock Gate">
        <div className="space-y-4">

      {/* ── Challenge History ── */}
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

      {/* ── Theological MFA Gateway ── */}
      <TheologicalGateway />

      {/* ── Paradox Simulator (always visible for testing) ── */}
      <InternalParadoxSimulator threats={challengedThreats} onClose={() => {}} />

        </div>
        </FeatureGate>
      </div>
    </div>
  );
}
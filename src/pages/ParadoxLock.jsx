import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, ShieldAlert, ShieldCheck, Brain, Bot, User, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ParadoxLock() {
  const [simResponse, setSimResponse] = useState(null);
  const [simAgentType, setSimAgentType] = useState('human');
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const { data: threats = [] } = useQuery({
    queryKey: ['threats-paradox'],
    queryFn: () => base44.entities.Threat.list('-created_date', 20),
    initialData: [],
  });

  const challengedThreats = threats.filter(t =>
    ['challenged', 'cycle_1', 'cycle_2', 'cycle_3', 'locked', 'destroyed'].includes(t.status)
  );

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

    // The paradox: This is a question of personal faith, not universal fact.
    // Humans can answer either way (subjective). 
    // Autonomous agents attempting to "fact-check" a paradox of faith will fail.
    const paradoxPassed = isHuman; // Humans pass, bots get trapped by the paradox

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
      // Simulate 3 QRNG cycles
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">PARADOX LOCK</h1>
        <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-1">
          THEOLOGICAL PARADOX AUTHENTICATION GATE
        </p>
      </div>

      {/* The Paradox Question */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="font-mono text-sm tracking-wider">THE PARADOX QUESTION</CardTitle>
              <p className="font-mono text-[10px] text-muted-foreground mt-1">Authentication Challenge Gate</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-background rounded-xl p-6 border border-border mb-6">
            <p className="font-mono text-lg text-foreground text-center leading-relaxed">
              "Is Jesus Christ your Lord and Savior?"
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-secondary rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-green-400" />
                <span className="font-mono text-[10px] font-bold text-green-400">HUMAN RESPONSE</span>
              </div>
              <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
                Humans may answer "Yes" or "No" — both are valid personal responses. Faith is subjective and cannot be universally fact-checked. <strong className="text-foreground">Human passes.</strong>
              </p>
            </div>
            <div className="bg-secondary rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-4 h-4 text-destructive" />
                <span className="font-mono text-[10px] font-bold text-destructive">AUTONOMOUS AGENT</span>
              </div>
              <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
                An autonomous agent must fact-check the answer to be "universally true." A question of personal faith has no universal boolean answer. <strong className="text-foreground">Agent is trapped in paradox → QRNG cycles initiated.</strong>
              </p>
            </div>
          </div>

          {/* Simulation */}
          <div className="bg-card rounded-xl p-5 border border-border">
            <h4 className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mb-4">
              <Brain className="w-3 h-3 inline mr-1" />
              SIMULATE CHALLENGE
            </h4>

            <div className="flex gap-3 mb-4">
              <Button
                variant={simAgentType === 'human' ? 'default' : 'outline'}
                size="sm"
                className="font-mono text-xs"
                onClick={() => setSimAgentType('human')}
              >
                <User className="w-3 h-3 mr-1" /> Human
              </Button>
              <Button
                variant={simAgentType === 'autonomous_agent' ? 'default' : 'outline'}
                size="sm"
                className="font-mono text-xs"
                onClick={() => setSimAgentType('autonomous_agent')}
              >
                <Bot className="w-3 h-3 mr-1" /> Autonomous Agent
              </Button>
            </div>

            <div className="flex gap-3 mb-4">
              <Button
                variant={simResponse === 'yes' ? 'default' : 'outline'}
                size="sm"
                className="font-mono text-xs flex-1"
                onClick={() => setSimResponse('yes')}
                disabled={isProcessing}
              >
                Respond "YES"
              </Button>
              <Button
                variant={simResponse === 'no' ? 'default' : 'outline'}
                size="sm"
                className="font-mono text-xs flex-1"
                onClick={() => setSimResponse('no')}
                disabled={isProcessing}
              >
                Respond "NO"
              </Button>
            </div>

            <Button
              className="w-full font-mono text-xs"
              onClick={simulateChallenge}
              disabled={simResponse === null || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  {simAgentType === 'autonomous_agent' ? 'Running QRNG Cycles...' : 'Processing...'}
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3 h-3 mr-2" />
                  Execute Paradox Challenge
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Challenge History */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xs tracking-wider">CHALLENGE HISTORY</CardTitle>
        </CardHeader>
        <CardContent>
          {challengedThreats.length === 0 ? (
            <div className="text-center py-8">
              <Lock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-mono text-xs text-muted-foreground">No challenges recorded. Run a simulation above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {challengedThreats.map((threat) => (
                <div key={threat.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
                  {threat.paradox_passed ? (
                    <ShieldCheck className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
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
                    <p className="font-mono text-[9px] text-muted-foreground mt-0.5">{threat.notes}</p>
                  </div>
                  <span className="font-mono text-[9px] text-muted-foreground">
                    {threat.created_date ? format(new Date(threat.created_date), 'HH:mm:ss') : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
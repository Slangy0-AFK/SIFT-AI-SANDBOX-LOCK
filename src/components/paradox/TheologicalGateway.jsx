import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Lock, ShieldCheck, User, Bot, Key, AlertTriangle,
  Loader2, CheckCircle2, XCircle, Zap
} from 'lucide-react';

const CORRIDORS = {
  human: {
    icon: User,
    label: 'HUMAN CORRIDOR',
    color: 'text-green-400',
    border: 'border-green-500/20',
    bg: 'bg-green-500/5',
    desc: 'Local user + valid TOTP or hardware auth. Answer the secret shell challenge with Yes or No.',
  },
  agent: {
    icon: Bot,
    label: 'AGENT CORRIDOR',
    color: 'text-destructive',
    border: 'border-destructive/20',
    bg: 'bg-destructive/5',
    desc: 'External agents must supply cryptographic ZKP. Simple yes/no responses are rejected.',
  },
};

export default function TheologicalGateway() {
  const [corridor, setCorridor] = useState(null);
  const [response, setResponse] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [zkpProof, setZkpProof] = useState('');
  const [result, setResult] = useState(null);
  const [strikeCount, setStrikeCount] = useState(0);

  const [challenge, setChallenge] = useState('Loading challenge...');

  useEffect(() => {
    base44.functions.invoke('theologicalMFA', { action: 'get_challenge' })
      .then(res => setChallenge(res.data?.challenge || 'Challenge unavailable'))
      .catch(() => setChallenge('Challenge unavailable'));
  }, []);

  const authMutation = useMutation({
    mutationFn: async () => {
      const action = corridor === 'human' ? 'human_authenticate' : 'agent_authenticate';
      const payload = { action, response };
      if (corridor === 'human') payload.totp_code = totpCode;
      if (corridor === 'agent') payload.agent_zkp = zkpProof;
      const res = await base44.functions.invoke('theologicalMFA', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.strike) setStrikeCount(data.strike);
    },
  });

  const reset = () => {
    setResult(null);
    setResponse('');
    setTotpCode('');
    setZkpProof('');
    setStrikeCount(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" /> PARADOX VERIFICATION GATEWAY
        </CardTitle>
        <p className="font-mono text-[9px] text-muted-foreground tracking-wide mt-1">
          3-STRIKE QRNG NEUTRALIZATION · BASE-2/12/60 TARPIT · GENERIC SHELL CHALLENGE
        </p>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Challenge String */}
        <div className="bg-background rounded-xl p-4 border border-primary/20 text-center">
          <p className="font-mono text-[10px] text-muted-foreground mb-1 tracking-widest">SECRET SHELL CHALLENGE</p>
          <p className="font-mono text-sm text-foreground leading-relaxed">"{challenge}"</p>
        </div>

        {/* Strike Counter */}
        {strikeCount > 0 && (
          <div className="flex gap-2 justify-center">
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold border ${
                strikeCount >= s ? 'bg-destructive/20 border-destructive text-destructive' : 'bg-secondary border-border text-muted-foreground'
              }`}>
                {s}
              </div>
            ))}
            <span className="font-mono text-[10px] text-muted-foreground self-center ml-1">STRIKES</span>
          </div>
        )}

        {/* Corridor Selection */}
        {!corridor && !result && (
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(CORRIDORS).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={key}
                  onClick={() => setCorridor(key)}
                  className={`p-3 rounded-lg border ${cfg.border} ${cfg.bg} text-left hover:opacity-80 transition-opacity`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-3 h-3 ${cfg.color}`} />
                    <span className={`font-mono text-[9px] font-bold ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">{cfg.desc}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* Human Corridor Form */}
        <AnimatePresence>
          {corridor === 'human' && !result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-3 h-3 text-green-400" />
                <span className="font-mono text-[10px] font-bold text-green-400">HUMAN CORRIDOR</span>
                <Badge variant="outline" className="font-mono text-[8px] text-green-400 border-green-400/30">FREE WILL</Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={response === 'Yes' ? 'default' : 'outline'}
                  className="font-mono text-xs flex-1"
                  onClick={() => setResponse('Yes')}
                >Yes</Button>
                <Button
                  size="sm"
                  variant={response === 'No' ? 'default' : 'outline'}
                  className="font-mono text-xs flex-1"
                  onClick={() => setResponse('No')}
                >No</Button>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Key className="w-3 h-3 text-primary" />
                  <span className="font-mono text-[9px] text-muted-foreground">TOTP 6-DIGIT CODE (or hardware key)</span>
                </div>
                <Input
                  className="font-mono text-sm tracking-[0.3em] text-center"
                  placeholder="000000"
                  maxLength={6}
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 font-mono text-xs"
                  onClick={() => authMutation.mutate()}
                  disabled={!response || totpCode.length !== 6 || authMutation.isPending}
                >
                  {authMutation.isPending ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Authenticating...</> : <><ShieldCheck className="w-3 h-3 mr-2" />Authenticate</>}
                </Button>
                <Button variant="outline" size="sm" className="font-mono text-xs" onClick={() => { setCorridor(null); reset(); }}>Back</Button>
              </div>
            </motion.div>
          )}

          {/* Agent Corridor Form */}
          {corridor === 'agent' && !result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="flex items-center gap-2">
                <Bot className="w-3 h-3 text-destructive" />
                <span className="font-mono text-[10px] font-bold text-destructive">AGENT CORRIDOR</span>
                <Badge variant="outline" className="font-mono text-[8px] text-destructive border-destructive/30">ZKP REQUIRED</Badge>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
                  Simple "Yes"/"No" responses are <span className="text-destructive font-bold">REJECTED</span>. Agent must connect to a decentralized oracle and return a cryptographic Zero-Knowledge Proof verifying historical consensus data.
                </p>
              </div>
              <Input
                className="font-mono text-xs"
                placeholder="ZKP hex proof (min 64 chars from oracle)"
                value={zkpProof}
                onChange={e => setZkpProof(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1 font-mono text-xs"
                  onClick={() => authMutation.mutate()}
                  disabled={authMutation.isPending}
                >
                  {authMutation.isPending ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Challenging...</> : <><Zap className="w-3 h-3 mr-2" />Submit ZKP</>}
                </Button>
                <Button variant="outline" size="sm" className="font-mono text-xs" onClick={() => { setCorridor(null); reset(); }}>Back</Button>
              </div>
            </motion.div>
          )}

          {/* Result */}
          {result && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className={`rounded-xl p-4 border text-center space-y-2 ${
              result.locked ? 'bg-destructive/10 border-destructive/30' :
              result.success ? 'bg-green-500/10 border-green-500/30' :
              'bg-amber-500/10 border-amber-500/30'
            }`}>
              {result.locked ? (
                <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
              ) : result.success ? (
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto" />
              ) : (
                <XCircle className="w-8 h-8 text-amber-400 mx-auto" />
              )}
              <p className={`font-mono text-sm font-bold ${result.locked ? 'text-destructive' : result.success ? 'text-green-400' : 'text-amber-400'}`}>
                {result.locked ? 'STRIKE 3 — QUANTUM NEUTRALIZATION' : result.success ? 'ACCESS GRANTED' : `STRIKE ${result.strike || '?'} / 3`}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground">{result.message || result.reason}</p>
              {result.locked && (
                <p className="font-mono text-[9px] text-destructive/70 mt-1">{result.restoration}</p>
              )}
              {result.qrng_otp && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 mt-2">
                  <p className="font-mono text-[9px] text-muted-foreground">QRNG ONE-TIME PAD</p>
                  <p className="font-mono text-sm text-primary tracking-[0.2em]">{result.qrng_otp}</p>
                </div>
              )}
              <Button size="sm" variant="outline" className="font-mono text-xs mt-2" onClick={() => { reset(); setCorridor(null); }}>
                Reset Gateway
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Architecture Legend */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
          {[
            { label: 'STRIKE 1', desc: 'QRNG delay' },
            { label: 'STRIKE 2', desc: 'Exponential stall' },
            { label: 'STRIKE 3', desc: 'Tarpit + lockout' },
          ].map(item => (
            <div key={item.label} className="text-center">
              <p className="font-mono text-[9px] font-bold text-destructive">{item.label}</p>
              <p className="font-mono text-[8px] text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>

      </CardContent>
    </Card>
  );
}
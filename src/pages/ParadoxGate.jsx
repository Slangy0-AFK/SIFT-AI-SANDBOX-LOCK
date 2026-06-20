/**
 * ParadoxGate — Pre-login security challenge gate.
 * This page sits BEFORE the platform login. Users must pass the challenge
 * before they are redirected to the actual login flow.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Lock, User, Bot, Key, AlertTriangle, Loader2, CheckCircle2, XCircle, Zap } from 'lucide-react';

const SESSION_KEY = 'aegis_gate_passed';

export default function ParadoxGate() {
  const [corridor, setCorridor] = useState(null);
  const [response, setResponse] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [zkpProof, setZkpProof] = useState('');
  const [result, setResult] = useState(null);
  const [strikeCount, setStrikeCount] = useState(0);
  const [challenge, setChallenge] = useState('');
  const [loadingChallenge, setLoadingChallenge] = useState(true);

  useEffect(() => {
    // If already passed this session, go straight to login
    if (sessionStorage.getItem(SESSION_KEY) === 'true') {
      base44.auth.redirectToLogin(window.location.origin + '/dashboard');
      return;
    }
    base44.functions.invoke('theologicalMFA', { action: 'get_challenge' })
      .then(res => setChallenge(res.data?.challenge || 'Challenge unavailable'))
      .catch(() => setChallenge('Challenge unavailable'))
      .finally(() => setLoadingChallenge(false));
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
      if (data.success) {
        sessionStorage.setItem(SESSION_KEY, 'true');
        setTimeout(() => {
          base44.auth.redirectToLogin(window.location.origin + '/dashboard');
        }, 1500);
      }
    },
  });

  const reset = () => {
    setResult(null);
    setResponse('');
    setTotpCode('');
    setZkpProof('');
    setCorridor(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Scanline overlay */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-[0.03]">
        <div className="animate-scanline absolute inset-x-0 h-32 bg-gradient-to-b from-transparent via-primary to-transparent" />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <div className="relative">
              <Shield className="w-10 h-10 text-primary" />
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="font-mono text-xl font-bold text-foreground tracking-wider">AEGIS</h1>
              <p className="font-mono text-[10px] text-muted-foreground tracking-widest">QUANTUM SHIELD</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <Lock className="w-3 h-3 text-primary" />
            <span className="font-mono text-xs text-muted-foreground tracking-widest">SECURITY GATEWAY</span>
          </div>
        </div>

        {/* Challenge Card */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">

          {/* Challenge Text */}
          <div className="bg-background rounded-lg p-4 border border-primary/20 text-center">
            <p className="font-mono text-[10px] text-muted-foreground mb-2 tracking-widest">UNIVERSAL CHALLENGE</p>
            {loadingChallenge ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                <span className="font-mono text-xs text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <p className="font-mono text-sm text-foreground leading-relaxed">"{challenge}"</p>
            )}
          </div>

          {/* Strike Counter */}
          {strikeCount > 0 && (
            <div className="flex gap-2 justify-center">
              {[1, 2, 3].map(s => (
                <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold border ${
                  strikeCount >= s ? 'bg-destructive/20 border-destructive text-destructive' : 'bg-secondary border-border text-muted-foreground'
                }`}>{s}</div>
              ))}
              <span className="font-mono text-[10px] text-muted-foreground self-center ml-1">STRIKES</span>
            </div>
          )}

          {/* Corridor Selection */}
          {!corridor && !result && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCorridor('human')}
                className="p-3 rounded-lg border border-green-500/20 bg-green-500/5 text-left hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-3 h-3 text-green-400" />
                  <span className="font-mono text-[9px] font-bold text-green-400">HUMAN</span>
                </div>
                <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">Answer Yes or No + TOTP code</p>
              </button>
              <button
                onClick={() => setCorridor('agent')}
                className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-left hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="w-3 h-3 text-destructive" />
                  <span className="font-mono text-[9px] font-bold text-destructive">AGENT</span>
                </div>
                <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">ZKP cryptographic proof required</p>
              </button>
            </div>
          )}

          <AnimatePresence>
            {/* Human Corridor */}
            {corridor === 'human' && !result && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                <div className="flex gap-2">
                  <Button size="sm" variant={response === 'Yes' ? 'default' : 'outline'} className="font-mono text-xs flex-1" onClick={() => setResponse('Yes')}>Yes</Button>
                  <Button size="sm" variant={response === 'No' ? 'default' : 'outline'} className="font-mono text-xs flex-1" onClick={() => setResponse('No')}>No</Button>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Key className="w-3 h-3 text-primary" />
                    <span className="font-mono text-[9px] text-muted-foreground">TOTP 6-DIGIT CODE</span>
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
                  <Button className="flex-1 font-mono text-xs" onClick={() => authMutation.mutate()} disabled={!response || totpCode.length !== 6 || authMutation.isPending}>
                    {authMutation.isPending ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Verifying...</> : 'Authenticate'}
                  </Button>
                  <Button variant="outline" size="sm" className="font-mono text-xs" onClick={reset}>Back</Button>
                </div>
              </motion.div>
            )}

            {/* Agent Corridor */}
            {corridor === 'agent' && !result && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                <Input className="font-mono text-xs" placeholder="ZKP hex proof (min 64 chars)" value={zkpProof} onChange={e => setZkpProof(e.target.value)} />
                <div className="flex gap-2">
                  <Button className="flex-1 font-mono text-xs" onClick={() => authMutation.mutate()} disabled={authMutation.isPending}>
                    {authMutation.isPending ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Challenging...</> : <><Zap className="w-3 h-3 mr-2" />Submit ZKP</>}
                  </Button>
                  <Button variant="outline" size="sm" className="font-mono text-xs" onClick={reset}>Back</Button>
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
                {result.locked ? <AlertTriangle className="w-8 h-8 text-destructive mx-auto" /> :
                  result.success ? <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto" /> :
                  <XCircle className="w-8 h-8 text-amber-400 mx-auto" />}
                <p className={`font-mono text-sm font-bold ${result.locked ? 'text-destructive' : result.success ? 'text-green-400' : 'text-amber-400'}`}>
                  {result.locked ? 'STRIKE 3 — LOCKOUT' : result.success ? 'VERIFIED — REDIRECTING...' : `STRIKE ${result.strike || '?'} / 3`}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">{result.message || result.reason}</p>
                {!result.locked && !result.success && (
                  <Button size="sm" variant="outline" className="font-mono text-xs mt-2" onClick={reset}>Try Again</Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Strike legend */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
            {[['STRIKE 1', 'QRNG delay'], ['STRIKE 2', 'Exponential stall'], ['STRIKE 3', 'Tarpit + lockout']].map(([label, desc]) => (
              <div key={label} className="text-center">
                <p className="font-mono text-[9px] font-bold text-destructive">{label}</p>
                <p className="font-mono text-[8px] text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
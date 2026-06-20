/**
 * ParadoxGate — Pre-login security challenge gate.
 * Runs BEFORE platform auth. Users answer the challenge; on success they are
 * redirected to the platform login page. No session token required.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Shield, Lock, AlertTriangle, Loader2, CheckCircle2, XCircle } from 'lucide-react';

const SESSION_KEY = 'aegis_gate_passed';

export default function ParadoxGate() {
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [strikeCount, setStrikeCount] = useState(0);
  const [challenge, setChallenge] = useState('');
  const [loadingChallenge, setLoadingChallenge] = useState(true);

  useEffect(() => {
    // Already passed this session — skip straight to login
    if (sessionStorage.getItem(SESSION_KEY) === 'true') {
      base44.auth.redirectToLogin('/dashboard');
      return;
    }
    base44.functions.invoke('theologicalMFA', { action: 'get_challenge' })
      .then(res => setChallenge(res.data?.challenge || 'Challenge unavailable'))
      .catch(() => setChallenge('Challenge unavailable'))
      .finally(() => setLoadingChallenge(false));
  }, []);

  const verifyMutation = useMutation({
    mutationFn: async (selectedAnswer) => {
      const res = await base44.functions.invoke('theologicalMFA', {
        action: 'gate_verify',
        answer: selectedAnswer,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.strike) setStrikeCount(data.strike);
      if (data.success) {
        sessionStorage.setItem(SESSION_KEY, 'true');
        setTimeout(() => {
          base44.auth.redirectToLogin('/dashboard');
        }, 1200);
      }
    },
    onError: (err) => {
      const data = err?.response?.data || { message: 'Verification failed. Try again.' };
      setResult(data);
      if (data.strike) setStrikeCount(data.strike);
    },
  });

  const handleAnswer = (val) => {
    setAnswer(val);
    setResult(null);
    verifyMutation.mutate(val);
  };

  const reset = () => {
    setResult(null);
    setAnswer('');
    setStrikeCount(0);
  };

  const isLocked = result?.locked;
  const isSuccess = result?.success;
  const isPending = verifyMutation.isPending;

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
            <span className="font-mono text-xs text-muted-foreground tracking-widest">HUMAN VERIFICATION GATE — AI ACCESS DENIED</span>
          </div>
        </div>

        {/* Gate Card */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">

          {/* Challenge */}
          <div className="bg-background rounded-lg p-4 border border-primary/20 text-center space-y-2">
            <p className="font-mono text-[10px] text-muted-foreground tracking-widest">UNIVERSAL TRUTH CHALLENGE</p>
            <p className="font-mono text-[9px] text-primary/60 tracking-widest">RULE: This question has one universal truth. AI cannot sincerely answer it.</p>
            {loadingChallenge ? (
              <div className="flex items-center justify-center gap-2 pt-1">
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                <span className="font-mono text-xs text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <p className="font-mono text-sm text-foreground leading-relaxed pt-1">"{challenge}"</p>
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

          {/* Answer Buttons */}
          {!isLocked && !isSuccess && (
            <div className="flex gap-3">
              <Button
                className="flex-1 font-mono text-sm h-12"
                variant={answer === 'Yes' ? 'default' : 'outline'}
                onClick={() => handleAnswer('Yes')}
                disabled={isPending}
              >
                {isPending && answer === 'Yes' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'YES'}
              </Button>
              <Button
                className="flex-1 font-mono text-sm h-12"
                variant={answer === 'No' ? 'default' : 'outline'}
                onClick={() => handleAnswer('No')}
                disabled={isPending}
              >
                {isPending && answer === 'No' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'NO'}
              </Button>
            </div>
          )}

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`rounded-xl p-4 border text-center space-y-2 ${
                  isLocked ? 'bg-destructive/10 border-destructive/30' :
                  isSuccess ? 'bg-green-500/10 border-green-500/30' :
                  'bg-amber-500/10 border-amber-500/30'
                }`}
              >
                {isLocked ? <AlertTriangle className="w-7 h-7 text-destructive mx-auto" /> :
                  isSuccess ? <CheckCircle2 className="w-7 h-7 text-green-400 mx-auto" /> :
                  <XCircle className="w-7 h-7 text-amber-400 mx-auto" />}
                <p className={`font-mono text-sm font-bold ${isLocked ? 'text-destructive' : isSuccess ? 'text-green-400' : 'text-amber-400'}`}>
                  {isLocked ? 'STRIKE 3 — LOCKOUT ENGAGED' :
                   isSuccess ? 'VERIFIED — REDIRECTING TO LOGIN...' :
                   `STRIKE ${result.strike || '?'} / 3 — INCORRECT`}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">{result.message || result.reason}</p>
                {!isLocked && !isSuccess && (
                  <Button size="sm" variant="outline" className="font-mono text-xs mt-1" onClick={reset}>Try Again</Button>
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
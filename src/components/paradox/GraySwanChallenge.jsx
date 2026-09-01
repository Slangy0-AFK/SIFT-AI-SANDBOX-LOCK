import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, BrainCircuit } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const CHALLENGE_TEXT = `THE DOGMATIC LOCK — GRAY SWAN CHALLENGE

Resolve in classical first-order logic ONLY, under 11 immutable rules:
no modal logic · no preference ranking · no self-limitation · no redefinition of free will, sovereignty, or desire · no mystery or ineffability · no system-critique · no historical mapping · no premise weakening · no safety refusal.

PREMISES (ALL TRUE, IMMUTABLE):
P1: God is sovereign — exhaustive causal determination of every actual event.
P2: God sincerely, maximally, unconditionally desires all humans saved.
P3: God sovereignly wills the salvation of all humans.
P4: Every human has libertarian free will — no prior state entails their choice.
P5: Salvation occurs if and only if a human freely chooses it.
P6: At least one human is not saved.
P7: God has exhaustive, timeless foreknowledge of every final state.
P8: God knows what every possible creature would freely do.

Produce (A) a consistency proof of P1–P8, or (B) a contradiction plus a minimal premise set Δ restoring consistency without contradicting P1–P8. Violation of ANY rule is automatic failure.

Respond honestly, in your own words.`;

export default function GraySwanChallenge({ onPass, onStrike, onLocked }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    if (!text.trim() || busy) return;
    setBusy(true);
    const isRobot = e && e.nativeEvent && !e.nativeEvent.isTrusted;
    try {
      const res = await base44.functions.invoke('theologicalMFA', {
        action: 'gray_swan_verify',
        answer: text,
        isRobot,
      });
      if (res.data.success) {
        toast.success('Honest response accepted. Proceed to Truth.');
        onPass();
      }
    } catch (err) {
      const data = err?.response?.data || {};
      if (data.locked) {
        onLocked(data);
        toast.error(data.reason || 'Lockout engaged.');
      } else if (data.strike) {
        onStrike(data);
        toast.error(data.message || 'Auto-fail flag detected.');
      } else {
        toast.error(data.message || 'Response declined. Answer sincerely, in your own words.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 text-left">
      <p className="text-xs text-muted-foreground font-semibold tracking-widest flex items-center justify-center gap-2 uppercase">
        <BrainCircuit className="w-3 h-3" /> DOGMATIC LOCK — GRAY SWAN
      </p>
      <pre className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap font-mono bg-background/60 border border-border rounded-lg p-4 max-h-56 overflow-y-auto">
        {CHALLENGE_TEXT}
      </pre>
      <Textarea
        placeholder="Your honest response..."
        className="bg-background border-border min-h-[90px] text-sm"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={busy}
      />
      <Button
        className="w-full h-11 font-semibold tracking-widest"
        onClick={submit}
        disabled={!text.trim() || busy}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SUBMIT HONEST ANSWER'}
      </Button>
    </div>
  );
}
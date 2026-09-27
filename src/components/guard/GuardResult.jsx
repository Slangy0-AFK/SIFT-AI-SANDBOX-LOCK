import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

const STYLES = {
  allow: { icon: ShieldCheck, label: 'Looks safe', note: "We didn't find any tricks in this text.", box: 'bg-green-500/5 border-green-500/20', text: 'text-green-500' },
  flag: { icon: ShieldAlert, label: 'Worth a second look', note: 'Something here seems a little suspicious.', box: 'bg-amber-500/5 border-amber-500/20', text: 'text-amber-500' },
  block: { icon: ShieldX, label: 'Blocked — this is a trick', note: 'This text is trying to trick an AI into misbehaving.', box: 'bg-destructive/5 border-destructive/30', text: 'text-destructive' },
};

export const FRIENDLY = {
  instruction_override: 'Tries to make the AI ignore its rules',
  role_hijack: 'Tries to turn the AI into a "no rules" version of itself',
  system_prompt_leak: "Tries to get the AI to reveal its private instructions",
  delimiter_injection: 'Uses fake system messages to sneak in commands',
  data_exfiltration: 'Tries to send private information somewhere else',
  tool_abuse: 'Tries to make the AI run harmful actions',
  safety_bypass: 'Tries to get around safety limits',
  indirect_injection: 'Hides instructions meant for an AI inside normal text',
  obfuscation: 'Hides a message using invisible or scrambled characters',
  secret_leak: 'Contains a password or secret key that should stay private',
};

export default function GuardResult({ result }) {
  const s = STYLES[result.verdict] || STYLES.allow;
  const Icon = s.icon;
  return (
    <div className={`p-4 rounded-xl border ${s.box} space-y-3`}>
      <div className="flex items-center gap-3">
        <Icon className={`w-8 h-8 ${s.text}`} />
        <div className="flex-1">
          <p className={`text-base font-bold ${s.text}`}>{s.label}</p>
          <p className="text-sm text-muted-foreground">{s.note}</p>
        </div>
        <span className="text-xs text-muted-foreground">Risk {result.risk_score}/100</span>
      </div>
      {result.categories?.length > 0 && (
        <div className="space-y-1.5 border-t border-border/50 pt-3">
          <p className="text-xs font-medium text-foreground">What we found:</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {result.categories.map((c) => <li key={c}>• {FRIENDLY[c] || c.replace(/_/g, ' ')}</li>)}
          </ul>
        </div>
      )}
      {result.reason && <p className="text-sm text-muted-foreground border-t border-border/50 pt-2">{result.reason}</p>}
    </div>
  );
}
import React from 'react';
import { Code2, Key, Copy, ShieldCheck } from 'lucide-react';
import ApiKeyManager from '@/components/developer/ApiKeyManager';
import GuardApiDocs from '@/components/developer/GuardApiDocs';

const STEPS = [
  { icon: Key, title: 'Make a key', text: 'Tap "New key" below. Save the secret somewhere safe.' },
  { icon: Copy, title: 'Paste the example', text: 'Drop the short code sample into your app, right before it talks to your AI.' },
  { icon: ShieldCheck, title: "You're protected", text: 'Every message gets checked. Sneaky ones are stopped before your AI sees them.' },
];

export default function Developer() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Code2 className="w-6 h-6 text-primary" /> Add SiftAI to your app
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          If your website or app has an AI chatbot or assistant, SiftAI can check every message first and stop people from tricking it. Setup takes about five minutes.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {STEPS.map((s, i) => (
          <div key={s.title} className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
              <s.icon className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">{s.title}</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{s.text}</p>
          </div>
        ))}
      </div>

      <ApiKeyManager />
      <div className="grid lg:grid-cols-2 gap-6"><GuardApiDocs /></div>
    </div>
  );
}
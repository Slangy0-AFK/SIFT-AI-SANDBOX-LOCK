import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import CodeBlock from '@/components/developer/CodeBlock';

const ENDPOINT = 'https://siftai.base44.app/functions/promptGuardApi';

const SNIPPET = `// 1. Before your AI reads a message, ask SiftAI if it's safe
const res = await fetch('${ENDPOINT}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': 'YOUR_SECRET_KEY' },
  body: JSON.stringify({ text: userMessage })
});
const { verdict } = await res.json();

// 2. If SiftAI says "block", don't send it to your AI
if (verdict === 'block') {
  return "Sorry, I can't help with that.";
}`;

const ANSWERS = [
  ['allow', 'Looks normal. Go ahead.'],
  ['flag', 'Something seems a little off. You may want a person to look.'],
  ['block', 'Someone is trying to trick your AI. Stop it here.'],
];

export default function GuardApiDocs() {
  return (
    <Card className="lg:col-span-2 border-primary/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> How to use it</CardTitle>
        <p className="text-xs text-muted-foreground">
          Send SiftAI the text, and it answers with one simple word. Copy this example and swap in your secret key.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <CodeBlock code={SNIPPET} />
        <div className="space-y-2">
          <p className="text-foreground font-medium text-sm">What the answers mean</p>
          {ANSWERS.map(([v, t]) => (
            <div key={v} className="flex gap-3 text-xs"><span className="font-mono text-foreground w-12">{v}</span><span>{t}</span></div>
          ))}
        </div>
        <div className="space-y-1 text-xs">
          <p className="text-foreground font-medium text-sm">Optional extras</p>
          <p>• Check your AI's replies too — add <span className="font-mono text-foreground">direction: 'output'</span> to catch it spilling private info.</p>
          <p>• Want an extra-careful check? Add <span className="font-mono text-foreground">deep: true</span>. It's a bit slower but catches cleverly reworded tricks.</p>
        </div>
      </CardContent>
    </Card>
  );
}
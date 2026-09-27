import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import CodeBlock from '@/components/developer/CodeBlock';

const ENDPOINT = 'https://siftai.base44.app/functions/promptGuardApi';

const SNIPPET = `// Before sending user or document text to your LLM
const res = await fetch('${ENDPOINT}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.SIFTAI_SECRET },
  body: JSON.stringify({ text: userMessage, direction: 'input' })
});
const { verdict, risk_score, categories } = await res.json();
if (verdict === 'block') return refuse();

// After the model responds — catch leaked prompts/secrets
await fetch('${ENDPOINT}', { /* same headers */
  body: JSON.stringify({ text: modelReply, direction: 'output', canary: 'CANARY-7f3a' })
});`;

export default function GuardApiDocs() {
  return (
    <Card className="lg:col-span-2 border-primary/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-primary" /> Prompt Guard API</CardTitle>
        <p className="text-xs text-muted-foreground">
          Screen prompts, retrieved documents, and tool results for injection, jailbreaks, system-prompt extraction, exfiltration and tool abuse — and scan model output for leaked canaries or secrets.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <CodeBlock code={SNIPPET} />
        <ul className="space-y-1">
          <li><span className="text-foreground font-mono">text</span> — required, up to 20,000 chars</li>
          <li><span className="text-foreground font-mono">direction</span> — "input" (default) or "output"</li>
          <li><span className="text-foreground font-mono">canary</span> — optional token planted in your system prompt; flagged if it appears in output</li>
          <li><span className="text-foreground font-mono">deep</span> — true adds an AI classifier pass (slower, catches paraphrased attacks)</li>
          <li>Returns <span className="text-foreground font-mono">verdict</span> (allow | flag | block), <span className="text-foreground font-mono">risk_score</span> 0–100, <span className="text-foreground font-mono">categories</span>, <span className="text-foreground font-mono">matches</span></li>
        </ul>
      </CardContent>
    </Card>
  );
}
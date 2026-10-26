import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScanLine } from 'lucide-react';
import CodeBlock from './CodeBlock';
import { APP_URL } from './WidgetDocs';

export default function ScanApiDocs() {
  const curl = `curl -X POST ${APP_URL}/functions/scanApi \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_SECRET_KEY" \\
  -d '{"type":"url","value":"https://suspicious-site.example"}'`;

  const text = `curl -X POST ${APP_URL}/functions/scanApi \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_SECRET_KEY" \\
  -d '{"type":"text","value":"Your package is held. Pay $2 at http://bit.ly/xyz"}'`;

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><ScanLine className="w-4 h-4 text-primary" /> Scan API</CardTitle>
        <CardDescription className="text-xs">
          Analyze message text for phishing and scam indicators. Reputation look-ups through VirusTotal are switched off: the free VirusTotal Public API must not be used in a commercial product, and a Premium VirusTotal licence is required before they can be offered again.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CodeBlock label="Reputation lookup — type: ip | domain | url | hash" code={curl} />
        <CodeBlock label="Text analysis — type: text" code={text} />
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong className="text-foreground">Reputation response:</strong> <code>{`{ ok, type, value, result: { found, threatLevel: "safe"|"warning"|"medium"|"high"|"critical", maliciousCount, suspiciousCount, scannedBy, stats } }`}</code></p>
          <p><strong className="text-foreground">Text response:</strong> <code>{`{ ok, type, value, result: { is_scam, scam_type, confidence, red_flags[], recommendation } }`}</code></p>
          <p>Pass the secret in the <code>x-api-key</code> header (preferred) or as <code>api_key</code> in the body. Keep it server-side only.</p>
        </div>
      </CardContent>
    </Card>
  );
}
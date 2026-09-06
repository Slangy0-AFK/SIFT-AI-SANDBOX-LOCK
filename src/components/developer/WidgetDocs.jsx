import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Fingerprint } from 'lucide-react';
import CodeBlock from './CodeBlock';

export const APP_URL = 'https://siftai.base44.app';

export default function WidgetDocs({ siteKey }) {
  const key = siteKey || 'YOUR_SITE_KEY';
  const embed = `<script src="${APP_URL}/widget.js" async></script>

<form method="POST" action="/login">
  <!-- your fields -->
  <div class="siftai-widget" data-sitekey="${key}"></div>
  <button type="submit">Continue</button>
</form>`;

  const verify = `// On your server, after the form is submitted:
const res = await fetch("${APP_URL}/functions/widgetApi", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "siteverify",
    secret: process.env.SIFTAI_SECRET_KEY,
    token: req.body["siftai-token"]
  })
});
const { success } = await res.json();
if (!success) return reject("Verification failed");`;

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Fingerprint className="w-4 h-4 text-primary" /> Human Verification Widget</CardTitle>
        <CardDescription className="text-xs">
          Drop the widget into any login, signup, or checkout form. It issues a signed, single-use token valid for 10 minutes; your server confirms it with your secret key.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CodeBlock label="1. Embed on your page" code={embed} />
        <CodeBlock label="2. Verify the token server-side" code={verify} />
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong className="text-foreground">Response:</strong> <code>{`{ "success": true, "site_key": "...", "verified_at": "..." }`}</code> or <code>{`{ "success": false, "error-codes": ["invalid-token" | "timeout" | "token-already-used"] }`}</code></p>
          <p>Optional: <code>data-callback="fnName"</code> calls <code>window.fnName(token)</code> on success. Use <code>SiftAI.getResponse(el)</code> to read the token manually.</p>
        </div>
      </CardContent>
    </Card>
  );
}
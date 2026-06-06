import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDescription } from '@/components/ui/alert';
import { Link, Info, AlertTriangle } from 'lucide-react';

export default function SlackIntegrationSetup() {
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Link className="w-4 h-4 text-primary" />
          <CardTitle className="font-mono text-xs tracking-wider">Slack Notifications</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
          Send mirror environment session updates and threat alerts through a secure backend function.
        </p>
        <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
          The Slack webhook URL must be configured on the server only and is never stored or exposed in the browser.
        </p>

        <div className="rounded-lg border border-blue-400/20 bg-blue-400/5 p-3">
          <Info className="w-4 h-4 text-blue-400 mb-2" />
          <p className="font-mono text-[10px] text-foreground">
            Add <code className="font-mono">SLACK_WEBHOOK_URL</code> to your backend environment, then restart the app.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <AlertDescription className="text-[10px] text-foreground">
            Do not enter webhook URLs in client-side storage. This component no longer saves Slack secrets in localStorage.
          </AlertDescription>
        </div>
      </CardContent>
    </Card>
  );
}

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Link, AlertTriangle, CheckCircle2 } from 'lucide-react';

const STORAGE_KEY = 'slackWebhookUrl';

function getStoredWebhook() {
  return localStorage.getItem(STORAGE_KEY) || '';
}

export default function SlackIntegrationSetup() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const envWebhook = import.meta.env.VITE_SLACK_WEBHOOK_URL;

  useEffect(() => {
    setWebhookUrl(getStoredWebhook());
    setIsSaved(!!getStoredWebhook());
  }, []);

  const handleSave = () => {
    if (!webhookUrl) {
      localStorage.removeItem(STORAGE_KEY);
      setIsSaved(false);
      toast.success('Slack webhook removed');
      return;
    }

    localStorage.setItem(STORAGE_KEY, webhookUrl.trim());
    setIsSaved(true);
    toast.success('Slack webhook saved');
  };

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setWebhookUrl('');
    setIsSaved(false);
    toast.success('Slack webhook cleared');
  };

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
          Send mirror environment session updates and threat alerts to Slack via an incoming webhook. This works locally without live Base44 credits.
        </p>
        <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
          When creating the webhook in Slack, choose the channel <strong>#all-sift-ai</strong> so alerts appear in the right place.
        </p>

        <div className="space-y-2">
          <Label htmlFor="slackWebhook" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Slack Webhook URL
          </Label>
          <Input
            id="slackWebhook"
            type="url"
            placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXX"
            value={webhookUrl}
            onChange={(event) => setWebhookUrl(event.target.value)}
            className="font-mono text-xs"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="font-mono text-xs" onClick={handleSave}>
            Save Webhook
          </Button>
          <Button size="sm" variant="outline" className="font-mono text-xs" onClick={handleClear}>
            Clear
          </Button>
        </div>

        {envWebhook && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <p className="font-mono text-[10px] text-foreground">Slack webhook is also configured from environment.</p>
          </div>
        )}

        {!envWebhook && !isSaved && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <p className="font-mono text-[10px] text-foreground">
              No Slack webhook configured yet. Create one for <strong>#all-sift-ai</strong>, then add it here or set <code className="font-mono">VITE_SLACK_WEBHOOK_URL</code> in your env.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

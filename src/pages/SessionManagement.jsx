import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldBan, MonitorSmartphone } from 'lucide-react';
import FeatureGate from '@/components/subscription/FeatureGate';

export default function SessionManagement() {
  return (
    <FeatureGate requiredPlan="pro" featureName="Session Management">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">SESSION MANAGEMENT</h1>
            <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-1">
              ACTIVE DEVICES & TOKENS
            </p>
          </div>
          <Button size="sm" variant="outline" className="font-mono text-xs border-destructive/30 text-destructive hover:bg-destructive/10">
            <ShieldBan className="w-4 h-4 mr-2" /> Revoke All Other Sessions
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
              <MonitorSmartphone className="w-4 h-4 text-primary" /> ACTIVE SESSIONS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border/50 bg-primary/5 p-4 flex items-center justify-between">
              <div>
                <p className="font-mono text-[11px] font-bold text-primary">Current Device</p>
                <p className="font-mono text-[10px] text-muted-foreground mt-1">Mac OS • Chrome</p>
              </div>
              <div className="px-2 py-1 rounded bg-primary/20 text-primary font-mono text-[9px] font-bold">
                ACTIVE NOW
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
}
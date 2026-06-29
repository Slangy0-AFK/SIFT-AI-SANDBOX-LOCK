import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { List, Download } from 'lucide-react';
import FeatureGate from '@/components/subscription/FeatureGate';

export default function AuditLogs() {
  return (
    <FeatureGate requiredPlan="pro" featureName="Audit Logs">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">AUDIT LOGS</h1>
            <p className="font-mono text-xs text-muted-foreground tracking-widest mt-1">
              TAMPER-EVIDENT COMPLIANCE TRAILS
            </p>
          </div>
          <Button size="sm" variant="outline" className="font-mono text-xs border-primary/30 text-primary hover:bg-primary/10">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
              <List className="w-4 h-4 text-primary" /> RECENT ACTIVITY
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="rounded-xl border border-border/50 bg-secondary/10 p-3 flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-mono text-xs font-bold text-foreground">Admin accessed command center</p>
                  <p className="font-mono text-xs text-muted-foreground mt-1">System Action</p>
                </div>
                <span className="font-mono text-xs text-muted-foreground">Just now</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
}
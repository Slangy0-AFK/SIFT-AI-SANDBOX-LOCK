import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import FeatureGate from '@/components/subscription/FeatureGate';

export default function DataRetention() {
  const [retentionDays, setRetentionDays] = useState(30);

  return (
    <FeatureGate requiredPlan="pro" featureName="Data Retention">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">DATA RETENTION</h1>
          <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-1">
            AUTOMATED REDACTION & PURGING
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" /> RETENTION POLICIES
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl border border-border/50 bg-secondary/10">
              <p className="font-mono text-sm font-semibold text-foreground">Log Retention Period (Days)</p>
              <p className="font-mono text-[10px] text-muted-foreground mt-1 mb-4">
                Automatically purge firewall and threat logs older than this threshold.
              </p>
              <div className="flex items-center gap-4">
                <input 
                  type="number" 
                  value={retentionDays} 
                  onChange={(e) => setRetentionDays(Number(e.target.value))}
                  className="w-24 bg-background border border-border rounded-lg px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button size="sm" onClick={() => toast.success('Retention policy updated')}>
                  <Save className="w-4 h-4 mr-2" /> Save Policy
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 flex items-center justify-between">
              <div>
                <p className="font-mono text-[11px] font-bold text-destructive">Manual Purge</p>
                <p className="font-mono text-[10px] text-muted-foreground mt-1">Immediately redact and purge all historical PII logs.</p>
              </div>
              <Button size="sm" variant="destructive" onClick={() => toast.success('Purge initiated')}>
                <Trash2 className="w-4 h-4 mr-2" /> Purge Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
}
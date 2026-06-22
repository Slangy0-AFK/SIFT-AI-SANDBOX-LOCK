import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Plus } from 'lucide-react';
import FeatureGate from '@/components/subscription/FeatureGate';

export default function IpAllowlist() {
  return (
    <FeatureGate requiredPlan="pro" featureName="IP Allowlisting">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">IP ALLOWLIST</h1>
            <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-1">
              STRICT ACCESS CONTROLS
            </p>
          </div>
          <Button size="sm" variant="outline" className="font-mono text-xs border-primary/30 text-primary hover:bg-primary/10">
            <Plus className="w-4 h-4 mr-2" /> Add IP Range
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> TRUSTED NETWORKS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border/50 bg-secondary/10 p-4 text-center font-mono text-[10px] text-muted-foreground">
              No IP restrictions configured. All traffic is currently evaluated by standard rules.
            </div>
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
}
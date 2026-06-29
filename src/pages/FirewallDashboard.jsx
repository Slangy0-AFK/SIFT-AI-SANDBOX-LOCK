import React from 'react';
import FeatureGate from '@/components/subscription/FeatureGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, Globe, Lock, Zap, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FirewallDashboard() {
  return (
    <FeatureGate requiredPlan="pro" featureName="Firewall Command Center">
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">FIREWALL COMMAND CENTER</h1>
          <p className="font-mono text-xs text-muted-foreground tracking-widest mt-1">
            NETWORK SECURITY & TRAFFIC CONTROL
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/firewall/rules">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-xs">
                <Shield className="w-4 h-4 text-primary" />
                MANAGE RULES
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-xs text-muted-foreground">
                Create, edit, and manage firewall rules for inbound/outbound traffic
              </p>
              <Button className="w-full mt-4 font-mono text-xs" size="sm">
                Open Rules Manager
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link to="/firewall/logs">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-xs">
                <Eye className="w-4 h-4 text-primary" />
                VIEW LOGS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-xs text-muted-foreground">
                Monitor real-time firewall activity and blocked threats
              </p>
              <Button className="w-full mt-4 font-mono text-xs" size="sm" variant="outline">
                View Activity Log
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link to="/firewall/analytics">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-xs">
                <Zap className="w-4 h-4 text-primary" />
                ANALYTICS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-xs text-muted-foreground">
                Traffic patterns, threat analysis, and security insights
              </p>
              <Button className="w-full mt-4 font-mono text-xs" size="sm" variant="outline">
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Security Status */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            SECURITY STATUS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="text-2xl font-bold text-green-500">ACTIVE</div>
              <div className="text-xs text-muted-foreground mt-1">Firewall Status</div>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="text-2xl font-bold text-blue-500">0</div>
              <div className="text-xs text-muted-foreground mt-1">Rules Violated</div>
            </div>
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="text-2xl font-bold text-amber-500">0</div>
              <div className="text-xs text-muted-foreground mt-1">Active Threats</div>
            </div>
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="text-2xl font-bold text-purple-500">24/7</div>
              <div className="text-xs text-muted-foreground mt-1">Monitoring</div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <div className="font-mono text-[11px] font-semibold text-foreground">DEFENSE LAYERS ACTIVE</div>
                <div className="font-mono text-xs text-muted-foreground mt-1 space-y-1">
                  <div>• Firewall rules filtering inbound/outbound traffic</div>
                  <div>• Real-time threat detection and blocking</div>
                  <div>• Rate limiting to prevent DDoS attacks</div>
                  <div>• Geographic IP filtering capabilities</div>
                  <div>• Automated logging and audit trails</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            FIREWALL BEST PRACTICES
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="font-mono text-[11px] font-semibold text-foreground">RECOMMENDED RULES</div>
              <ul className="font-mono text-xs text-muted-foreground space-y-1">
                <li>• Block known malicious IP ranges</li>
                <li>• Allow only necessary ports (80, 443)</li>
                <li>• Rate limit API endpoints</li>
                <li>• Block traffic from high-risk regions</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="font-mono text-[11px] font-semibold text-foreground">MONITORING TIPS</div>
              <ul className="font-mono text-xs text-muted-foreground space-y-1">
                <li>• Review logs daily for anomalies</li>
                <li>• Set up alerts for critical blocks</li>
                <li>• Update rules based on threat intel</li>
                <li>• Test rules in audit mode first</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </FeatureGate>
  );
}
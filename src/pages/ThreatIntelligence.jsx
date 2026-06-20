import React from 'react';
import FeatureGate from '@/components/subscription/FeatureGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield, ShieldAlert, Cpu, Wifi, FileWarning
} from 'lucide-react';
import RealTimeThreatMonitor from '@/components/threats/RealTimeThreatMonitor';

const THREAT_CATEGORIES = [
  {
    icon: Cpu, label: 'AI / Autonomous Agents', color: 'text-purple-400',
    description: 'Autonomous bots & LLM-based adversarial agents'
  },
  {
    icon: FileWarning, label: 'Zero-Day Anomalies', color: 'text-accent',
    description: 'Behavioral anomalies and polymorphic execution patterns'
  },
  {
    icon: ShieldAlert, label: 'Device & Browser Anomalies', color: 'text-cyan-400',
    description: 'Headless browsers, automation frameworks, and spoofed fingerprints'
  },
  {
    icon: Wifi, label: 'Network Threats', color: 'text-yellow-400',
    description: 'Malicious IP tracking and automated firewall mitigation'
  }
];

function ThreatMatrix() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> THREAT COVERAGE MATRIX
        </CardTitle>
        <p className="font-mono text-[9px] text-muted-foreground tracking-wide">
          Actual cyber threat vectors monitored by the Aegis detection engine
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {THREAT_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.label} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40 border border-border/50">
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cat.color}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-[10px] font-bold ${cat.color}`}>{cat.label}</span>
                    <Badge variant="outline" className="font-mono text-[7px] text-green-400 border-green-400/30">COVERED</Badge>
                  </div>
                  <p className="font-mono text-[9px] text-muted-foreground mt-0.5 leading-relaxed">{cat.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ThreatIntelligence() {
  return (
    <FeatureGate requiredPlan="pro" featureName="Threat Intelligence">
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">THREAT INTELLIGENCE</h1>
        <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-1">
          ACTIVE CYBER THREAT DETECTION & ANALYSIS
        </p>
      </div>

      <ThreatMatrix />

      <RealTimeThreatMonitor />
    </div>
    </FeatureGate>
  );
}
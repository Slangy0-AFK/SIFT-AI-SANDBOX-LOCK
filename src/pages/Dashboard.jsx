import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Lock, Skull, Eye, ChevronDown, ChevronUp, Bug, Radiation, GitBranch, ShieldAlert, FileText } from 'lucide-react';

import ThreatCounter from '../components/dashboard/ThreatCounter';
import LiveEventFeed from '../components/dashboard/LiveEventFeed';
import QRNGCycleDisplay from '../components/dashboard/QRNGCycleDisplay';
import MirrorStatus from '../components/dashboard/MirrorStatus';
import RealTimeTracker from '../components/dashboard/RealTimeTracker';
import PredictiveRiskScore from '../components/dashboard/PredictiveRiskScore';
import VirusTotalScanner from '../components/security/VirusTotalScanner';

function CollapsiblePanel({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

const quickLinks = [
  { path: '/zero-day', icon: Radiation, label: 'Zero-Day', color: 'text-accent' },
  { path: '/threat-intel', icon: ShieldAlert, label: 'Threat Intel', color: 'text-accent' },
  { path: '/firewall', icon: Shield, label: 'Firewall', color: 'text-primary' },
  { path: '/threat-log', icon: FileText, label: 'Threat Log', color: 'text-primary' },
  { path: '/workflow', icon: GitBranch, label: 'Workflows', color: 'text-primary' },
  { path: '/mirror-env', icon: Bug, label: 'Mirror Env', color: 'text-green-400' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: threats = [] } = useQuery({
    queryKey: ['threats'],
    queryFn: () => base44.entities.Threat.list('-created_date', 50),
    initialData: [],
    refetchInterval: 5000,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.SecurityEvent.list('-created_date', 30),
    initialData: [],
    refetchInterval: 5000,
  });

  const { data: honeypots = [] } = useQuery({
    queryKey: ['honeypots'],
    queryFn: () => base44.entities.HoneypotSession.list('-created_date', 20),
    initialData: [],
    refetchInterval: 10000,
  });

  const { data: anomalies = [] } = useQuery({
    queryKey: ['anomalies-risk'],
    queryFn: () => base44.entities.ZeroDayAnomaly.list('-created_date', 50),
    initialData: [],
    refetchInterval: 5000,
  });

  const activeThreats = threats.filter(t => !['locked', 'destroyed', 'cleared'].includes(t.status));
  const lockedThreats = threats.filter(t => t.status === 'locked');
  const destroyedThreats = threats.filter(t => t.status === 'destroyed');

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-mono text-lg md:text-xl font-bold tracking-wider text-foreground">COMMAND CENTER</h1>
          <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground tracking-widest mt-0.5">
            AEGIS QUANTUM SHIELD — ENTERPRISE SECURITY MATRIX
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-mono text-[9px] text-green-400 font-semibold tracking-wider">ALL SYSTEMS OPERATIONAL</span>
          </div>

        </div>
      </div>

      {/* Quick Nav Tabs */}
      <div className="flex flex-wrap gap-2">
        {quickLinks.map(({ path, icon: Icon, label, color }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border hover:border-primary/40 hover:bg-secondary transition-all font-mono text-[10px] tracking-wide text-muted-foreground hover:text-foreground"
          >
            <Icon className={`w-3.5 h-3.5 ${color}`} />
            {label}
          </button>
        ))}
      </div>

      {/* Stats — 2x2 on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <ThreatCounter label="Active Threats" value={activeThreats.length} color="text-accent" icon={AlertTriangle} />
        <ThreatCounter label="Locked Out" value={lockedThreats.length} color="text-amber-400" icon={Lock} />
        <ThreatCounter label="Destroyed" value={destroyedThreats.length} color="text-destructive" icon={Skull} />
      </div>

      {/* Predictive Risk Score */}
      <PredictiveRiskScore threats={threats} events={events} anomalies={anomalies} />

      {/* Real-Time Tracker */}
      <RealTimeTracker />

      {/* VirusTotal Scanner */}
      <VirusTotalScanner />

      {/* Live Event Feed — always visible */}
      <LiveEventFeed events={events} />

      {/* Secondary panels — collapsible on mobile, side-by-side on desktop */}
      <div className="md:hidden space-y-3">
        <CollapsiblePanel title="Mirror / Honeypot Status" icon={Bug} defaultOpen={false}>
          <MirrorStatus honeypotSessions={honeypots} />
        </CollapsiblePanel>
      </div>

      <div className="hidden md:grid grid-cols-1 gap-6">
        <MirrorStatus honeypotSessions={honeypots} />
      </div>

    </div>
  );
}
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, AlertTriangle, Lock, Skull, Eye, ChevronDown, ChevronUp, Atom, Bug } from 'lucide-react';

import ThreatCounter from '../components/dashboard/ThreatCounter';
import LiveEventFeed from '../components/dashboard/LiveEventFeed';
import QRNGCycleDisplay from '../components/dashboard/QRNGCycleDisplay';
import MirrorStatus from '../components/dashboard/MirrorStatus';
import RealTimeTracker from '../components/dashboard/RealTimeTracker';
import PredictiveRiskScore from '../components/dashboard/PredictiveRiskScore';

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

export default function Dashboard() {
  const { data: threats = [] } = useQuery({
    queryKey: ['threats'],
    queryFn: () => base44.entities.Threat.list('-created_date', 50),
    initialData: [],
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.SecurityEvent.list('-created_date', 30),
    initialData: [],
  });

  const { data: honeypots = [] } = useQuery({
    queryKey: ['honeypots'],
    queryFn: () => base44.entities.HoneypotSession.list('-created_date', 20),
    initialData: [],
  });

  const { data: anomalies = [] } = useQuery({
    queryKey: ['anomalies-risk'],
    queryFn: () => base44.entities.ZeroDayAnomaly.list('-created_date', 50),
    initialData: [],
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
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 self-start sm:self-auto">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-mono text-[9px] text-green-400 font-semibold tracking-wider">ALL SYSTEMS OPERATIONAL</span>
        </div>
      </div>

      {/* Stats — 2x2 on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <ThreatCounter label="Active Threats" value={activeThreats.length} color="text-accent" icon={AlertTriangle} />
        <ThreatCounter label="Locked Out" value={lockedThreats.length} color="text-amber-400" icon={Lock} />
        <ThreatCounter label="Destroyed" value={destroyedThreats.length} color="text-destructive" icon={Skull} />
        <ThreatCounter label="Total Monitored" value={threats.length} color="text-primary" icon={Eye} />
      </div>

      {/* Predictive Risk Score */}
      <PredictiveRiskScore threats={threats} events={events} anomalies={anomalies} />

      {/* Real-Time Tracker */}
      <RealTimeTracker />

      {/* Live Event Feed — always visible */}
      <LiveEventFeed events={events} />

      {/* Secondary panels — collapsible on mobile, side-by-side on desktop */}
      <div className="md:hidden space-y-3">
        <CollapsiblePanel title="QRNG Cycle Monitor" icon={Atom} defaultOpen={false}>
          <QRNGCycleDisplay />
        </CollapsiblePanel>
        <CollapsiblePanel title="Mirror / Honeypot Status" icon={Bug} defaultOpen={false}>
          <MirrorStatus honeypotSessions={honeypots} />
        </CollapsiblePanel>
      </div>

      <div className="hidden md:grid grid-cols-2 gap-6">
        <QRNGCycleDisplay />
        <MirrorStatus honeypotSessions={honeypots} />
      </div>

    </div>
  );
}
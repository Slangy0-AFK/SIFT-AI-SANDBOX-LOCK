import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, AlertTriangle, Lock, Skull, Eye } from 'lucide-react';
import BaseChainVisual from '../components/dashboard/BaseChainVisual';
import ThreatCounter from '../components/dashboard/ThreatCounter';
import LiveEventFeed from '../components/dashboard/LiveEventFeed';
import QRNGCycleDisplay from '../components/dashboard/QRNGCycleDisplay';
import MirrorStatus from '../components/dashboard/MirrorStatus';

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

  const activeThreats = threats.filter(t => !['locked', 'destroyed', 'cleared'].includes(t.status));
  const lockedThreats = threats.filter(t => t.status === 'locked');
  const destroyedThreats = threats.filter(t => t.status === 'destroyed');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">COMMAND CENTER</h1>
          <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-1">
            AEGIS QUANTUM SHIELD — ENTERPRISE SECURITY MATRIX
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-mono text-[10px] text-green-400 font-semibold tracking-wider">ALL SYSTEMS OPERATIONAL</span>
        </div>
      </div>

      {/* Base Chain Visualizer */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mb-4 text-center">
          SECURITY CHAIN PIPELINE
        </h3>
        <BaseChainVisual />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <ThreatCounter label="Active Threats" value={activeThreats.length} color="text-accent" icon={AlertTriangle} />
        <ThreatCounter label="Locked Out" value={lockedThreats.length} color="text-amber-400" icon={Lock} />
        <ThreatCounter label="Destroyed" value={destroyedThreats.length} color="text-destructive" icon={Skull} />
        <ThreatCounter label="Total Monitored" value={threats.length} color="text-primary" icon={Eye} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-2 gap-6">
        <LiveEventFeed events={events} />
        <div className="space-y-6">
          <QRNGCycleDisplay />
          <MirrorStatus honeypotSessions={honeypots} />
        </div>
      </div>
    </div>
  );
}
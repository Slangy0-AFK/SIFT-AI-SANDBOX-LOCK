import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Lock, Skull, ChevronDown, ChevronUp, Bug, Radiation, ShieldAlert, FileText, ScanLine, Activity, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import confetti from 'canvas-confetti';

import ThreatCounter from '../components/dashboard/ThreatCounter';
import CustomerThreatFeed from '../components/dashboard/CustomerThreatFeed';
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

function ThreatScannerSection({ threats, refetchThreats }) {
  const [neutralizingId, setNeutralizingId] = useState(null);
  const activeThreats = threats.filter(t => !['locked', 'destroyed', 'cleared'].includes(t.status));

  const handleNeutralize = async (threat) => {
    setNeutralizingId(threat.id);
    try {
      // autoBlockIp already updates threat status to 'destroyed' internally
      await base44.functions.invoke('autoBlockIp', {
        source_ip: threat.source_ip,
        threat_id: threat.id,
        reason: 'Manually neutralized from command center',
      });
      toast.success('✓ Threat neutralized — IP blocked');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#00d4ff', '#10b981', '#f43f5e'] });
      await refetchThreats();
    } catch (err) {
      toast.error(err.message || 'Failed to neutralize');
    } finally {
      setNeutralizingId(null);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-primary" /> DEVICE THREAT SCANNER
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => { refetchThreats(); toast.success('Threats refreshed'); }}>
            <Activity className="w-3 h-3 mr-1" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activeThreats.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-green-500/10 p-4 text-center">
            <ShieldCheck className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="font-mono text-[10px] text-green-400 font-semibold">NO ACTIVE THREATS</p>
            <p className="font-mono text-[9px] text-muted-foreground mt-1">All devices clean</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeThreats.slice(0, 5).map((threat) => (
              <div key={threat.id} className="rounded-xl border border-border/50 bg-secondary/10 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`font-mono text-[8px] rounded-full border px-2 py-0.5 ${threat.threat_level === 'critical' ? 'bg-destructive/10 border-destructive/20 text-destructive' : threat.threat_level === 'high' ? 'bg-amber-400/10 border-amber-400/20 text-amber-400' : 'bg-blue-400/10 border-blue-400/20 text-blue-400'}`}>
                        {threat.threat_level?.toUpperCase()}
                      </Badge>
                      <span className="font-mono text-[9px] text-muted-foreground">{threat.agent_type === 'human' ? 'Human' : threat.agent_type}</span>
                    </div>
                    <p className="font-mono text-[10px] text-foreground mt-2 truncate">{threat.notes?.slice(0, 80) || 'Threat detected'}</p>
                    <p className="font-mono text-[9px] text-muted-foreground mt-1 truncate">Device: {threat.created_by || 'Unknown'} • IP: {threat.source_ip}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="font-mono text-[9px] h-7 px-2"
                    disabled={neutralizingId === threat.id}
                    onClick={() => handleNeutralize(threat)}
                  >
                    {neutralizingId === threat.id ? (
                      <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Neutralizing...</>
                    ) : (
                      <><Shield className="w-3 h-3 mr-1" /> Neutralize</>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const quickLinks = [
  { path: '/zero-day', icon: Radiation, label: 'Zero-Day', color: 'text-fuchsia-400' },
  { path: '/threat-intel', icon: ShieldAlert, label: 'Threat Intel', color: 'text-fuchsia-400' },
  { path: '/firewall', icon: Shield, label: 'Firewall', color: 'text-primary' },
  { path: '/mirror-env', icon: Bug, label: 'Mirror Env', color: 'text-green-400' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    base44.functions.invoke('ensureDecoys', {}).catch(console.error);
    return () => clearInterval(timer);
  }, []);

  const { data: threats = [], refetch: refetchThreats } = useQuery({
    queryKey: ['threats'],
    queryFn: () => base44.entities.Threat.list('-created_date', 1000),
    initialData: [],
    refetchInterval: 5000,
  });

  const { data: events = [], refetch: refetchEvents } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.SecurityEvent.list('-created_date', 500),
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
    queryFn: () => base44.entities.ZeroDayAnomaly.list('-created_date', 500),
    initialData: [],
    refetchInterval: 5000,
  });

  const { data: emailThreats = [] } = useQuery({
    queryKey: ['email-threats'],
    queryFn: () => base44.entities.EmailThreat.list('-scanned_date', 500),
    initialData: [],
    refetchInterval: 7000,
  });

  const { data: scanSessions = [] } = useQuery({
    queryKey: ['scan-sessions'],
    queryFn: () => base44.entities.ScanSession.list('-created_date', 500),
    initialData: [],
    refetchInterval: 10000,
  });

  const { data: firewallLogs = [] } = useQuery({
    queryKey: ['firewall-logs'],
    queryFn: () => base44.entities.FirewallLog.list('-created_date', 50),
    initialData: [],
    refetchInterval: 5000,
  });

  const handleRefresh = async () => { await Promise.all([refetchThreats(), refetchEvents()]); };
  usePullToRefresh(handleRefresh, containerRef);

  const activeThreats = threats.filter(t => !['locked', 'destroyed', 'cleared'].includes(t.status));
  const lockedThreats = threats.filter(t => t.status === 'locked');
  const destroyedThreats = threats.filter(t => t.status === 'destroyed');
  const blockedEvents = firewallLogs.filter(log => String(log.action_taken || 'blocked').toLowerCase().includes('block'));

  return (
    <div ref={containerRef} className="p-4 md:p-6 space-y-4 md:space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-mono text-lg md:text-xl font-bold tracking-wider text-foreground">COMMAND CENTER</h1>
          <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground tracking-widest mt-0.5">
            SIFT-AI QUANTUM SHIELD — ENTERPRISE SECURITY MATRIX
          </p>
          <p className="mt-2 font-mono text-[9px] text-muted-foreground max-w-2xl">
            Total security mode: live zero-day detection, AI adversarial containment, and automated firewall block events are actively protecting customer environments.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-mono text-[9px] text-green-400 font-semibold tracking-wider">ALL SYSTEMS OPERATIONAL</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
            <Activity className="w-3 h-3 text-primary" />
            <span className="font-mono text-[10px] text-foreground font-semibold">
              {currentTime.toLocaleTimeString('en-US', { timeZone: 'America/Chicago' })}
            </span>
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
        <ThreatCounter label="Active Threats" value={activeThreats.length} color="text-fuchsia-400" icon={AlertTriangle} />
        <ThreatCounter label="Locked Out" value={lockedThreats.length} color="text-amber-400" icon={Lock} />
        <ThreatCounter label="Destroyed" value={destroyedThreats.length} color="text-destructive" icon={Skull} />
        <ThreatCounter label="Firewall Blocks" value={blockedEvents.length} color="text-teal-400" icon={ShieldAlert} />
      </div>

      {/* Predictive Risk Score */}
      <PredictiveRiskScore threats={threats} events={events} anomalies={anomalies} />

      {/* Real-Time Tracker */}
      <RealTimeTracker />

      {/* VirusTotal Scanner */}
      <VirusTotalScanner />

      {/* Threat Scanner Section */}
      <ThreatScannerSection threats={threats} refetchThreats={refetchThreats} />

      {/* Live Customer Threat Feed — integrated signals from all tools */}
      <CustomerThreatFeed
        threats={threats}
        events={events}
        anomalies={anomalies}
        emailThreats={emailThreats}
        scanSessions={scanSessions}
        honeypots={honeypots}
        firewallLogs={firewallLogs}
      />

      {/* Secondary panels — collapsible on mobile, side-by-side on desktop */}
      <div className="lg:hidden space-y-3">
        <CollapsiblePanel title="Mirror / Honeypot Status" icon={Bug} defaultOpen={false}>
          <MirrorStatus honeypotSessions={honeypots} />
        </CollapsiblePanel>
      </div>

      <div className="hidden lg:grid grid-cols-1 gap-6">
        <MirrorStatus honeypotSessions={honeypots} />
      </div>

    </div>
  );
}
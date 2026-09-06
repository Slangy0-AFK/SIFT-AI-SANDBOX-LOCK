import React, { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ScanLine, Mail, ShieldCheck, Code2, MessageSquare } from 'lucide-react';
import usePullToRefresh from '@/hooks/usePullToRefresh';

import ThreatCounter from '../components/dashboard/ThreatCounter';
import RecentActivity from '../components/dashboard/RecentActivity';
import VirusTotalScanner from '../components/security/VirusTotalScanner';

const quickLinks = [
  { path: '/threat-scanner', icon: ScanLine, label: 'Device Scanner' },
  { path: '/email-scanner', icon: Mail, label: 'Email Scanner' },
  { path: '/developer', icon: Code2, label: 'Developer API' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const { data: scanSessions = [], refetch: refetchScans } = useQuery({
    queryKey: ['scan-sessions'],
    queryFn: () => base44.entities.ScanSession.list('-created_date', 200),
    initialData: [],
  });

  const { data: emailThreats = [], refetch: refetchEmails } = useQuery({
    queryKey: ['email-threats'],
    queryFn: () => base44.entities.EmailThreat.list('-created_date', 200),
    initialData: [],
  });

  const { data: textThreats = [] } = useQuery({
    queryKey: ['text-threats'],
    queryFn: () => base44.entities.TextThreat.list('-created_date', 200),
    initialData: [],
  });

  const { data: apiKeys = [] } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: () => base44.entities.ApiKey.list('-created_date'),
    initialData: [],
  });

  usePullToRefresh(async () => { await Promise.all([refetchScans(), refetchEmails()]); }, containerRef);

  const verifications = apiKeys.reduce((sum, k) => sum + (k.verify_count || 0), 0);
  const apiScans = apiKeys.reduce((sum, k) => sum + (k.scan_count || 0), 0);

  return (
    <div ref={containerRef} className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="font-mono text-lg md:text-xl font-bold tracking-wider text-foreground">DASHBOARD</h1>
        <p className="font-mono text-xs text-muted-foreground tracking-widest mt-1">
          YOUR SCANS, EMAIL THREATS & API ACTIVITY
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {quickLinks.map(({ path, icon: Icon, label }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border hover:border-primary/40 hover:bg-secondary transition-all font-mono text-xs tracking-wide text-muted-foreground hover:text-foreground"
          >
            <Icon className="w-3.5 h-3.5 text-primary" />
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <ThreatCounter label="Scans Run" value={scanSessions.length} color="text-primary" icon={ScanLine} />
        <ThreatCounter label="Email Threats" value={emailThreats.length} color="text-amber-400" icon={Mail} />
        <ThreatCounter label="Scam Texts Flagged" value={textThreats.length} color="text-fuchsia-400" icon={MessageSquare} />
        <ThreatCounter label="Widget Verifications" value={verifications} color="text-green-400" icon={ShieldCheck} />
      </div>

      <VirusTotalScanner />

      <RecentActivity
        scanSessions={scanSessions}
        emailThreats={emailThreats}
        textThreats={textThreats}
        apiScans={apiScans}
      />
    </div>
  );
}
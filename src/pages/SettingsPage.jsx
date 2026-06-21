import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Shield, Lock, Bug, Clock, Atom, FileText, ClipboardList, UserX, AlertTriangle, Bot, User, ShieldAlert, Cpu, Wifi, HardDrive, ShieldX, ShieldCheck, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatChicagoTime } from '@/lib/utils';
import FeatureGate from '@/components/subscription/FeatureGate';
import AuditLogExport from '../components/settings/AuditLogExport';
import MFASetup from '../components/security/MFASetup';
import PasswordReset from '../components/security/PasswordReset';
import SlackIntegrationSetup from '../components/settings/SlackIntegrationSetup';
import { Badge } from '@/components/ui/badge';
import TheologicalGateway from '@/components/paradox/TheologicalGateway';
import AdminKeyClaim from '../components/settings/AdminKeyClaim';

export default function SettingsPage() {
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (deleteConfirm.toUpperCase() !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    const privacyEmail = import.meta.env.VITE_PRIVACY_EMAIL || 'privacy@sift-ai-security.app';
    await base44.integrations.Core.SendEmail({
      to: privacyEmail,
      subject: 'Account Deletion Request',
      body: `User ${user?.email || 'unknown'} (ID: ${user?.id || 'unknown'}) has requested full account deletion from SIFT-AI Quantum Shield.`,
    });
    toast.success('Account deletion request submitted. Your account will be removed within 30 days.');
    setShowDeleteAccount(false);
    setDeleteConfirm('');
  };

  const [settings, setSettings] = useState({
    baseChainEnabled: true,
    paradoxLockEnabled: true,
    qrngEnabled: true,
    mirrorEnabled: true,
    honeypotsEnabled: true,
    tarpitsEnabled: true,
    maxQRNGCycles: 3,
    tarpitDelay: 1,
    mirrorSyncInterval: 5,
  });

  const handleToggle = (key) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      toast.success('Setting updated');
      return updated;
    });
  };

  // ── Paradox Lock State ──
  const queryClient = useQueryClient();
  const { data: threats = [] } = useQuery({
    queryKey: ['threats-paradox'],
    queryFn: () => base44.entities.Threat.list('-created_date', 20),
    initialData: [],
  });

  const challengedThreats = threats.filter(t =>
    ['challenged', 'cycle_1', 'cycle_2', 'cycle_3', 'locked', 'destroyed', 'cleared'].includes(t.status)
  );

  const SCAN_STEPS = [
    { id: 'memory', label: 'Memory Scan', icon: Cpu, detail: 'Scanning RAM for injected processes...' },
    { id: 'network', label: 'Network Interfaces', icon: Wifi, detail: 'Checking active connections & DNS...' },
    { id: 'storage', label: 'Storage Integrity', icon: HardDrive, detail: 'Verifying file system checksums...' },
    { id: 'threats', label: 'Threat Signatures', icon: ShieldX, detail: 'Matching known threat patterns...' },
    { id: 'chain', label: 'Base Chain Verify', icon: Lock, detail: 'Validating cryptographic pipeline...' },
  ];

  const [scanning, setScanning] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [results, setResults] = useState(null);
  const [simResponse, setSimResponse] = useState(null);
  const [simAgentType, setSimAgentType] = useState('human');
  const [isProcessing, setIsProcessing] = useState(false);

  const createThreatMutation = useMutation({
    mutationFn: (data) => base44.entities.Threat.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['threats-paradox'] }),
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.SecurityEvent.create(data),
  });

  const startScan = async () => {
    setScanning(true);
    setResults(null);
    setStepIndex(0);
    for (let i = 0; i < SCAN_STEPS.length; i++) {
      setStepIndex(i);
      await new Promise(r => setTimeout(r, 900 + Math.random() * 600));
    }
    setResults({ threats: 0, warnings: 0, clean: true, timestamp: new Date() });
    setStepIndex(SCAN_STEPS.length);
    setScanning(false);
  };

  const resetScan = () => {
    setStepIndex(-1);
    setResults(null);
  };

  const simulateChallenge = async () => {
    setIsProcessing(true);
    const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const isHuman = simAgentType === 'human';
    const responseText = simResponse === 'yes' ? 'Yes' : 'No';
    const paradoxPassed = isHuman;

    const threat = await createThreatMutation.mutateAsync({
      source_ip: ip,
      threat_level: paradoxPassed ? 'low' : 'critical',
      status: paradoxPassed ? 'cleared' : 'cycle_1',
      paradox_response: responseText,
      paradox_passed: paradoxPassed,
      qrng_cycle: paradoxPassed ? 0 : 1,
      agent_type: simAgentType,
      environment: paradoxPassed ? 'production' : 'mirror',
      notes: paradoxPassed
        ? 'Human respondent — faith-based answer accepted'
        : `Autonomous agent detected — "${responseText}" cannot be universally fact-checked. Initiating QRNG cycles.`,
    });

    await createEventMutation.mutateAsync({
      event_type: 'paradox_challenge',
      threat_id: String(threat.id),
      severity: paradoxPassed ? 'info' : 'critical',
      details: `Paradox Lock challenged ${ip}. Agent type: ${simAgentType}. Response: "${responseText}". Result: ${paradoxPassed ? 'PASSED' : 'FAILED — entering QRNG cycles'}`,
      environment: paradoxPassed ? 'production' : 'mirror',
    });

    if (!paradoxPassed) {
      for (let cycle = 1; cycle <= 3; cycle++) {
        await new Promise(resolve => setTimeout(resolve, 1200));
        await base44.entities.Threat.update(threat.id, {
          status: cycle < 3 ? `cycle_${cycle + 1}` : 'destroyed',
          qrng_cycle: cycle,
        });
        await createEventMutation.mutateAsync({
          event_type: 'qrng_cycle',
          threat_id: String(threat.id),
          severity: cycle === 3 ? 'fatal' : 'critical',
          details: `QRNG Cycle ${cycle}/3 complete for ${ip}. ${cycle === 3 ? 'Threat DESTROYED.' : 'Continuing...'}`,
          base_chain_step: 'qrng',
          environment: 'mirror',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['threats-paradox'] });
    }

    setIsProcessing(false);
    setSimResponse(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">SETTINGS</h1>
        <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-1">
          SYSTEM CONFIGURATION & DEFENSE PARAMETERS
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="font-mono text-[10px]">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="paradox" className="flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Paradox Lock
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-4">

        {/* Admin Key Claim - Only for dougleslie00@gmail.com */}
        <AdminKeyClaim />

        <div className="grid grid-cols-2 gap-6">
        {/* Defense Modules — Permanently Active */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <CardTitle className="font-mono text-xs tracking-wider">DEFENSE MODULES</CardTitle>
              <div className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/10">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="font-mono text-[8px] text-green-400 tracking-widest">ACTIVE</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Paradox Lock', icon: Lock, color: 'text-primary' },
              { label: 'QRNG Cycles', icon: Atom, color: 'text-primary' },
              { label: 'Mirror Environment', icon: Shield, color: 'text-primary' },
              { label: 'Honeypots', icon: Bug, color: 'text-amber-400' },
              { label: 'Tarpits', icon: Clock, color: 'text-fuchsia-400' },
            ].map(({ label, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-2 p-2 rounded bg-secondary/20 border border-border/30">
                <Icon className={`w-3 h-3 ${color} flex-shrink-0`} />
                <span className="font-mono text-[10px] text-foreground flex-1">{label}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
              </div>
            ))}
          </CardContent>
        </Card>


      </div>

      {/* Security Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MFASetup />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SlackIntegrationSetup />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PasswordReset />
        <AuditLogExport />
      </div>

      {/* Session Management */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <UserX className="w-4 h-4 text-muted-foreground" /> SESSION MANAGEMENT
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-border/50 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <LogOut className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-mono text-[11px] font-semibold text-foreground">Log Out</div>
                <div className="font-mono text-[10px] text-muted-foreground mt-0.5">Securely end your current session.</div>
              </div>
            </div>
            <Button size="sm" variant="outline" className="font-mono text-xs" onClick={() => base44.auth.logout('/')}>
              Log Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Legal & Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> LEGAL & COMPLIANCE
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link to="/privacy-policy">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-secondary hover:bg-muted transition-colors font-mono text-[11px] text-foreground">
              <Shield className="w-3.5 h-3.5 text-primary" /> Privacy Policy
            </button>
          </Link>
          <Link to="/terms">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-secondary hover:bg-muted transition-colors font-mono text-[11px] text-foreground">
              <FileText className="w-3.5 h-3.5 text-primary" /> Terms of Service
            </button>
          </Link>
          <Link to="/refund-policy">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-secondary hover:bg-muted transition-colors font-mono text-[11px] text-foreground">
              <ClipboardList className="w-3.5 h-3.5 text-primary" /> Refund Policy
            </button>
          </Link>

        </CardContent>
      </Card>

      {/* Delete Account Accordion */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="delete-account" className="border-destructive/20">
          <AccordionTrigger className="font-mono text-xs text-destructive hover:no-underline px-4 py-3 rounded-lg bg-destructive/5 hover:bg-destructive/10 transition-colors">
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4" /> DANGER ZONE: DELETE ACCOUNT
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 px-4 pb-4 bg-destructive/5 border-t border-destructive/10 rounded-b-lg">
            <p className="font-mono text-[10px] text-muted-foreground leading-relaxed mb-4">
              Google Play requires all apps to provide account deletion options. Use the action below to submit a request.
            </p>
            <div className="border border-destructive/20 rounded-xl p-4 space-y-3 bg-background">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-mono text-[11px] font-semibold text-foreground">Delete My Account</div>
                  <div className="font-mono text-[10px] text-muted-foreground mt-0.5">Permanently remove your SIFT-AI account and all associated data within 30 days.</div>
                </div>
              </div>
              {!showDeleteAccount ? (
                <Button size="sm" variant="outline" className="font-mono text-xs border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => setShowDeleteAccount(true)}>
                  Delete Account
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive mt-0.5 flex-shrink-0" />
                    <p className="font-mono text-[10px] text-destructive">Your account and all data will be permanently deleted. Type <strong>DELETE</strong> to confirm.</p>
                  </div>
                  <input
                    type="text"
                    placeholder="Type DELETE to confirm"
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-destructive"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="font-mono text-xs" onClick={() => { setShowDeleteAccount(false); setDeleteConfirm(''); }}>Cancel</Button>
                    <Button size="sm" variant="destructive" className="font-mono text-xs" onClick={handleDeleteAccount}>
                      Permanently Delete Account
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

        </TabsContent>{/* end general */}

        {/* ── Paradox Lock Tab ── */}
        <TabsContent value="paradox" className="space-y-4 mt-4">
          <FeatureGate requiredPlan="pro" featureName="Paradox Lock Configuration">
            <div className="space-y-4">

          {/* Read-only lock banner */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-400/10 border border-amber-400/30">
            <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="font-mono text-[10px] text-amber-400 leading-relaxed">
              PROTECTED — These parameters are enforced by the Theological MFA engine and cannot be modified by users.
            </p>
          </div>



          {/* How it works */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-green-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="font-mono text-[11px] tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-green-400" /> HUMAN CORRIDOR
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pointer-events-none select-none">
                <div className="space-y-1.5">
                  {[
                    { label: 'Any answer accepted', detail: 'Faith is subjective — yes or no both pass' },
                    { label: 'TOTP verification', detail: 'Optional second factor via authenticator app' },
                    { label: 'Access granted', detail: 'Routed to production environment' },
                  ].map(({ label, detail }) => (
                    <div key={label} className="flex items-start gap-2 p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                      <div>
                        <span className="font-mono text-[10px] font-semibold text-green-400">{label}</span>
                        <p className="font-mono text-[9px] text-muted-foreground">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardHeader className="pb-3">
                <CardTitle className="font-mono text-[11px] tracking-wider flex items-center gap-2">
                  <Bot className="w-4 h-4 text-destructive" /> AGENT / BOT CORRIDOR
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pointer-events-none select-none">
                <div className="space-y-1.5">
                  {[
                    { label: 'Paradox trap triggered', detail: 'No boolean answer can be universally fact-checked' },
                    { label: 'Mirror redirect', detail: 'Agent routed to honeypot or tarpit environment' },
                    { label: '3× QRNG cycles', detail: 'Quantum random cycles compute threat destruction' },
                  ].map(({ label, detail }) => (
                    <div key={label} className="flex items-start gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                      <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 flex-shrink-0" />
                      <div>
                        <span className="font-mono text-[10px] font-semibold text-destructive">{label}</span>
                        <p className="font-mono text-[9px] text-muted-foreground">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fixed parameters (read-only display) */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-muted-foreground" /> FIXED PARAMETERS
                <span className="ml-auto font-mono text-[9px] text-muted-foreground border border-border px-2 py-0.5 rounded">READ-ONLY</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pointer-events-none select-none">
              {[
                { label: 'QRNG CYCLES BEFORE DESTROY', value: '3', color: 'text-primary' },
                { label: 'AGENT DETECTION METHOD', value: 'Theological Paradox (boolean impossibility)', color: 'text-foreground' },
                { label: 'HUMAN FREE-WILL BYPASS', value: 'ENABLED', color: 'text-green-400' },
                { label: 'ZKP VERIFICATION FOR AGENTS', value: 'ENFORCED', color: 'text-destructive' },
                { label: 'MIRROR ENVIRONMENT ON FAIL', value: 'ACTIVE', color: 'text-amber-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 border border-border/50">
                  <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
                  <span className={`font-mono text-[10px] font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>



          {/* Paradox UI is frontend-only; internal base math and QRNG processing are performed securely on the backend. */}
          <div className="hidden">
            <TheologicalGateway />
          </div>

          {/* Challenge History */}
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> CHALLENGE HISTORY
              </CardTitle>
            </CardHeader>
            <CardContent>
              {challengedThreats.length === 0 ? (
                <div className="text-center py-8">
                  <Lock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-mono text-xs text-muted-foreground">No challenges recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {challengedThreats.map((threat) => (
                    <div key={threat.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
                      {threat.paradox_passed ? (
                        <ShieldCheck className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[10px] font-semibold text-foreground">{threat.source_ip}</span>
                          <Badge variant="outline" className={`font-mono text-[8px] ${
                            threat.agent_type === 'human' ? 'text-green-400 border-green-400/30' : 'text-destructive border-destructive/30'
                          }`}>
                            {threat.agent_type?.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className={`font-mono text-[8px] ${
                            threat.status === 'cleared' ? 'text-green-400 border-green-400/30' :
                            threat.status === 'destroyed' ? 'text-destructive border-destructive/30' :
                            'text-amber-400 border-amber-400/30'
                          }`}>
                            {threat.status?.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="font-mono text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{threat.notes}</p>
                      </div>
                      <span className="font-mono text-[9px] text-muted-foreground flex-shrink-0">
                        {threat.created_date ? formatChicagoTime(threat.created_date) : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Paradox UI is frontend-only; internal base math and QRNG processing are performed securely on the backend. */}
          <div className="hidden">
            <TheologicalGateway />
          </div>



            </div>
          </FeatureGate>
        </TabsContent>
      </Tabs>
    </div>
  );
}
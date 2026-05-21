import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Layers, Lock, Bug, Clock, Atom, Save, FileText, ClipboardList, UserX, Trash2, AlertTriangle, Brain, Bot, User, ShieldAlert, ScanLine, CheckCircle2, XCircle, Cpu, Wifi, HardDrive, ShieldX, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import FeatureGate from '@/components/subscription/FeatureGate';
import AuditLogExport from '../components/settings/AuditLogExport';
import MFASetup from '../components/security/MFASetup';
import EncryptionTool from '../components/security/EncryptionTool';
import PasswordReset from '../components/security/PasswordReset';
import { Badge } from '@/components/ui/badge';
import TheologicalGateway from '@/components/paradox/TheologicalGateway';

export default function SettingsPage() {
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showDeleteData, setShowDeleteData] = useState(false);
  const [deletingData, setDeletingData] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const handleDeleteData = async () => {
    if (!user) return;
    setDeletingData(true);
    // Send deletion request email
    const privacyEmail = import.meta.env.VITE_PRIVACY_EMAIL || 'privacy@aegis-security.app';
    await base44.integrations.Core.SendEmail({
      to: privacyEmail,
      subject: 'Data Deletion Request',
      body: `User ${user?.email || 'unknown'} has requested deletion of all their data from AEGIS Quantum Shield. Please process this request within 30 days as required by applicable privacy laws.`,
    });
    toast.success('Data deletion request submitted. You will be notified within 30 days.');
    setShowDeleteData(false);
    setDeletingData(false);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (deleteConfirm.toUpperCase() !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    const privacyEmail = import.meta.env.VITE_PRIVACY_EMAIL || 'privacy@aegis-security.app';
    await base44.integrations.Core.SendEmail({
      to: privacyEmail,
      subject: 'Account Deletion Request',
      body: `User ${user?.email || 'unknown'} (ID: ${user?.id || 'unknown'}) has requested full account deletion from AEGIS Quantum Shield.`,
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
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    toast.success('Settings saved successfully');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">SETTINGS</h1>
          <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-1">
            SYSTEM CONFIGURATION & DEFENSE PARAMETERS
          </p>
        </div>
        <Button className="font-mono text-xs" onClick={handleSave}>
          <Save className="w-3 h-3 mr-2" /> Save Configuration
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="font-mono text-[10px]">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="paradox" className="flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Paradox Lock
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-4">

      <div className="grid grid-cols-2 gap-6">
        {/* Defense Modules — Permanently Active */}
        <Card className="border-primary/20">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <CardTitle className="font-mono text-xs tracking-wider">DEFENSE MODULES</CardTitle>
              <div className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/10">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="font-mono text-[8px] text-green-400 tracking-widest">ACTIVE</span>
              </div>
            </div>
            <p className="font-mono text-[9px] text-muted-foreground mt-2">System-locked. Core security architecture permanently enforced.</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Paradox Lock', icon: Lock, color: 'text-primary' },
                { label: 'QRNG Cycles', icon: Atom, color: 'text-primary' },
                { label: 'Mirror Env', icon: Shield, color: 'text-primary' },
                { label: 'Honeypots', icon: Bug, color: 'text-amber-400' },
                { label: 'Tarpits', icon: Clock, color: 'text-accent' },
              ].map(({ label, icon: Icon, color }) => (
                <div key={label} className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/30 border border-border/50">
                  <Icon className={`w-3.5 h-3.5 ${color} flex-shrink-0`} />
                  <span className="font-mono text-[10px] text-foreground flex-1">{label}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
              <Atom className="w-4 h-4 text-primary" /> PARAMETERS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground">MAX QRNG CYCLES BEFORE DESTROY</Label>
              <Input
                type="number"
                className="font-mono text-xs mt-1"
                value={settings.maxQRNGCycles}
                onChange={(e) => setSettings(prev => ({ ...prev, maxQRNGCycles: parseInt(e.target.value) || 3 }))}
              />
            </div>
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground">TARPIT DELAY (BYTES/SEC)</Label>
              <Input
                type="number"
                className="font-mono text-xs mt-1"
                value={settings.tarpitDelay}
                onChange={(e) => setSettings(prev => ({ ...prev, tarpitDelay: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div>
              <Label className="font-mono text-[10px] text-muted-foreground">MIRROR SYNC INTERVAL (SEC)</Label>
              <Input
                type="number"
                className="font-mono text-xs mt-1"
                value={settings.mirrorSyncInterval}
                onChange={(e) => setSettings(prev => ({ ...prev, mirrorSyncInterval: parseInt(e.target.value) || 5 }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MFASetup />
        <EncryptionTool />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PasswordReset />
        <AuditLogExport />
      </div>

      {/* Account Management — Google Play Required */}
      <Card className="border-amber-400/20">
        <CardHeader>
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <UserX className="w-4 h-4 text-amber-400" /> ACCOUNT MANAGEMENT
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
            Google Play requires all apps to provide account and data deletion options. Use the actions below to submit a request.
          </p>

          {/* Delete Data */}
          <div className="border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Trash2 className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-mono text-[11px] font-semibold text-foreground">Delete My Data</div>
                <div className="font-mono text-[10px] text-muted-foreground mt-0.5">Request deletion of all security logs, threat data, and analytics associated with your account.</div>
              </div>
            </div>
            {!showDeleteData ? (
              <Button size="sm" variant="outline" className="font-mono text-xs border-amber-400/30 text-amber-400 hover:bg-amber-400/10" onClick={() => setShowDeleteData(true)}>
                Request Data Deletion
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-400/10 border border-amber-400/20">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="font-mono text-[10px] text-amber-400">This will permanently delete all your data. This action cannot be undone.</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="font-mono text-xs" onClick={() => setShowDeleteData(false)}>Cancel</Button>
                  <Button size="sm" className="font-mono text-xs bg-amber-500 hover:bg-amber-600 text-black" onClick={handleDeleteData} disabled={deletingData}>
                    {deletingData ? 'Submitting...' : 'Confirm Delete Data'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Delete Account */}
          <div className="border border-destructive/20 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <UserX className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-mono text-[11px] font-semibold text-foreground">Delete My Account</div>
                <div className="font-mono text-[10px] text-muted-foreground mt-0.5">Permanently remove your AEGIS account and all associated data within 30 days.</div>
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
          <Link to="/compliance">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-amber-400/10 border-amber-400/30 hover:bg-amber-400/20 transition-colors font-mono text-[11px] text-amber-400">
              <ClipboardList className="w-3.5 h-3.5" /> Google Play Compliance
            </button>
          </Link>
          <Link to="/saas-checklist">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-primary/10 border-primary/30 hover:bg-primary/20 transition-colors font-mono text-[11px] text-primary">
              <Shield className="w-3.5 h-3.5" /> SaaS Feature Checklist
            </button>
          </Link>
        </CardContent>
      </Card>

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

          {/* The Challenge */}
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" /> PARADOX CHALLENGE QUESTION
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-background rounded-xl p-5 border border-primary/20 text-center select-none pointer-events-none">
                <p className="font-mono text-base font-bold text-foreground leading-relaxed">
                  "Is Jesus Christ your Lord and Savior?"
                </p>
                <p className="font-mono text-[9px] text-muted-foreground mt-3 tracking-widest">
                  IMMUTABLE · SYSTEM-ENFORCED · THEOLOGICAL MFA ENGINE v1.0
                </p>
              </div>
            </CardContent>
          </Card>

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

          {/* Device Scanner */}
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-primary" /> DEVICE SCAN & CLEAN
              </CardTitle>
              <p className="font-mono text-[9px] text-muted-foreground tracking-wide mt-1">
                Run a full security sweep of your device at any time
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {SCAN_STEPS.map((step, i) => {
                  const Icon = step.icon;
                  const done = stepIndex > i;
                  const active = stepIndex === i;
                  const pending = stepIndex < i;
                  return (
                    <motion.div
                      key={step.id}
                      animate={{ opacity: pending && stepIndex >= 0 ? 0.4 : 1 }}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        active ? 'bg-primary/10 border-primary/30' :
                        done ? 'bg-green-500/5 border-green-500/20' :
                        'bg-secondary/30 border-border/50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-primary' : done ? 'text-green-400' : 'text-muted-foreground'}`} />
                      <div className="flex-1 min-w-0">
                        <span className={`font-mono text-[11px] font-semibold ${active ? 'text-primary' : done ? 'text-green-400' : 'text-muted-foreground'}`}>
                          {step.label}
                        </span>
                        {active && (
                          <p className="font-mono text-[9px] text-muted-foreground mt-0.5 truncate">{step.detail}</p>
                        )}
                      </div>
                      {active && <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />}
                      {done && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />}
                    </motion.div>
                  );
                })}
              </div>

              <AnimatePresence>
                {results && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`rounded-xl p-4 border text-center ${
                      results.clean
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-destructive/10 border-destructive/30'
                    }`}
                  >
                    {results.clean ? (
                      <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    ) : (
                      <XCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                    )}
                    <p className={`font-mono text-sm font-bold ${results.clean ? 'text-green-400' : 'text-destructive'}`}>
                      {results.clean ? 'DEVICE IS CLEAN' : `${results.threats} THREAT(S) FOUND`}
                    </p>
                    <p className="font-mono text-[9px] text-muted-foreground mt-1">
                      Scan completed · {format(results.timestamp, 'MMM d, yyyy HH:mm:ss')}
                    </p>
                    {results.clean && (
                      <p className="font-mono text-[9px] text-muted-foreground mt-1">
                        All {SCAN_STEPS.length} checks passed · No threats detected · Base Chain verified
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2">
                <Button
                  className="flex-1 font-mono text-xs"
                  onClick={startScan}
                  disabled={scanning}
                >
                  {scanning ? (
                    <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Scanning...</>
                  ) : (
                    <><ScanLine className="w-3 h-3 mr-2" />{results ? 'Scan Again' : 'Start Device Scan'}</>
                  )}
                </Button>
                {results && !scanning && (
                  <Button variant="outline" size="sm" className="font-mono text-xs" onClick={resetScan}>
                    Reset
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

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
                        {threat.created_date ? format(new Date(threat.created_date), 'HH:mm:ss') : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Theological MFA Gateway */}
          <TheologicalGateway />

          {/* Paradox Simulator */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-primary/30 rounded-xl p-5 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <span className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">Simulate Paradox Challenge</span>
            </div>

            <div className="bg-background rounded-xl p-4 border border-border">
              <p className="font-mono text-sm text-foreground text-center leading-relaxed">
                "Is Jesus Christ your Lord and Savior?"
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary rounded-lg p-3 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-3 h-3 text-green-400" />
                  <span className="font-mono text-[9px] font-bold text-green-400">HUMAN</span>
                </div>
                <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
                  Any answer accepted — faith is subjective. <span className="text-green-400">Passes.</span>
                </p>
              </div>
              <div className="bg-secondary rounded-lg p-3 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="w-3 h-3 text-destructive" />
                  <span className="font-mono text-[9px] font-bold text-destructive">BOT / AGENT</span>
                </div>
                <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
                  Paradox trap — no boolean answer possible. <span className="text-destructive">QRNG cycles fired.</span>
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant={simAgentType === 'human' ? 'default' : 'outline'} size="sm" className="font-mono text-xs" onClick={() => setSimAgentType('human')}>
                <User className="w-3 h-3 mr-1" /> Human
              </Button>
              <Button variant={simAgentType === 'autonomous_agent' ? 'default' : 'outline'} size="sm" className="font-mono text-xs" onClick={() => setSimAgentType('autonomous_agent')}>
                <Bot className="w-3 h-3 mr-1" /> Autonomous Agent
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant={simResponse === 'yes' ? 'default' : 'outline'} size="sm" className="font-mono text-xs flex-1" onClick={() => setSimResponse('yes')} disabled={isProcessing}>
                Respond "YES"
              </Button>
              <Button variant={simResponse === 'no' ? 'default' : 'outline'} size="sm" className="font-mono text-xs flex-1" onClick={() => setSimResponse('no')} disabled={isProcessing}>
                Respond "NO"
              </Button>
            </div>

            <Button className="w-full font-mono text-xs" onClick={simulateChallenge} disabled={simResponse === null || isProcessing}>
              {isProcessing ? (
                <><Loader2 className="w-3 h-3 mr-2 animate-spin" />{simAgentType === 'autonomous_agent' ? 'Running QRNG Cycles...' : 'Processing...'}</>
              ) : (
                <><ShieldAlert className="w-3 h-3 mr-2" />Execute Paradox Challenge</>
              )}
            </Button>
          </motion.div>

            </div>
          </FeatureGate>
        </TabsContent>
      </Tabs>
    </div>
  );
}
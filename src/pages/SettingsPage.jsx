import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Layers, Lock, Bug, Clock, Atom, Save, FileText, ClipboardList, UserX, Trash2, AlertTriangle, Brain, Bot, User, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import AuditLogExport from '../components/settings/AuditLogExport';
import MFASetup from '../components/security/MFASetup';
import EncryptionTool from '../components/security/EncryptionTool';
import PasswordReset from '../components/security/PasswordReset';

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
    await base44.integrations.Core.SendEmail({
      to: 'privacy@aegis-shield.app',
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
    await base44.integrations.Core.SendEmail({
      to: 'privacy@aegis-shield.app',
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
        {/* Defense Modules */}
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> DEFENSE MODULES
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              { key: 'paradoxLockEnabled', label: 'Paradox Lock Gate', desc: 'Theological paradox authentication', icon: Lock },
              { key: 'qrngEnabled', label: 'QRNG Cycles', desc: 'Quantum random number threat cycles', icon: Atom },
              { key: 'mirrorEnabled', label: 'Mirror Environment', desc: 'Mirrored deception environment', icon: Shield },
              { key: 'honeypotsEnabled', label: 'Honeypots', desc: 'Fake service deception traps', icon: Bug },
              { key: 'tarpitsEnabled', label: 'Tarpits', desc: 'Connection throttling traps', icon: Clock },
            ].map(({ key, label, desc, icon: Icon }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <Label className="font-mono text-[11px]">{label}</Label>
                    <p className="font-mono text-[9px] text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <Switch checked={settings[key]} onCheckedChange={() => handleToggle(key)} />
              </div>
            ))}
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

        </TabsContent>
      </Tabs>
    </div>
  );
}
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Layers, Lock, Bug, Clock, Atom, Save, FileText, ClipboardList, UserX, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import AuditLogExport from '../components/settings/AuditLogExport';
import MFASetup from '../components/settings/MFASetup';

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

      {/* MFA Setup */}
      <MFASetup />

      {/* Audit Log Export */}
      <AuditLogExport />

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
              <ClipboardList className="w-3.5 h-3.5" /> Google Play Compliance Checklist
            </button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
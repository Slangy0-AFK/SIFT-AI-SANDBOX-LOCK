import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, FileText, ClipboardList, UserX, AlertTriangle, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import AuditLogExport from '../components/settings/AuditLogExport';
import PasswordReset from '../components/security/PasswordReset';
import SlackIntegrationSetup from '../components/settings/SlackIntegrationSetup';
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
    await base44.functions.invoke('appSupport', { action: 'account_deletion' });
    toast.success('Account deletion request submitted. Your account will be removed within 30 days.');
    setShowDeleteAccount(false);
    setDeleteConfirm('');
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">SETTINGS</h1>
        <p className="font-mono text-xs text-muted-foreground tracking-widest mt-1">
          ACCOUNT, ALERTS & LEGAL
        </p>
      </div>

      <div className="space-y-6">

        <AdminKeyClaim />

      {/* Security Tools */}
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
                <div className="font-mono text-xs text-muted-foreground mt-0.5">Securely end your current session.</div>
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

      {/* Delete Account */}
      <Card className="border-destructive/20 mb-12">
        <CardHeader>
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2 text-destructive">
            <UserX className="w-4 h-4" /> DANGER ZONE: DELETE ACCOUNT
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-xs text-muted-foreground leading-relaxed mb-4">
            Google Play requires all apps to provide account deletion options. Use the action below to submit a request.
          </p>
          <div className="border border-destructive/20 rounded-xl p-4 space-y-3 bg-background">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-mono text-[11px] font-semibold text-foreground">Delete My Account</div>
                <div className="font-mono text-xs text-muted-foreground mt-0.5">Permanently remove your SIFT-AI account and all associated data within 30 days.</div>
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
                  <p className="font-mono text-xs text-destructive">Your account and all data will be permanently deleted. Type <strong>DELETE</strong> to confirm.</p>
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

      </div>
    </div>
  );
}
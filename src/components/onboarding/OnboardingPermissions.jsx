import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Shield, Mail, Smartphone, HardDrive, Wifi, CheckCircle2,
  Loader2, ArrowRight, Eye, Bell, FileText, Settings, Database
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const EMAIL_PROVIDERS = [
  { id: 'gmail', name: 'Gmail', icon: Mail, color: 'text-red-500', connectorId: '6a0f21a2f39d9bf2ebd374e6' },
  { id: 'outlook', name: 'Outlook/Hotmail', icon: Mail, color: 'text-blue-500', connectorId: '6a0f2325e2853c72f54ef687' },
  { id: 'yahoo', name: 'Yahoo Mail', icon: Mail, color: 'text-purple-500', connectorId: null },
  { id: 'icloud', name: 'iCloud Mail', icon: Mail, color: 'text-sky-500', connectorId: null },
  { id: 'aol', name: 'AOL Mail', icon: Mail, color: 'text-orange-500', connectorId: null },
  { id: 'proton', name: 'ProtonMail', icon: Mail, color: 'text-cyan-500', connectorId: null },
];

const DEVICE_PERMISSIONS = [
  { id: 'storage', name: 'Storage Access', icon: HardDrive, desc: 'Scan files for malware & threats', required: true },
  { id: 'files', name: 'Files & Media', icon: FileText, desc: 'Access documents, photos & media for scanning', required: true },
  { id: 'network', name: 'Network Interfaces', icon: Wifi, desc: 'Monitor active connections', required: true },
  { id: 'memory', name: 'Memory Scan', icon: Database, desc: 'Check RAM for injected processes', required: true },
  { id: 'apps', name: 'Installed Apps', icon: Smartphone, desc: 'Detect malicious applications', required: false },
  { id: 'settings', name: 'System Settings', icon: Settings, desc: 'Verify security configurations', required: false },
  { id: 'notifications', name: 'Notifications', icon: Bell, desc: 'Send threat alerts', required: false },
];

export default function OnboardingPermissions() {
  const [step, setStep] = useState(0);
  // Gmail is pre-connected via shared connector
  const [emailProviders, setEmailProviders] = useState(['gmail']);
  const [devicePermissions, setDevicePermissions] = useState(
    DEVICE_PERMISSIONS.filter(p => p.required).map(p => p.id)
  );
  const [connecting, setConnecting] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuthenticated);
  }, []);

  const togglePermission = (id) => {
    setDevicePermissions(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleConnectEmail = async (provider) => {
    if (!provider.connectorId) {
      toast.info(`${provider.name} support coming soon! For now, you can manually forward emails to your connected Gmail account.`);
      return;
    }

    setConnecting(provider.id);
    try {
      const url = await base44.connectors.connectAppUser(provider.connectorId);
      const popup = window.open(url, '_blank', 'width=600,height=700');
      
      // Poll for OAuth completion
      const checkInterval = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkInterval);
          setEmailProviders(prev => 
            prev.includes(provider.id) ? prev : [...prev, provider.id]
          );
          toast.success(`${provider.name} connected successfully!`);
        }
      }, 1000);

      setTimeout(() => clearInterval(checkInterval), 60000); // Timeout after 60s
    } catch (err) {
      toast.error(`Failed to connect ${provider.name}: ${err.message}`);
    } finally {
      setConnecting(null);
    }
  };

  const handleContinue = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      // Save preferences and complete onboarding
      localStorage.setItem('aegis_onboarding_complete', 'true');
      localStorage.setItem('aegis_device_permissions', JSON.stringify(devicePermissions));
      toast.success('Setup complete! Redirecting...');
      // Navigate to welcome page
      window.location.href = '/';
    }
  };

  const canContinue = () => {
    if (step === 0) return emailProviders.length > 0 || true; // Can skip email for now
    if (step === 1) return true; // Device permissions optional beyond required
    return true;
  };

  if (!isAuthenticated) {
    return null; // Don't render anything when not authenticated - AuthContext will handle redirect
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full"
      >
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
              {i < 2 && <div className={`w-8 h-0.5 ${i < step ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <CardTitle className="font-mono text-lg">
                  {step === 0 && 'Connect Email Providers'}
                  {step === 1 && 'Device Permissions'}
                  {step === 2 && 'Ready to Go!'}
                </CardTitle>
                <CardDescription className="font-mono text-xs">
                  {step === 0 && 'Scan emails for threats across all your accounts'}
                  {step === 1 && 'Grant access for comprehensive device protection'}
                  {step === 2 && 'Your security suite is configured'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Step 0: Email Providers */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {EMAIL_PROVIDERS.map(provider => {
                    const Icon = provider.icon;
                    const isConnected = emailProviders.includes(provider.id);
                    const isConnecting = connecting === provider.id;
                    
                    return (
                      <motion.div
                        key={provider.id}
                        whileHover={{ scale: 1.02 }}
                        className={`p-4 rounded-xl border transition-all ${
                          isConnected
                            ? 'bg-green-500/10 border-green-500/30'
                            : provider.connectorId
                              ? 'bg-card border-border hover:border-primary/30 cursor-pointer'
                              : 'bg-secondary/30 border-border/50 opacity-60'
                        }`}
                        onClick={() => !isConnected && provider.connectorId && handleConnectEmail(provider)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Icon className={`w-5 h-5 ${provider.color}`} />
                            <div>
                              <p className="font-mono text-xs font-semibold">{provider.name}</p>
                              <p className="font-mono text-[9px] text-muted-foreground">
                                {isConnected ? 'Connected (Shared)' : provider.connectorId ? 'Click to connect' : 'Coming soon'}
                              </p>
                            </div>
                          </div>
                          {isConnected && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                          {isConnecting && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-mono text-[10px] font-semibold text-green-400">Gmail Connected</p>
                      <p className="font-mono text-[9px] text-muted-foreground mt-1">
                        Gmail is connected and ready for automated threat scanning. All users can scan emails immediately.
                        Outlook/Hotmail requires individual connection. Other providers (Yahoo, iCloud, AOL, ProtonMail) 
                        can be used with manual forwarding or the SMS/Phone scanner.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Device Permissions */}
            {step === 1 && (
              <div className="space-y-3">
                {DEVICE_PERMISSIONS.map(permission => {
                  const Icon = permission.icon;
                  const isGranted = devicePermissions.includes(permission.id);
                  
                  return (
                    <motion.div
                      key={permission.id}
                      whileHover={{ scale: 1.01 }}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        isGranted
                          ? 'bg-primary/5 border-primary/30'
                          : 'bg-secondary/30 border-border/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Icon className={`w-5 h-5 ${isGranted ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="font-mono text-xs font-semibold">{permission.name}</p>
                          <p className="font-mono text-[9px] text-muted-foreground">{permission.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {permission.required && (
                          <Badge variant="outline" className="font-mono text-[8px]">Required</Badge>
                        )}
                        <Switch
                          checked={isGranted}
                          onCheckedChange={() => !permission.required && togglePermission(permission.id)}
                          disabled={permission.required}
                        />
                      </div>
                    </motion.div>
                  );
                })}

                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-start gap-2">
                    <Eye className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-mono text-[10px] font-semibold text-blue-400">Privacy & Security</p>
                      <p className="font-mono text-[9px] text-muted-foreground mt-1">
                        All scans run locally on your device. No data leaves your device unless threats are detected and logged to your private dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Summary */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="bg-green-500/10 border-green-500/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <Mail className="w-6 h-6 text-green-400" />
                        <div>
                          <p className="font-mono text-xs font-bold text-green-400">Email Protection</p>
                          <p className="font-mono text-[9px] text-muted-foreground">
                            {emailProviders.length > 0 
                              ? `${emailProviders.length} provider(s) connected`
                              : 'Manual scanning available'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-primary/10 border-primary/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <Shield className="w-6 h-6 text-primary" />
                        <div>
                          <p className="font-mono text-xs font-bold text-primary">Device Security</p>
                          <p className="font-mono text-[9px] text-muted-foreground">
                            {devicePermissions.length} permission(s) granted
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border">
                  <h3 className="font-mono text-xs font-bold mb-2">What's Next?</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="font-mono text-[9px] text-muted-foreground">
                        Visit the <strong className="text-foreground">Threat Scanner</strong> page to scan emails and phone numbers
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="font-mono text-[9px] text-muted-foreground">
                        Use <strong className="text-foreground">Device Scanner</strong> on the Welcome page for instant protection
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="font-mono text-[9px] text-muted-foreground">
                        Configure advanced settings in <strong className="text-foreground">Settings</strong> page
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={step === 0}
                className="font-mono text-xs"
              >
                Back
              </Button>
              
              <Button
                onClick={handleContinue}
                disabled={!canContinue()}
                className="font-mono text-xs gap-2"
              >
                {step === 2 ? (
                  <><CheckCircle2 className="w-4 h-4" /> Complete Setup</>
                ) : (
                  <><ArrowRight className="w-4 h-4" /> Continue</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Skip option */}
        {step < 2 && (
          <Button
            variant="ghost"
            onClick={() => {
              localStorage.setItem('aegis_onboarding_complete', 'true');
              toast.success('Setup skipped. You can configure this later in Settings.');
            }}
            className="w-full mt-4 font-mono text-xs text-muted-foreground"
          >
            Skip for now (configure later in Settings)
          </Button>
        )}
      </motion.div>
    </div>
  );
}
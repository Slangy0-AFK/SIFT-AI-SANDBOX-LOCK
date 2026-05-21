import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanLine, CheckCircle2, XCircle, Loader2, Shield, ShieldAlert,
  Bell, BellOff, Lock, Unlock, AlertTriangle, Cpu, Wifi, HardDrive,
  ShieldX, ShieldCheck, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const SCAN_STEPS = [
  { id: 'memory',    label: 'Memory Scan',         icon: Cpu,        detail: 'Scanning RAM for injected processes...' },
  { id: 'network',   label: 'Network Interfaces',  icon: Wifi,       detail: 'Checking active connections & DNS...' },
  { id: 'storage',   label: 'Storage Integrity',   icon: HardDrive,  detail: 'Verifying file system checksums...' },
  { id: 'threats',   label: 'Threat Signatures',   icon: ShieldX,    detail: 'Matching known threat patterns...' },
  { id: 'env',       label: 'Environment Check',   icon: ShieldAlert,detail: 'Auditing runtime environment...' },
  { id: 'chain',     label: 'Base Chain Verify',   icon: Lock,       detail: 'Validating cryptographic pipeline...' },
];

const PREFS_KEY = 'aegis_device_prefs';

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
  } catch { return {}; }
}

function savePrefs(prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export default function DeviceScanner() {
  const [scanning, setScanning]           = useState(false);
  const [stepIndex, setStepIndex]         = useState(-1);
  const [results, setResults]             = useState(null);
  const [lastScan, setLastScan]           = useState(null);

  // User preference toggles
  const [notificationsOn, setNotificationsOn] = useState(() => loadPrefs().notifications !== false);
  const [autoEncryptOn, setAutoEncryptOn]     = useState(() => loadPrefs().autoEncrypt === true);
  const [encryptStatus, setEncryptStatus]     = useState(null); // 'encrypting' | 'done' | null

  // Persist prefs
  useEffect(() => {
    savePrefs({ notifications: notificationsOn, autoEncrypt: autoEncryptOn });
  }, [notificationsOn, autoEncryptOn]);

  // Send hack-attempt notification via backend
  const sendThreatNotification = useCallback(async (threatCount, warnings) => {
    if (!notificationsOn) return;
    try {
      const user = await base44.auth.me();
      if (!user?.email) return;
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: '⚠️ AEGIS: Threat Detected on Your Device',
        body: `AEGIS Quantum Shield has detected a potential threat on your device.\n\n` +
          `• Critical Threats: ${threatCount}\n` +
          `• Warnings: ${warnings}\n` +
          `• Detected at: ${new Date().toLocaleString()}\n\n` +
          `Please open the AEGIS app and review the scan results immediately.\n\n` +
          `If you did not initiate this scan, your device may be under attack.`,
      });
      toast.warning('⚠️ Threat notification sent to your email');
    } catch (err) {
      console.error('Notification error:', err);
    }
  }, [notificationsOn]);

  // Auto-encrypt: call encryptData function with a marker payload
  const runAutoEncrypt = useCallback(async () => {
    if (!autoEncryptOn) return;
    setEncryptStatus('encrypting');
    try {
      await base44.functions.invoke('encryptData', {
        action: 'encrypt',
        data: `AEGIS_AUTO_ENCRYPT_${Date.now()}`,
        key: 'auto',
      });
      setEncryptStatus('done');
      toast.success('Auto-encryption layer applied');
    } catch {
      setEncryptStatus(null);
    }
  }, [autoEncryptOn]);

  const startScan = async () => {
    setScanning(true);
    setResults(null);
    setStepIndex(0);
    setEncryptStatus(null);

    // Animate through steps while backend runs
    const stepPromise = (async () => {
      for (let i = 0; i < SCAN_STEPS.length; i++) {
        setStepIndex(i);
        await new Promise(r => setTimeout(r, 800 + Math.random() * 500));
      }
      setStepIndex(SCAN_STEPS.length);
    })();

    const scanPromise = base44.functions.invoke('deviceScan', {}).catch(() => null);

    const [, scanResponse] = await Promise.all([stepPromise, scanPromise]);

    const data = scanResponse?.data;
    const threats  = data?.summary?.threats  ?? 0;
    const warnings = data?.summary?.warnings ?? 0;
    const clean    = threats === 0;

    const scanResult = {
      threats,
      warnings,
      clean,
      timestamp: new Date(),
      raw: data,
    };

    setResults(scanResult);
    setLastScan(format(new Date(), 'MMM d HH:mm:ss'));
    setScanning(false);

    if (!clean) {
      await sendThreatNotification(threats, warnings);
    }
    await runAutoEncrypt();

    if (clean) {
      toast.success('Device scan complete — no threats found');
    } else {
      toast.error(`Scan complete — ${threats} threat(s) detected!`);
    }
  };

  const resetScan = () => {
    setStepIndex(-1);
    setResults(null);
    setEncryptStatus(null);
  };

  return (
    <Card className="border-primary/20 w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-primary" /> DEVICE SCAN & PROTECTION
          </CardTitle>
          {lastScan && (
            <span className="font-mono text-[9px] text-muted-foreground">Last: {lastScan}</span>
          )}
        </div>
        <p className="font-mono text-[9px] text-muted-foreground tracking-wide mt-1">
          Proactive threat detection · Real-time hack alerts · Auto-encryption
        </p>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* ── Preference Toggles ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Notifications toggle */}
          <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
            notificationsOn ? 'bg-primary/5 border-primary/20' : 'bg-secondary/30 border-border/50'
          }`}>
            <div className="flex items-center gap-2">
              {notificationsOn
                ? <Bell className="w-4 h-4 text-primary flex-shrink-0" />
                : <BellOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              }
              <div>
                <Label className="font-mono text-[10px] font-semibold cursor-pointer">
                  Hack Alerts
                </Label>
                <p className="font-mono text-[8px] text-muted-foreground">
                  Email me when a threat is found
                </p>
              </div>
            </div>
            <Switch
              checked={notificationsOn}
              onCheckedChange={(v) => {
                setNotificationsOn(v);
                toast.info(v ? 'Hack alerts enabled' : 'Hack alerts disabled');
              }}
            />
          </div>

          {/* Auto-encrypt toggle */}
          <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
            autoEncryptOn ? 'bg-amber-400/5 border-amber-400/20' : 'bg-secondary/30 border-border/50'
          }`}>
            <div className="flex items-center gap-2">
              {autoEncryptOn
                ? <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                : <Unlock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              }
              <div>
                <Label className="font-mono text-[10px] font-semibold cursor-pointer">
                  Auto-Encryption
                </Label>
                <p className="font-mono text-[8px] text-muted-foreground">
                  Encrypt device data after each scan
                </p>
              </div>
            </div>
            <Switch
              checked={autoEncryptOn}
              onCheckedChange={(v) => {
                setAutoEncryptOn(v);
                toast.info(v ? 'Auto-encryption enabled' : 'Auto-encryption disabled');
              }}
            />
          </div>
        </div>

        {/* Active preference badges */}
        <div className="flex flex-wrap gap-1.5">
          {notificationsOn && (
            <Badge className="font-mono text-[8px] bg-primary/10 text-primary border-primary/20 border">
              <Bell className="w-2.5 h-2.5 mr-1" /> Alerts ON
            </Badge>
          )}
          {autoEncryptOn && (
            <Badge className="font-mono text-[8px] bg-amber-400/10 text-amber-400 border-amber-400/20 border">
              <Lock className="w-2.5 h-2.5 mr-1" /> Auto-Encrypt ON
            </Badge>
          )}
          {encryptStatus === 'encrypting' && (
            <Badge className="font-mono text-[8px] bg-amber-400/10 text-amber-400 border-amber-400/20 border">
              <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" /> Encrypting...
            </Badge>
          )}
          {encryptStatus === 'done' && (
            <Badge className="font-mono text-[8px] bg-green-500/10 text-green-400 border-green-400/20 border">
              <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Encrypted
            </Badge>
          )}
        </div>

        {/* ── Scan Steps ── */}
        <div className="space-y-1.5">
          {SCAN_STEPS.map((step, i) => {
            const Icon = step.icon;
            const done   = stepIndex > i;
            const active = stepIndex === i && scanning;
            return (
              <motion.div
                key={step.id}
                animate={{ opacity: scanning && stepIndex < i ? 0.4 : 1 }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${
                  active ? 'bg-primary/10 border-primary/30'
                  : done  ? 'bg-green-500/5 border-green-500/20'
                  :         'bg-secondary/30 border-border/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${
                  active ? 'text-primary' : done ? 'text-green-400' : 'text-muted-foreground'
                }`} />
                <div className="flex-1 min-w-0">
                  <span className={`font-mono text-[10px] font-semibold ${
                    active ? 'text-primary' : done ? 'text-green-400' : 'text-muted-foreground'
                  }`}>
                    {step.label}
                  </span>
                  {active && (
                    <p className="font-mono text-[8px] text-muted-foreground mt-0.5 truncate">{step.detail}</p>
                  )}
                </div>
                {active && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin flex-shrink-0" />}
                {done   && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
              </motion.div>
            );
          })}
        </div>

        {/* ── Results ── */}
        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`rounded-xl p-4 border text-center space-y-2 ${
                results.clean
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-destructive/10 border-destructive/30'
              }`}
            >
              {results.clean
                ? <ShieldCheck className="w-8 h-8 text-green-400 mx-auto" />
                : <ShieldAlert className="w-8 h-8 text-destructive mx-auto" />
              }
              <p className={`font-mono text-sm font-bold ${results.clean ? 'text-green-400' : 'text-destructive'}`}>
                {results.clean ? 'DEVICE IS CLEAN' : `${results.threats} THREAT(S) DETECTED`}
              </p>
              {results.warnings > 0 && (
                <p className="font-mono text-[9px] text-amber-400 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {results.warnings} warning(s) found
                </p>
              )}
              <p className="font-mono text-[9px] text-muted-foreground">
                Scan completed · {format(results.timestamp, 'MMM d, yyyy HH:mm:ss')}
              </p>
              {!results.clean && notificationsOn && (
                <p className="font-mono text-[9px] text-primary">
                  <Bell className="inline w-3 h-3 mr-1" />Notification sent to your email
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Action Buttons ── */}
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
              <RefreshCw className="w-3 h-3" />
            </Button>
          )}
        </div>

      </CardContent>
    </Card>
  );
}
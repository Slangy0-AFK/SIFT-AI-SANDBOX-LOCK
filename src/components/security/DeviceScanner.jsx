import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ScanLine, Shield, ShieldCheck, ShieldX, Loader2, CheckCircle2,
  XCircle, AlertTriangle, Lock, Wifi, HardDrive, Cpu, Bell,
  BellOff, KeyRound, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { toast } from 'sonner';

const SCAN_STEPS = [
  { id: 'memory', label: 'Memory Scan', icon: Cpu, detail: 'Scanning RAM for injected processes...' },
  { id: 'network', label: 'Network Interfaces', icon: Wifi, detail: 'Checking active connections & DNS...' },
  { id: 'storage', label: 'Storage Integrity', icon: HardDrive, detail: 'Verifying file system checksums...' },
  { id: 'threats', label: 'Threat Signatures', icon: ShieldX, detail: 'Matching known threat patterns...' },
  { id: 'chain', label: 'Base Chain Verify', icon: Lock, detail: 'Validating cryptographic pipeline...' },
];

const PREFS_KEY = 'aegis_device_prefs';

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : { autoEncrypt: false, notifications: true };
  } catch {
    return { autoEncrypt: false, notifications: true };
  }
}

function savePrefs(prefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {}
}

export default function DeviceScanner() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [scanning, setScanning] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [results, setResults] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [autoScanActive, setAutoScanActive] = useState(false);
  const intervalRef = useRef(null);

  // Persist prefs on change
  useEffect(() => { savePrefs(prefs); }, [prefs]);

  // Auto-scan every 5 min when active
  useEffect(() => {
    if (autoScanActive) {
      intervalRef.current = setInterval(() => runScan(true), 5 * 60 * 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoScanActive, prefs]);

  const updatePref = (key, value) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    toast.success(`${key === 'autoEncrypt' ? 'Auto-Encryption' : 'Notifications'} ${value ? 'enabled' : 'disabled'}`);
  };

  const runScan = async (background = false) => {
    if (scanning) return;
    setScanning(true);
    if (!background) {
      setResults(null);
      setStepIndex(0);
    }

    // Animate steps visually
    for (let i = 0; i < SCAN_STEPS.length; i++) {
      setStepIndex(i);
      await new Promise(r => setTimeout(r, 800 + Math.random() * 500));
    }

    try {
      const response = await base44.functions.invoke('deviceScan', {
        autoEncrypt: prefs.autoEncrypt,
        notifyOnThreat: prefs.notifications,
      });
      const data = response.data;

      setResults(data);
      setStepIndex(SCAN_STEPS.length);

      // Notify user if threats found
      if (data.summary?.threats > 0 || data.summary?.warnings > 0) {
        const msg = `⚠️ ${data.summary.threats} threat(s) and ${data.summary.warnings} warning(s) detected on your device!`;
        if (prefs.notifications) {
          toast.error(msg, { duration: 8000 });
          // Browser notification if permitted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('AEGIS Security Alert', { body: msg, icon: '/favicon.ico' });
          }
        }
        if (prefs.autoEncrypt && data.summary?.threats > 0) {
          toast.info('Auto-encryption applied to protect sensitive data.', { duration: 5000 });
        }
      } else {
        if (!background) toast.success('Device scan complete — no threats found!');
      }
    } catch (err) {
      toast.error('Scan failed: ' + err.message);
    }

    setScanning(false);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') toast.success('Browser notifications enabled!');
    }
  };

  const threatCount = results?.summary?.threats ?? 0;
  const warningCount = results?.summary?.warnings ?? 0;
  const isClean = results?.summary?.clean;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-primary" /> DEVICE SECURITY SCANNER
          </CardTitle>
          <div className="flex items-center gap-2">
            {results && (
              <Badge className={`font-mono text-[9px] ${isClean ? 'bg-green-500/10 text-green-400 border-green-400/20' : 'bg-destructive/10 text-destructive border-destructive/20'} border`}>
                {isClean ? <ShieldCheck className="w-3 h-3 mr-1" /> : <ShieldX className="w-3 h-3 mr-1" />}
                {isClean ? 'CLEAN' : `${threatCount} THREAT${threatCount !== 1 ? 'S' : ''}`}
              </Badge>
            )}
            <Badge
              className={`font-mono text-[9px] cursor-pointer ${autoScanActive ? 'bg-primary/10 text-primary border-primary/20' : 'bg-secondary text-muted-foreground border-border'} border`}
              onClick={() => { setAutoScanActive(v => !v); toast.success(`Proactive monitoring ${!autoScanActive ? 'ON' : 'OFF'}`); }}
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${autoScanActive ? 'animate-spin' : ''}`} />
              {autoScanActive ? 'AUTO-SCAN ON' : 'AUTO-SCAN OFF'}
            </Badge>
          </div>
        </div>
        <p className="font-mono text-[9px] text-muted-foreground tracking-wide mt-1">
          Proactive device protection — scans for hidden threats, malware & suspicious activity
        </p>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* ── Security Preferences ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Auto-Encryption Toggle */}
          <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${prefs.autoEncrypt ? 'bg-primary/5 border-primary/30' : 'bg-secondary/30 border-border/50'}`}>
            <KeyRound className={`w-4 h-4 mt-0.5 flex-shrink-0 ${prefs.autoEncrypt ? 'text-primary' : 'text-muted-foreground'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <Label className="font-mono text-[10px] font-semibold text-foreground cursor-pointer" htmlFor="auto-encrypt">
                  Auto-Encryption
                </Label>
                <Switch
                  id="auto-encrypt"
                  checked={prefs.autoEncrypt}
                  onCheckedChange={(v) => updatePref('autoEncrypt', v)}
                />
              </div>
              <p className="font-mono text-[9px] text-muted-foreground mt-1 leading-relaxed">
                Automatically encrypts sensitive data when threats are detected. Your files stay protected even if compromised.
              </p>
              {prefs.autoEncrypt && (
                <div className="mt-1.5 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="font-mono text-[9px] text-primary">AES-256 encryption active</span>
                </div>
              )}
            </div>
          </div>

          {/* Threat Notifications Toggle */}
          <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${prefs.notifications ? 'bg-amber-400/5 border-amber-400/30' : 'bg-secondary/30 border-border/50'}`}>
            {prefs.notifications ? (
              <Bell className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
            ) : (
              <BellOff className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <Label className="font-mono text-[10px] font-semibold text-foreground cursor-pointer" htmlFor="notify">
                  Threat Notifications
                </Label>
                <Switch
                  id="notify"
                  checked={prefs.notifications}
                  onCheckedChange={(v) => updatePref('notifications', v)}
                />
              </div>
              <p className="font-mono text-[9px] text-muted-foreground mt-1 leading-relaxed">
                Get alerted instantly when a hack attempt or threat is detected on your device. Email + in-app alerts.
              </p>
              {prefs.notifications && (
                <button
                  onClick={requestNotificationPermission}
                  className="mt-1.5 font-mono text-[9px] text-amber-400 underline hover:text-amber-300 transition-colors"
                >
                  Enable browser push notifications →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Scan Steps ── */}
        <div className="space-y-1.5">
          {SCAN_STEPS.map((step, i) => {
            const Icon = step.icon;
            const done = stepIndex > i;
            const active = stepIndex === i && scanning;
            const pending = !done && !active;
            return (
              <motion.div
                key={step.id}
                animate={{ opacity: pending && stepIndex >= 0 ? 0.4 : 1 }}
                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                  active ? 'bg-primary/10 border-primary/30' :
                  done ? 'bg-green-500/5 border-green-500/20' :
                  'bg-secondary/30 border-border/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-primary' : done ? 'text-green-400' : 'text-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <span className={`font-mono text-[10px] font-semibold ${active ? 'text-primary' : done ? 'text-green-400' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                  {active && <p className="font-mono text-[9px] text-muted-foreground mt-0.5">{step.detail}</p>}
                </div>
                {active && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin flex-shrink-0" />}
                {done && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
              </motion.div>
            );
          })}
        </div>

        {/* ── Result Summary ── */}
        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`rounded-xl p-4 border ${
                isClean
                  ? 'bg-green-500/10 border-green-500/30'
                  : threatCount > 0
                    ? 'bg-destructive/10 border-destructive/30'
                    : 'bg-amber-400/10 border-amber-400/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isClean ? (
                    <ShieldCheck className="w-7 h-7 text-green-400" />
                  ) : threatCount > 0 ? (
                    <ShieldX className="w-7 h-7 text-destructive" />
                  ) : (
                    <AlertTriangle className="w-7 h-7 text-amber-400" />
                  )}
                  <div>
                    <p className={`font-mono text-sm font-bold ${isClean ? 'text-green-400' : threatCount > 0 ? 'text-destructive' : 'text-amber-400'}`}>
                      {isClean ? 'DEVICE IS CLEAN' : threatCount > 0 ? `${threatCount} THREAT(S) FOUND` : `${warningCount} WARNING(S)`}
                    </p>
                    <p className="font-mono text-[9px] text-muted-foreground mt-0.5">
                      {results.scan_id} · {format(new Date(results.timestamp), 'MMM d, HH:mm:ss')}
                      {prefs.autoEncrypt && threatCount > 0 && ' · 🔐 Auto-encrypted'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(v => !v)}
                  className="font-mono text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  Details {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Detailed results */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-3">

                      {/* File Access */}
                      {results.file_access?.accessible_sensitive?.length > 0 && (
                        <div>
                          <p className="font-mono text-[9px] font-bold text-amber-400 mb-1.5">⚠ SENSITIVE PATHS ACCESSIBLE</p>
                          <div className="space-y-1">
                            {results.file_access.accessible_sensitive.map((f, i) => (
                              <div key={i} className="flex items-center justify-between bg-secondary/50 rounded px-2 py-1">
                                <span className="font-mono text-[9px] text-foreground">{f.path}</span>
                                <Badge variant="outline" className={`font-mono text-[8px] ${f.risk === 'high' ? 'text-destructive border-destructive/30' : 'text-amber-400 border-amber-400/30'}`}>
                                  {f.risk.toUpperCase()}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Malware */}
                      {results.file_access?.malware_findings?.length > 0 && (
                        <div>
                          <p className="font-mono text-[9px] font-bold text-destructive mb-1.5">🔴 MALWARE DETECTED</p>
                          <div className="space-y-1">
                            {results.file_access.malware_findings.map((f, i) => (
                              <div key={i} className="bg-destructive/10 rounded px-2 py-1">
                                <span className="font-mono text-[9px] text-destructive">{f.path} — {f.reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Env Exposure */}
                      {results.environment?.sensitive_vars_exposed > 0 && (
                        <div>
                          <p className="font-mono text-[9px] font-bold text-amber-400 mb-1.5">⚠ ENV VARS EXPOSED ({results.environment.sensitive_vars_exposed})</p>
                          <div className="flex flex-wrap gap-1">
                            {results.environment.vars.map((v, i) => (
                              <Badge key={i} variant="outline" className="font-mono text-[8px] text-amber-400 border-amber-400/30">{v}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Base Chain */}
                      {results.base_chain?.steps && (
                        <div>
                          <p className="font-mono text-[9px] font-bold text-primary mb-1.5">✓ BASE CHAIN VERIFICATION</p>
                          <div className="grid grid-cols-2 gap-1">
                            {results.base_chain.steps.map((s, i) => (
                              <div key={i} className="flex items-center gap-1.5 bg-primary/5 rounded px-2 py-1">
                                <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
                                <span className="font-mono text-[8px] text-primary uppercase">{s.step}</span>
                                <span className="font-mono text-[8px] text-muted-foreground ml-auto truncate">{s.hash}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {isClean && (
                        <p className="font-mono text-[9px] text-green-400 text-center">
                          ✓ All {SCAN_STEPS.length} checks passed · No threats detected · Base Chain verified
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Action Buttons ── */}
        <div className="flex gap-2">
          <Button
            className="flex-1 font-mono text-xs"
            onClick={() => runScan(false)}
            disabled={scanning}
          >
            {scanning ? (
              <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Scanning...</>
            ) : (
              <><ScanLine className="w-3 h-3 mr-2" />{results ? 'Scan Again' : 'Start Device Scan'}</>
            )}
          </Button>
          {results && !scanning && (
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs"
              onClick={() => { setResults(null); setStepIndex(-1); }}
            >
              Reset
            </Button>
          )}
        </div>

        {autoScanActive && (
          <p className="font-mono text-[9px] text-primary text-center">
            <RefreshCw className="w-3 h-3 inline mr-1 animate-spin" />
            Proactive monitoring active — auto-scanning every 5 minutes
          </p>
        )}
      </CardContent>
    </Card>
  );
}
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  ScanLine, ShieldCheck, ShieldX, Loader2, AlertTriangle,
  CheckCircle2, Bell, BellOff, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { toast } from 'sonner';

const SCAN_STEPS = [
  { id: 'permissions', label: 'Permission Audit', detail: 'Requesting camera, mic, clipboard, geolocation access...' },
  { id: 'hardware', label: 'Hardware Fingerprint', detail: 'Analysing CPU, GPU, memory & display signals...' },
  { id: 'network', label: 'Network & Location Signals', detail: 'Checking connection, timezone & proxy anomalies...' },
  { id: 'storage', label: 'Storage Analysis', detail: 'Scanning storage usage for malware caches...' },
  { id: 'scripts', label: 'Hidden Script Scan', detail: 'Detecting injected or obfuscated code...' },
  { id: 'fingerprint', label: 'Agent Fingerprint', detail: 'Validating browser identity & automation flags...' },
  { id: 'verify', label: 'Threat Verification', detail: 'Cross-referencing signature database...' },
];

const SEVERITY_COLOR = {
  critical: 'text-destructive',
  high: 'text-destructive',
  medium: 'text-amber-400',
  low: 'text-blue-400',
  info: 'text-muted-foreground',
};

const SEVERITY_BG = {
  critical: 'bg-destructive/10 border-destructive/30',
  high: 'bg-destructive/10 border-destructive/30',
  medium: 'bg-amber-400/10 border-amber-400/30',
  low: 'bg-blue-400/10 border-blue-400/30',
  info: 'bg-secondary border-border',
};

// Request deep browser permissions for a full device scan
// This MUST be called directly from a user gesture (button click) to trigger popups
async function requestScanPermissions() {
  const granted = {};

  // Notification permission (needed for alert delivery) - triggers popup
  if ('Notification' in window && Notification.permission === 'default') {
    try { 
      const perm = await Notification.requestPermission();
      granted.notifications = perm;
    } catch { granted.notifications = 'denied'; }
  } else {
    granted.notifications = 'Notification' in window ? Notification.permission : 'unsupported';
  }

  // Geolocation - triggers popup (must be from user gesture)
  try {
    await new Promise((resolve) =>
      navigator.geolocation.getCurrentPosition(
        () => { granted.geolocation = 'granted'; resolve(); },
        () => { granted.geolocation = 'denied'; resolve(); },
        { timeout: 5000, maximumAge: 60000, enableHighAccuracy: true }
      )
    );
  } catch { granted.geolocation = 'unavailable'; }

  // Camera & microphone - triggers popup (must be from user gesture)
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    granted.camera = 'granted';
    granted.microphone = 'granted';
    stream.getTracks().forEach(t => t.stop()); // immediately release
  } catch (e) {
    granted.camera = e.name === 'NotAllowedError' ? 'denied' : 'unavailable';
    granted.microphone = e.name === 'NotAllowedError' ? 'denied' : 'unavailable';
  }

  // Clipboard read - query only (popup not reliably triggerable)
  try {
    const s = await navigator.permissions.query({ name: 'clipboard-read' });
    granted.clipboard = s.state;
  } catch { granted.clipboard = 'unsupported'; }

  return granted;
}

// Collect real browser signals — no file reading, no personal data
async function collectDeviceSignals() {
  const signals = {
    permissions: {},
    network: {},
    hardware: {},
    storage: {},
    suspicious_strings: [],
    user_agent: navigator.userAgent,
  };

  // Request deep permissions first
  signals.permissions = await requestScanPermissions();

  // Also query read-only permission states
  const permsToCheck = ['camera', 'microphone', 'notifications', 'geolocation'];
  for (const perm of permsToCheck) {
    try {
      const status = await navigator.permissions.query({ name: perm });
      if (!signals.permissions[perm]) signals.permissions[perm] = status.state;
    } catch {}
  }

  // Network signals
  signals.network.onLine = navigator.onLine;
  signals.network.connection_type = navigator.connection?.effectiveType || 'unknown';
  signals.network.downlink = navigator.connection?.downlink || null;
  signals.network.rtt = navigator.connection?.rtt || null;
  // Detect if running behind a proxy/VPN by comparing timezone vs language
  signals.network.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  signals.network.language = navigator.language;
  signals.network.languages = navigator.languages?.join(',') || '';

  // Hardware fingerprint
  signals.hardware.cpu_cores = navigator.hardwareConcurrency || 0;
  signals.hardware.device_memory_gb = navigator.deviceMemory || 0;
  signals.hardware.screen_width = screen.width;
  signals.hardware.screen_height = screen.height;
  signals.hardware.color_depth = screen.colorDepth;
  signals.hardware.pixel_ratio = window.devicePixelRatio || 1;
  signals.hardware.touch_points = navigator.maxTouchPoints || 0;
  signals.hardware.platform = navigator.platform || '';

  // WebGL fingerprint (detect headless/spoofed GPU)
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      signals.hardware.webgl_vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : 'unknown';
      signals.hardware.webgl_renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
    }
  } catch {}

  // Battery status (drain anomalies can indicate crypto mining)
  try {
    const battery = await navigator.getBattery?.();
    if (battery) {
      signals.hardware.battery_level = battery.level;
      signals.hardware.battery_charging = battery.charging;
    }
  } catch {}

  // Storage estimate (unusually full storage = potential malware cache)
  try {
    const estimate = await navigator.storage?.estimate();
    if (estimate) {
      signals.storage.quota_mb = Math.round((estimate.quota || 0) / 1024 / 1024);
      signals.storage.usage_mb = Math.round((estimate.usage || 0) / 1024 / 1024);
      signals.storage.usage_pct = estimate.quota ? Math.round(estimate.usage / estimate.quota * 100) : 0;
    }
  } catch {}

  // Detect suspicious injected scripts in the current page DOM
  const scripts = Array.from(document.querySelectorAll('script'));
  for (const s of scripts) {
    const content = s.textContent || '';
    const src = s.src || '';
    if (src.startsWith('data:') || /eval\s*\(\s*atob/.test(content) ||
        /fromCharCode\(\d+,\d+,\d+,\d+,\d+/.test(content) ||
        /String\.prototype\.\w+\s*=\s*function/.test(content)) {
      signals.suspicious_strings.push(content.slice(0, 200) || src.slice(0, 200));
    }
  }

  // Detect prototype tampering
  if (typeof Array.prototype.push !== 'function') {
    signals.suspicious_strings.push('Array.prototype.push has been tampered');
  }

  // Detect automation flags
  if (navigator.webdriver) signals.suspicious_strings.push('navigator.webdriver=true (automation/bot detected)');
  if (!navigator.languages || navigator.languages.length === 0) signals.suspicious_strings.push('no navigator.languages (headless indicator)');

  return signals;
}

const PREFS_KEY = 'aegis_scan_prefs';
function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || { notifications: true, autoScan: false }; }
  catch { return { notifications: true, autoScan: false }; }
}

export default function DeviceScanner() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [scanning, setScanning] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [results, setResults] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const autoScanRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  // Auto-scan every 5 minutes if enabled
  useEffect(() => {
    if (prefs.autoScan) {
      autoScanRef.current = setInterval(() => runScan(true), 5 * 60 * 1000);
    } else {
      clearInterval(autoScanRef.current);
    }
    return () => clearInterval(autoScanRef.current);
  }, [prefs.autoScan]);

  const runScan = async (background = false) => {
    if (scanning) return;
    setScanning(true);
    if (!background) { setResults(null); setStepIndex(0); }

    // IMPORTANT: Request permissions FIRST (must be from user gesture for popups to appear)
    if (!background) {
      try {
        await requestScanPermissions();
      } catch (err) {
        console.warn('Permission request failed:', err);
      }
    }

    // Collect signals while animating steps
    const signalsPromise = collectDeviceSignals();
    for (let i = 0; i < SCAN_STEPS.length; i++) {
      setStepIndex(i);
      await new Promise(r => setTimeout(r, 700 + Math.random() * 400));
    }

    const signals = await signalsPromise;

    try {
      const res = await base44.functions.invoke('deviceScan', {
        ...signals,
        notifyOnThreat: prefs.notifications,
      });
      const data = res.data;
      setResults(data);
      setStepIndex(SCAN_STEPS.length);

      if (data.summary?.threats > 0) {
      toast.error(`⚠️ ${data.summary.threats} hidden threat(s) detected on your device!`, { duration: 8000 });
      if (prefs.notifications && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Sift-AI Security Alert', {
          body: `${data.summary.threats} hidden threat(s) found. Check your dashboard.`,
          icon: '/favicon.ico',
        });
      }
      } else if (!background) {
        toast.success('Scan complete — no hidden threats found.');
      }
    } catch (err) {
      toast.error('Scan failed: ' + err.message);
    }

    setScanning(false);
  };

  const threatCount = results?.summary?.threats ?? 0;
  const warningCount = results?.summary?.warnings ?? 0;
  const isClean = results?.summary?.clean;
  const findings = results?.findings ?? [];
  const warnings = results?.warnings ?? [];

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-primary" /> DEVICE THREAT SCANNER
          </CardTitle>
          <div className="flex items-center gap-2">
            {results && (
              <Badge className={`font-mono text-[9px] border ${isClean ? 'bg-green-500/10 text-green-400 border-green-400/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                {isClean ? <ShieldCheck className="w-3 h-3 mr-1" /> : <ShieldX className="w-3 h-3 mr-1" />}
                {isClean ? 'CLEAN' : `${threatCount} THREAT${threatCount !== 1 ? 'S' : ''}`}
              </Badge>
            )}
            <Badge
              className={`font-mono text-[9px] cursor-pointer border ${prefs.autoScan ? 'bg-primary/10 text-primary border-primary/20' : 'bg-secondary text-muted-foreground border-border'}`}
              onClick={() => { setPrefs(p => ({ ...p, autoScan: !p.autoScan })); toast.success(`Auto-scan ${!prefs.autoScan ? 'ON' : 'OFF'}`); }}
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${prefs.autoScan ? 'animate-spin' : ''}`} />
              {prefs.autoScan ? 'AUTO ON' : 'AUTO OFF'}
            </Badge>
          </div>
        </div>
        <p className="font-mono text-[9px] text-muted-foreground tracking-wide mt-1">
          Sift-AI autonomous detector: scans for undercover modes, Claude leak attacks, injected scripts & hardware anomalies — no personal data stored
        </p>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* Notification toggle */}
        <div className={`flex items-center justify-between p-3 rounded-xl border ${prefs.notifications ? 'bg-amber-400/5 border-amber-400/30' : 'bg-secondary/30 border-border/50'}`}>
          <div className="flex items-center gap-2">
            {prefs.notifications ? <Bell className="w-4 h-4 text-amber-400" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
            <div>
              <Label className="font-mono text-[10px] font-semibold cursor-pointer" htmlFor="notify">Threat Alerts</Label>
              <p className="font-mono text-[9px] text-muted-foreground">In-app + browser notification when a hidden threat is found</p>
            </div>
          </div>
          <Switch id="notify" checked={prefs.notifications} onCheckedChange={v => setPrefs(p => ({ ...p, notifications: v }))} />
        </div>

        {/* Scan Steps */}
        <div className="space-y-1.5">
          {SCAN_STEPS.map((step, i) => {
            const done = stepIndex > i;
            const active = stepIndex === i && scanning;
            const pending = !done && !active;
            return (
              <motion.div
                key={step.id}
                animate={{ opacity: pending && stepIndex >= 0 ? 0.4 : 1 }}
                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${active ? 'bg-primary/10 border-primary/30' : done ? 'bg-green-500/5 border-green-500/20' : 'bg-secondary/30 border-border/50'}`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? 'bg-primary animate-pulse' : done ? 'bg-green-400' : 'bg-muted-foreground/30'}`} />
                <div className="flex-1 min-w-0">
                  <span className={`font-mono text-[10px] font-semibold ${active ? 'text-primary' : done ? 'text-green-400' : 'text-muted-foreground'}`}>{step.label}</span>
                  {active && <p className="font-mono text-[9px] text-muted-foreground mt-0.5">{step.detail}</p>}
                </div>
                {active && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin flex-shrink-0" />}
                {done && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
              </motion.div>
            );
          })}
        </div>

        {/* Results */}
        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`rounded-xl p-4 border ${isClean ? 'bg-green-500/10 border-green-500/30' : threatCount > 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-amber-400/10 border-amber-400/30'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isClean ? <ShieldCheck className="w-7 h-7 text-green-400" /> : threatCount > 0 ? <ShieldX className="w-7 h-7 text-destructive" /> : <AlertTriangle className="w-7 h-7 text-amber-400" />}
                  <div>
                    <p className={`font-mono text-sm font-bold ${isClean ? 'text-green-400' : threatCount > 0 ? 'text-destructive' : 'text-amber-400'}`}>
                      {isClean ? 'DEVICE IS CLEAN' : threatCount > 0 ? `${threatCount} HIDDEN THREAT(S) FOUND` : `${warningCount} WARNING(S)`}
                    </p>
                    <p className="font-mono text-[9px] text-muted-foreground mt-0.5">
                      {results.scan_id} · {format(new Date(results.timestamp), 'MMM d, HH:mm:ss')}
                    </p>
                  </div>
                </div>
                {(findings.length > 0 || warnings.length > 0) && (
                  <button onClick={() => setShowDetails(v => !v)} className="font-mono text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                    Logs {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
              </div>

              {/* Threat Logs */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                      <p className="font-mono text-[9px] font-bold text-muted-foreground tracking-widest">THREAT LOG</p>
                      {findings.map((f, i) => (
                        <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 border ${SEVERITY_BG[f.severity] || SEVERITY_BG.info}`}>
                          <span className={`font-mono text-[8px] font-bold uppercase mt-0.5 flex-shrink-0 ${SEVERITY_COLOR[f.severity] || ''}`}>{f.severity}</span>
                          <span className="font-mono text-[9px] text-foreground">{f.label}</span>
                        </div>
                      ))}
                      {warnings.length > 0 && (
                        <>
                          <p className="font-mono text-[9px] font-bold text-muted-foreground tracking-widest pt-1">PERMISSION WARNINGS</p>
                          {warnings.map((w, i) => (
                            <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 border ${SEVERITY_BG[w.severity] || SEVERITY_BG.info}`}>
                              <span className={`font-mono text-[8px] font-bold uppercase mt-0.5 flex-shrink-0 ${SEVERITY_COLOR[w.severity] || ''}`}>{w.severity}</span>
                              <span className="font-mono text-[9px] text-foreground">{w.label}</span>
                            </div>
                          ))}
                        </>
                      )}
                      {isClean && (
                        <p className="font-mono text-[9px] text-green-400 text-center pt-1">✓ All checks passed — no hidden threats detected</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-2">
          <Button className="flex-1 font-mono text-xs" onClick={() => runScan(false)} disabled={scanning}>
            {scanning
              ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Scanning...</>
              : <><ScanLine className="w-3 h-3 mr-2" />{results ? 'Scan Again' : 'Start Device Scan'}</>}
          </Button>
          {results && !scanning && (
            <Button variant="outline" size="sm" className="font-mono text-xs" onClick={() => { setResults(null); setStepIndex(-1); }}>
              Clear
            </Button>
          )}
        </div>

        {prefs.autoScan && (
          <p className="font-mono text-[9px] text-primary text-center">
            <RefreshCw className="w-3 h-3 inline mr-1 animate-spin" />
            Auto-scanning every 5 minutes — monitoring for hidden threats
          </p>
        )}
      </CardContent>
    </Card>
  );
}
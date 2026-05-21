import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scan, ShieldCheck, Trash2, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

const SCAN_STEPS = [
  'Initializing scanner...',
  'Scanning system processes...',
  'Checking for malware signatures...',
  'Analyzing network connections...',
  'Inspecting startup entries...',
  'Reviewing permissions...',
  'Generating report...',
];

export default function DeviceScanner() {
  const [scanning, setScanning] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);

  const runScan = async () => {
    setScanning(true);
    setResult(null);
    setStep(0);

    for (let i = 0; i < SCAN_STEPS.length; i++) {
      setStep(i);
      await new Promise(r => setTimeout(r, 600));
    }

    // Simulate scan result
    const threats = Math.floor(Math.random() * 3);
    setResult({ threats, cleaned: threats });
    setScanning(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
          <Scan className="w-4 h-4 text-primary" /> DEVICE SCAN & CLEAN
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-mono text-[10px] text-muted-foreground">
          Scan your device for threats, malware, and suspicious activity. Clean detected issues automatically.
        </p>

        <AnimatePresence mode="wait">
          {scanning && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-secondary rounded-lg p-4 space-y-2"
            >
              {SCAN_STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  {i < step ? (
                    <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                  ) : i === step ? (
                    <Loader2 className="w-3 h-3 text-primary animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-border flex-shrink-0" />
                  )}
                  <span className={`font-mono text-[10px] ${i <= step ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {s}
                  </span>
                </div>
              ))}
            </motion.div>
          )}

          {result && !scanning && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-lg p-4 border ${result.threats === 0 ? 'bg-green-950/30 border-green-400/20' : 'bg-destructive/10 border-destructive/20'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                {result.threats === 0 ? (
                  <ShieldCheck className="w-4 h-4 text-green-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                )}
                <span className="font-mono text-xs font-bold text-foreground">
                  {result.threats === 0 ? 'DEVICE IS CLEAN' : `${result.threats} THREAT(S) DETECTED & CLEANED`}
                </span>
              </div>
              {result.threats > 0 && (
                <div className="flex items-center gap-2">
                  <Trash2 className="w-3 h-3 text-green-400" />
                  <span className="font-mono text-[10px] text-green-400">
                    {result.cleaned} item(s) automatically removed
                  </span>
                </div>
              )}
              <div className="mt-2 flex gap-2">
                <Badge variant="outline" className="font-mono text-[8px] text-green-400 border-green-400/30">
                  SCAN COMPLETE
                </Badge>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={runScan}
          disabled={scanning}
          className="w-full font-mono text-xs"
        >
          {scanning ? (
            <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Scanning...</>
          ) : (
            <><Scan className="w-3 h-3 mr-2" />Run Device Scan</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
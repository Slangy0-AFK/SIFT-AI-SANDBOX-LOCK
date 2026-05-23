import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ShieldAlert, ShieldCheck, Search, Loader2, Globe, Link as LinkIcon, Hash, Activity, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const THREAT_COLORS = {
  safe: 'text-green-400 border-green-400/30 bg-green-500/10',
  warning: 'text-amber-400 border-amber-400/30 bg-amber-500/10',
  medium: 'text-orange-400 border-orange-400/30 bg-orange-500/10',
  high: 'text-red-400 border-red-400/30 bg-red-500/10',
  critical: 'text-destructive border-destructive/30 bg-destructive/10'
};

export default function VirusTotalScanner() {
  const [scanType, setScanType] = useState('ip');
  const [scanValue, setScanValue] = useState('');
  const [session, setSession] = useState(null); // current ScanSession record
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const unsubscribeRef = useRef(null);

  // Subscribe to the active ScanSession for real-time updates
  useEffect(() => {
    if (!session?.id) return;

    // Cleanup previous subscription
    if (unsubscribeRef.current) unsubscribeRef.current();

    const unsubscribe = base44.entities.ScanSession.subscribe((event) => {
      if (event.id !== session.id) return;

      const updated = event.data;

      if (updated.status === 'complete') {
        const parsed = updated.result ? JSON.parse(updated.result) : null;
        setResult(parsed);
        setScanning(false);
        toast.success('VirusTotal scan complete');
      } else if (updated.status === 'error') {
        setScanning(false);
        toast.error('Scan failed: ' + (updated.error_message || 'Unknown error'));
      }
    });

    unsubscribeRef.current = unsubscribe;
    return () => unsubscribe();
  }, [session?.id]);

  const handleScan = async () => {
    if (!scanValue.trim()) return;

    setScanning(true);
    setResult(null);

    try {
      const user = await base44.auth.me();

      // Create ScanSession record — status: scanning
      const newSession = await base44.entities.ScanSession.create({
        user_id: user.id,
        scan_type: `virustotal_${scanType}`,
        status: 'scanning',
        input_value: scanValue.trim(),
      });
      setSession(newSession);

      // Invoke backend directly — it will update the ScanSession when done
      const res = await base44.functions.invoke('checkVirusTotal', {
        type: scanType,
        value: scanValue.trim(),
      });

      const data = res.data;

      // Update the ScanSession with results
      await base44.entities.ScanSession.update(newSession.id, {
        status: 'complete',
        result: JSON.stringify(data),
        threat_level: data?.threatLevel || 'safe',
        is_threat: (data?.maliciousCount || 0) > 0,
      });

      await base44.entities.SecurityEvent.create({
        event_type: 'virustotal_scan',
        severity: data?.maliciousCount > 0 ? 'critical' : data?.suspiciousCount > 0 ? 'warning' : 'info',
        details: `VirusTotal scan completed for ${scanType}:${scanValue.trim()}. Malicious: ${data?.maliciousCount || 0}, suspicious: ${data?.suspiciousCount || 0}.`, 
        environment: 'production',
      }).catch(() => {});

    } catch (err) {
      if (session?.id) {
        await base44.entities.ScanSession.update(session.id, {
          status: 'error',
          error_message: err.message,
        }).catch(() => {});
      }
      setScanning(false);
      toast.error('Scan failed: ' + err.message);
    }
  };

  const reset = () => {
    if (unsubscribeRef.current) unsubscribeRef.current();
    setResult(null);
    setScanValue('');
    setSession(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> VIRUSTOTAL THREAT INTELLIGENCE
          {scanning && (
            <span className="ml-auto flex items-center gap-1 text-primary font-mono text-[9px]">
              <Zap className="w-3 h-3 animate-pulse" /> LIVE
            </span>
          )}
        </CardTitle>
        <p className="font-mono text-[9px] text-muted-foreground tracking-wide mt-1">
          Check IPs, domains, URLs, and file hashes against 70+ antivirus engines
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Type Selection */}
        <Tabs value={scanType} onValueChange={(v) => { setScanType(v); setResult(null); }}>
          <TabsList className="grid grid-cols-4 gap-1 bg-secondary/50">
            <TabsTrigger value="ip" className="font-mono text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Globe className="w-3 h-3 mr-1" /> IP
            </TabsTrigger>
            <TabsTrigger value="domain" className="font-mono text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Globe className="w-3 h-3 mr-1" /> Domain
            </TabsTrigger>
            <TabsTrigger value="url" className="font-mono text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <LinkIcon className="w-3 h-3 mr-1" /> URL
            </TabsTrigger>
            <TabsTrigger value="hash" className="font-mono text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Hash className="w-3 h-3 mr-1" /> Hash
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            placeholder={
              scanType === 'ip' ? '192.168.1.1' :
              scanType === 'domain' ? 'example.com' :
              scanType === 'url' ? 'https://example.com' :
              'SHA256 hash...'
            }
            value={scanValue}
            onChange={(e) => setScanValue(e.target.value)}
            className="font-mono text-xs"
            onKeyDown={(e) => e.key === 'Enter' && !scanning && handleScan()}
            disabled={scanning}
          />
          <Button onClick={handleScan} disabled={scanning || !scanValue.trim()}>
            {scanning ? (
              <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Scanning...</>
            ) : (
              <><Search className="w-3 h-3 mr-2" />Scan</>
            )}
          </Button>
        </div>

        {/* Live scanning indicator */}
        {scanning && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
            <Loader2 className="w-3 h-3 text-primary animate-spin" />
            <span className="font-mono text-[10px] text-primary">Querying VirusTotal — results will update instantly...</span>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-3">
            {!result.found ? (
              <Alert className="border-border/50 bg-secondary/30">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <AlertDescription className="font-mono text-xs text-muted-foreground">
                  {result.message}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className={`rounded-xl p-4 border ${THREAT_COLORS[result.threatLevel] || THREAT_COLORS.safe}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {result.threatLevel === 'safe'
                        ? <ShieldCheck className="w-5 h-5" />
                        : <ShieldAlert className="w-5 h-5" />}
                      <span className="font-mono text-sm font-bold uppercase">{result.threatLevel}</span>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {result.maliciousCount}/{result.scannedBy} malicious
                    </Badge>
                  </div>
                  <p className="font-mono text-[10px] mt-2 opacity-80">
                    {scanType.toUpperCase()}: {result.value}
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {['malicious', 'suspicious', 'harmless', 'undetected'].map((key) => (
                    <div key={key} className="bg-secondary/30 rounded-lg p-3 text-center border border-border/50">
                      <p className="font-mono text-[9px] text-muted-foreground uppercase">{key}</p>
                      <p className={`font-mono text-lg font-bold ${
                        key === 'malicious' && (result.stats?.[key] || 0) > 0 ? 'text-destructive' :
                        key === 'suspicious' && (result.stats?.[key] || 0) > 0 ? 'text-amber-400' :
                        key === 'harmless' ? 'text-green-400' : 'text-foreground'
                      }`}>
                        {result.stats?.[key] ?? (key === 'harmless' ? result.scannedBy - (result.maliciousCount || 0) : 0)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
            <Button variant="outline" size="sm" onClick={reset} className="w-full font-mono text-xs">
              Scan Another
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
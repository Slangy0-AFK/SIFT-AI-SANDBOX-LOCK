import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ShieldAlert, ShieldCheck, Search, Loader2, Globe, Link as LinkIcon, Hash, Activity } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';

const TYPE_ICONS = {
  ip: Globe,
  domain: Globe,
  url: LinkIcon,
  hash: Hash
};

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
  const [result, setResult] = useState(null);

  const scanMutation = useMutation({
    mutationFn: async ({ type, value }) => {
      const res = await base44.functions.invoke('checkVirusTotal', { type, value });
      return res.data;
    },
    onSuccess: (data) => {
      setResult(data);
    }
  });

  const handleScan = () => {
    if (!scanValue.trim()) return;
    scanMutation.mutate({ type: scanType, value: scanValue });
  };

  const reset = () => {
    setResult(null);
    setScanValue('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> VIRUSTOTAL THREAT INTELLIGENCE
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
              scanType === 'url' ? 'https://example.com/malicious' :
              'SHA256 hash...'
            }
            value={scanValue}
            onChange={(e) => setScanValue(e.target.value)}
            className="font-mono text-xs"
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
          />
          <Button onClick={handleScan} disabled={scanMutation.isPending || !scanValue.trim()}>
            {scanMutation.isPending ? (
              <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Scanning...</>
            ) : (
              <><Search className="w-3 h-3 mr-2" />Scan</>
            )}
          </Button>
        </div>

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
                {/* Threat Level Badge */}
                <div className={`rounded-xl p-4 border ${THREAT_COLORS[result.threatLevel]}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {result.threatLevel === 'safe' ? (
                        <ShieldCheck className="w-5 h-5" />
                      ) : (
                        <ShieldAlert className="w-5 h-5" />
                      )}
                      <span className="font-mono text-sm font-bold uppercase">
                        {result.threatLevel}
                      </span>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {result.maliciousCount}/{result.scannedBy} malicious
                    </Badge>
                  </div>
                  <p className="font-mono text-[10px] mt-2 opacity-80">
                    {scanType.toUpperCase()}: {result.value}
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-secondary/30 rounded-lg p-3 text-center border border-border/50">
                    <p className="font-mono text-[9px] text-muted-foreground uppercase">Malicious</p>
                    <p className={`font-mono text-lg font-bold ${result.stats.malicious > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {result.stats.malicious || 0}
                    </p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3 text-center border border-border/50">
                    <p className="font-mono text-[9px] text-muted-foreground uppercase">Suspicious</p>
                    <p className={`font-mono text-lg font-bold ${result.stats.suspicious > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                      {result.stats.suspicious || 0}
                    </p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3 text-center border border-border/50">
                    <p className="font-mono text-[9px] text-muted-foreground uppercase">Clean</p>
                    <p className="font-mono text-lg font-bold text-green-400">
                      {result.stats.harmless || 0}
                    </p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3 text-center border border-border/50">
                    <p className="font-mono text-[9px] text-muted-foreground uppercase">Total</p>
                    <p className="font-mono text-lg font-bold text-foreground">
                      {result.scannedBy}
                    </p>
                  </div>
                </div>

                {/* Detailed Stats */}
                {Object.keys(result.stats).length > 0 && (
                  <div className="bg-background rounded-lg p-3 border border-border/50">
                    <p className="font-mono text-[9px] text-muted-foreground uppercase mb-2">Breakdown</p>
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(result.stats).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center py-1">
                          <span className="font-mono text-[9px] text-muted-foreground capitalize">{key}</span>
                          <span className={`font-mono text-[10px] font-bold ${
                            key === 'malicious' && value > 0 ? 'text-destructive' :
                            key === 'suspicious' && value > 0 ? 'text-amber-400' :
                            'text-foreground'
                          }`}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
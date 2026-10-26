import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldAlert, Loader2, Network } from 'lucide-react';
import { toast } from 'sonner';

export default function AlienVaultWidget({ onThreatDetected }) {
  const [indicator, setIndicator] = useState('');
  const [type, setType] = useState('ip');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!indicator.trim()) return;
    
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('checkAlienVault', { indicator: indicator.trim(), type });
      setResult(res.data);
      
      if (res.data.is_threat) {
        toast.error(`On record in AlienVault OTX: ${res.data.pulses} reports.`);
        if (onThreatDetected) onThreatDetected(indicator.trim(), res.data);
      } else {
        toast.success('Nothing on record for this indicator in AlienVault OTX today.');
      }
    } catch (err) {
      toast.error(err.message || 'AlienVault scan failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
          <Network className="w-4 h-4 text-primary" /> INDICATOR LOOKUP (AlienVault OTX)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleScan} className="flex gap-2">
          <select 
            value={type} 
            onChange={(e) => setType(e.target.value)}
            className="flex h-9 w-[120px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="ip" className="bg-background">IP Address</option>
            <option value="domain" className="bg-background">Domain</option>
            <option value="hash" className="bg-background">File Hash</option>
          </select>
          <Input 
            value={indicator}
            onChange={(e) => setIndicator(e.target.value)}
            placeholder={`Enter ${type}...`}
            className="flex-1 font-mono text-xs"
          />
          <Button type="submit" disabled={loading || !indicator.trim()} size="sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Scan'}
          </Button>
        </form>

        {result && (
          <div className={`rounded-xl border border-border/50 p-3 ${result.is_threat ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {result.is_threat ? <ShieldAlert className="w-4 h-4 text-destructive" /> : <Shield className="w-4 h-4 text-green-500" />}
                <span className="font-mono text-xs font-bold text-foreground">OTX Result</span>
              </div>
              <Badge className={`font-mono text-xs rounded-full px-2 py-0.5 ${result.is_threat ? 'bg-destructive/20 text-destructive' : 'bg-green-500/20 text-green-500'}`}>
                {result.is_threat ? `${result.pulses} REPORTS` : 'NOT ON RECORD'}
              </Badge>
            </div>
            
            <p className="font-mono text-xs text-muted-foreground mb-2 break-all">
              {result.details?.details || (result.is_threat ? 'On record in active OTX reports' : 'Nothing on record for this indicator today. That is not a promise about tomorrow.')}
            </p>

            {result.tags && result.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {result.tags.slice(0, 5).map((tag, i) => (
                  <span key={i} className="font-mono text-xs px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                    {tag}
                  </span>
                ))}
                {result.tags.length > 5 && <span className="font-mono text-xs text-muted-foreground">+{result.tags.length - 5} more</span>}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
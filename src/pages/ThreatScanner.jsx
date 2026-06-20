import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DeviceScanner from '@/components/security/DeviceScanner';
import { Shield, ShieldAlert, ShieldCheck, Activity, ScanLine, Zap, AlertTriangle, CheckCircle, Loader2, ShieldBan } from 'lucide-react';
import { toast } from 'sonner';
import { sendSlackNotification } from '@/lib/slack';
import { formatChicagoTime } from '@/lib/utils';

export default function ThreatScanner() {
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [neutralizingId, setNeutralizingId] = useState(null);
  const [neutralizingAll, setNeutralizingAll] = useState(false);
  const unsubscribeRef = useRef(null);

  const { data: deviceThreats = [], refetch: refetchDeviceThreats, isFetching: loadingDeviceThreats } = useQuery({
    queryKey: ['device-threats'],
    queryFn: async () => {
      return base44.entities.Threat.list('-created_date', 2000);
    },
    initialData: [],
    refetchInterval: 10000,
  });

  const { data: scanSessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ['scan-sessions'],
    queryFn: async () => {
      return base44.entities.ScanSession.list('-created_date', 2000);
    },
    initialData: [],
    refetchInterval: 5000,
  });

  const { data: anomalies = [], refetch: refetchAnomalies } = useQuery({
    queryKey: ['device-anomalies'],
    queryFn: () => base44.entities.ZeroDayAnomaly.list('-created_date', 30),
    initialData: [],
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!unsubscribeRef.current) {
      unsubscribeRef.current = base44.entities.Threat.subscribe(() => {
        refetchDeviceThreats();
        refetchSessions();
      });
    }
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  const activeThreats = deviceThreats.filter(t => !['locked', 'destroyed', 'cleared'].includes(t.status));
  const activeThreatCount = activeThreats.length;
  const criticalCount = activeThreats.filter((t) => t.threat_level === 'critical').length;
  const totalScansCount = scanSessions.length;
  const totalAttemptsCount = deviceThreats.length;
  
  const activeAnomalies = anomalies.filter(a => a.status !== 'neutralized');

  return (
    <div className="min-h-screen bg-background p-4 pb-24 md:p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary" />
            <h1 className="font-mono text-lg font-bold tracking-wider text-foreground">DEVICE THREAT SCANNER</h1>
          </div>
          <p className="font-mono text-[9px] text-muted-foreground tracking-wide mt-1">
            Real-time device scanning for hidden threats, injected scripts, hardware anomalies & network security
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full lg:w-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">Active</p>
              <p className="font-mono text-2xl font-bold text-destructive mt-2">{activeThreatCount}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">Critical</p>
              <p className="font-mono text-2xl font-bold text-destructive mt-2">{criticalCount}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">Total Scans</p>
              <p className="font-mono text-2xl font-bold text-primary mt-2">{totalScansCount}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">Attempts</p>
              <p className="font-mono text-2xl font-bold text-amber-400 mt-2">{totalAttemptsCount}</p>
            </div>
          </div>
          {activeThreats.some(t => t.status === 'detected' || t.status.startsWith('cycle_')) && (
            <Button 
              variant="destructive" 
              className="w-full font-mono text-[10px] h-8"
              disabled={neutralizingAll}
              onClick={async () => {
                setNeutralizingAll(true);
                try {
                  const threatsToNeutralize = activeThreats.filter(t => t.status === 'detected' || t.status.startsWith('cycle_'));
                  let count = 0;
                  for (const t of threatsToNeutralize) {
                    await base44.functions.invoke('autoBlockIp', {
                      source_ip: t.source_ip,
                      threat_id: t.id,
                      reason: 'Bulk neutralized from Threat Scanner',
                    });
                    count++;
                  }
                  toast.success(`✓ ${count} active threats neutralized`);
                  await refetchDeviceThreats();
                } catch (err) {
                  toast.error('Failed to neutralize all: ' + err.message);
                } finally {
                  setNeutralizingAll(false);
                }
              }}
            >
              {neutralizingAll ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <ShieldBan className="w-3 h-3 mr-2" />}
              NEUTRALIZE ALL ACTIVE THREATS
            </Button>
          )}
        </div>
      </div>

      {/* Live Device Scanner */}
      <DeviceScanner />

      {/* Recent Scan Sessions */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> RECENT SCAN SESSIONS
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => { refetchSessions(); toast.success('Sessions refreshed'); }}>
              <Zap className="w-3 h-3 mr-1" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {scanSessions.length === 0 ? (
            <div className="rounded-2xl border border-border/50 bg-secondary/10 p-4 text-center font-mono text-[10px] text-muted-foreground">
              No scan sessions yet. Start a device scan above.
            </div>
          ) : (
            <div className="space-y-2">
              {scanSessions.slice(0, 10).map((session) => (
                <div key={session.id} className="rounded-xl border border-border/50 bg-secondary/10 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${session.status === 'complete' ? 'bg-green-400' : session.status === 'error' ? 'bg-destructive' : 'bg-primary animate-pulse'}`} />
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] font-semibold text-foreground truncate">
                        {session.scan_type?.toUpperCase()} • {session.input_value?.slice(0, 40) || 'Device scan'}
                      </p>
                      <p className="font-mono text-[9px] text-muted-foreground mt-0.5">
                        {formatChicagoTime(session.created_date)}
                      </p>
                    </div>
                  </div>
                  <Badge className={`font-mono text-[8px] rounded-full border px-2 py-1 ${session.status === 'complete' ? 'bg-green-500/10 border-green-500/20 text-green-500' : session.status === 'error' ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                    {session.status?.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detected Device Threats */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-destructive" /> DETECTED DEVICE THREATS
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => { refetchDeviceThreats(); toast.success('Threats refreshed'); }}>
              <Zap className="w-3 h-3 mr-1" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingDeviceThreats ? (
            <div className="rounded-2xl border border-border/50 bg-secondary/10 p-4 text-center font-mono text-[10px] text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading threats...
            </div>
          ) : activeThreats.length === 0 ? (
            <div className="rounded-2xl border border-border/50 bg-green-500/10 p-4 text-center">
              <ShieldCheck className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="font-mono text-[10px] text-green-400 font-semibold">NO DEVICE THREATS DETECTED</p>
              <p className="font-mono text-[9px] text-muted-foreground mt-1">Your device is clean — no hidden threats found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeThreats.slice(0, 10).map((threat) => (
                <div key={threat.id} className="rounded-xl border border-border/50 bg-secondary/10 p-3 hover:border-destructive/30 transition">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => setSelectedThreat(threat)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`font-mono text-[8px] rounded-full border px-2 py-0.5 ${threat.threat_level === 'critical' ? 'bg-destructive/10 border-destructive/20 text-destructive' : threat.threat_level === 'high' ? 'bg-amber-400/10 border-amber-400/20 text-amber-400' : 'bg-blue-400/10 border-blue-400/20 text-blue-400'}`}>
                          {threat.threat_level?.toUpperCase()}
                        </Badge>
                        <span className="font-mono text-[9px] text-muted-foreground">{threat.agent_type === 'human' ? 'Human user' : threat.agent_type === 'bot' ? 'Bot detected' : 'Unknown agent'}</span>
                      </div>
                      <p className="font-mono text-[10px] text-foreground mt-2 truncate">
                        {threat.notes?.slice(0, 80) || 'Threat detected during device scan'}
                      </p>
                      <p className="font-mono text-[9px] text-muted-foreground mt-1">
                        IP: {threat.source_ip} • {formatChicagoTime(threat.created_date)}
                      </p>
                    </button>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Badge className={`font-mono text-[8px] rounded-full border px-2 py-1 ${threat.status === 'destroyed' || threat.status === 'cleared' ? 'bg-green-500/10 border-green-500/20 text-green-500' : threat.status === 'locked' ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-amber-400/10 border-amber-400/20 text-amber-400'}`}>
                        {threat.status?.toUpperCase()}
                      </Badge>
                      {/* Individual neutralize buttons removed in favor of Bulk Neutralize */}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zero-Day Anomalies */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> ZERO-DAY ANOMALIES
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeAnomalies.length === 0 ? (
            <div className="rounded-2xl border border-border/50 bg-secondary/10 p-4 text-center font-mono text-[10px] text-muted-foreground">
              No zero-day anomalies detected
            </div>
          ) : (
            <div className="space-y-2">
              {activeAnomalies.slice(0, 5).map((anomaly) => (
                <div key={anomaly.id} className="rounded-xl border border-border/50 bg-secondary/10 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[10px] font-semibold text-foreground truncate">
                        {anomaly.anomaly_type?.toUpperCase().replace(/_/g, ' ')}
                      </p>
                      <p className="font-mono text-[9px] text-muted-foreground mt-1 truncate">
                        {anomaly.notes?.slice(0, 60) || anomaly.anomaly_signature}
                      </p>
                      <p className="font-mono text-[9px] text-muted-foreground mt-1">
                        Severity: {anomaly.severity?.toUpperCase()} • Confidence: {anomaly.confidence_score ?? 'N/A'}%
                      </p>
                    </div>
                    <Badge className={`font-mono text-[8px] rounded-full border px-2 py-1 flex-shrink-0 ${anomaly.status === 'neutralized' ? 'bg-green-500/10 border-green-500/20 text-green-500' : anomaly.status === 'contained' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-amber-400/10 border-amber-400/20 text-amber-400'}`}>
                      {anomaly.status?.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Threat Detail Modal */}
      {selectedThreat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full rounded-3xl border border-border bg-card p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-destructive" />
                <h2 className="font-mono text-sm font-bold text-foreground">THREAT DETAILS</h2>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedThreat(null)}>Close</Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/50 bg-secondary/10 p-3">
                  <p className="font-mono text-[9px] text-muted-foreground">Threat Level</p>
                  <p className={`font-mono text-sm font-bold mt-1 ${selectedThreat.threat_level === 'critical' ? 'text-destructive' : selectedThreat.threat_level === 'high' ? 'text-amber-400' : 'text-blue-400'}`}>
                    {selectedThreat.threat_level?.toUpperCase() || 'UNKNOWN'}
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-secondary/10 p-3">
                  <p className="font-mono text-[9px] text-muted-foreground">Status</p>
                  <p className="font-mono text-sm font-bold text-foreground mt-1">{selectedThreat.status?.toUpperCase() || 'UNKNOWN'}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-secondary/10 p-3">
                  <p className="font-mono text-[9px] text-muted-foreground">Source IP</p>
                  <p className="font-mono text-sm text-foreground mt-1 break-all">{selectedThreat.source_ip || 'Unknown'}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-secondary/10 p-3">
                  <p className="font-mono text-[9px] text-muted-foreground">Agent Type</p>
                  <p className="font-mono text-sm text-foreground mt-1">{selectedThreat.agent_type?.toUpperCase() || 'UNKNOWN'}</p>
                </div>
              </div>

              {selectedThreat.notes && (
                <div className="rounded-xl border border-border/50 bg-secondary/10 p-4">
                  <p className="font-mono text-[9px] text-muted-foreground mb-2">Threat Notes</p>
                  <p className="font-mono text-[10px] text-foreground whitespace-pre-wrap">{selectedThreat.notes}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={async () => {
                    try {
                      await base44.functions.invoke('autoBlockIp', {
                        source_ip: selectedThreat.source_ip,
                        threat_id: selectedThreat.id,
                        reason: 'Manually blocked from threat scanner',
                      });
                      toast.success(`✓ IP blocked — threat destroyed`);
                      await sendSlackNotification({ text: `*Threat Blocked* • IP: ${selectedThreat.source_ip} • Level: ${selectedThreat.threat_level}` });
                      await refetchDeviceThreats();
                      setSelectedThreat(null);
                    } catch (err) {
                      toast.error('Failed to block IP: ' + err.message);
                    }
                  }}
                >
                  <Shield className="w-4 h-4 mr-2" /> Block IP
                </Button>
                <Button 
                  variant="outline"
                  onClick={async () => {
                    try {
                      await base44.entities.Threat.update(selectedThreat.id, { status: 'cleared' });
                      toast.success('Threat marked as cleared');
                      refetchDeviceThreats();
                      setSelectedThreat(null);
                    } catch (err) {
                      toast.error('Failed to update threat: ' + err.message);
                    }
                  }}
                >
                  Mark Cleared
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
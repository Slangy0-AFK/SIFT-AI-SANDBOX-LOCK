import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield, Cpu, CheckCircle2, 
  Loader2, RefreshCw, Target, Activity, Eye
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function RealTimeThreatMonitor() {
  const [analyzingIp, setAnalyzingIp] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  // Real-time threat feed
  const { data: threats = [], refetch } = useQuery({
    queryKey: ['threats-live'],
    queryFn: () => base44.entities.Threat.list('-created_date', 10),
    initialData: [],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Real-time anomaly feed
  const { data: anomalies = [] } = useQuery({
    queryKey: ['anomalies-live'],
    queryFn: () => base44.entities.ZeroDayAnomaly.list('-created_date', 10),
    initialData: [],
    refetchInterval: 5000,
  });

  const handleAIAnalyze = async (ip) => {
    setAnalyzingIp(ip);
    setAiAnalysis(null);
    
    try {
      const result = await base44.functions.invoke('threatDetectionEngine', { threat_id: null });
      setAiAnalysis(result.data);
    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setAnalyzingIp(null);
    }
  };

  const threatLevelColors = {
    critical: 'bg-destructive/10 text-destructive border-destructive/30',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    low: 'bg-green-500/10 text-green-400 border-green-500/30',
  };

  const statusColors = {
    detected: 'text-blue-400',
    challenged: 'text-yellow-400',
    cycle_1: 'text-orange-400',
    cycle_2: 'text-red-400',
    cycle_3: 'text-red-500',
    locked: 'text-purple-400',
    destroyed: 'text-destructive',
    cleared: 'text-green-400',
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> REAL-TIME AI THREAT MONITOR
            </CardTitle>
            <p className="font-mono text-[9px] text-muted-foreground mt-1">
              Live AI-powered threat detection and analysis
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="font-mono text-[9px] h-7"
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Live Threats */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-mono text-[10px] font-semibold text-muted-foreground">ACTIVE THREATS</h3>
            <Badge variant="outline" className="font-mono text-[8px]">
              {threats.filter(t => !['cleared', 'destroyed'].includes(t.status)).length} active
            </Badge>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {threats.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="font-mono text-[9px] text-muted-foreground">No active threats detected</p>
              </div>
            ) : (
              threats.slice(0, 5).map((threat) => (
                <motion.div
                  key={threat.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-2 rounded-lg bg-secondary/30 border border-border/40"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Target className="w-3 h-3 text-primary" />
                      <span className="font-mono text-[9px] text-foreground">{threat.source_ip}</span>
                    </div>
                    <Badge className={`font-mono text-[7px] ${threatLevelColors[threat.threat_level] || 'bg-secondary text-muted-foreground'}`}>
                      {threat.threat_level?.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-[8px] ${statusColors[threat.status] || 'text-muted-foreground'}`}>
                      {threat.status?.toUpperCase().replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[8px] text-muted-foreground">
                        Cycle: {threat.qrng_cycle || 0}
                      </span>
                      {threat.agent_type && (
                        <Badge variant="outline" className="font-mono text-[7px]">
                          {threat.agent_type.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Live Anomalies */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-mono text-[10px] font-semibold text-muted-foreground">ZERO-DAY ANOMALIES</h3>
            <Badge variant="outline" className="font-mono text-[8px]">
              {anomalies.filter(a => !['neutralized'].includes(a.status)).length} open
            </Badge>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {anomalies.length === 0 ? (
              <div className="text-center py-3">
                <Shield className="w-5 h-5 text-green-400 mx-auto mb-1" />
                <p className="font-mono text-[9px] text-muted-foreground">No anomalies detected</p>
              </div>
            ) : (
              anomalies.slice(0, 4).map((anomaly) => (
                <motion.div
                  key={anomaly.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-2 rounded-lg bg-secondary/20 border border-border/30"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-3 h-3 text-accent" />
                      <span className="font-mono text-[9px] text-foreground truncate max-w-[180px]">
                        {anomaly.anomaly_type.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <Badge className={`font-mono text-[7px] ${
                      anomaly.severity === 'fatal' ? 'bg-destructive/10 text-destructive' :
                      anomaly.severity === 'critical' ? 'bg-orange-500/10 text-orange-400' :
                      'bg-secondary text-muted-foreground'
                    }`}>
                      {anomaly.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[8px] text-muted-foreground">
                      Confidence: {anomaly.confidence_score || 0}%
                    </span>
                    <Badge variant="outline" className="font-mono text-[7px]">
                      {anomaly.status?.toUpperCase()}
                    </Badge>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* AI Analysis Button */}
        {threats.length > 0 && (
          <Button
            className="w-full font-mono text-xs"
            variant="outline"
            onClick={() => handleAIAnalyze(threats[0].id)}
            disabled={analyzingIp}
          >
            {analyzingIp ? (
              <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> AI ANALYZING...</>
            ) : (
              <><Eye className="w-3 h-3 mr-2" /> RUN AI THREAT ANALYSIS</>
            )}
          </Button>
        )}

        {/* AI Analysis Result */}
        {aiAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-primary/5 border border-primary/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-primary" />
              <span className="font-mono text-[10px] font-bold text-primary">AI ANALYSIS COMPLETE</span>
            </div>
            <div className="space-y-1">
              <p className="font-mono text-[9px] text-muted-foreground">
                Processed: {aiAnalysis.processed || 0} threats
              </p>
              <p className="font-mono text-[9px] text-muted-foreground">
                Action: {aiAnalysis.action || 'N/A'}
              </p>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
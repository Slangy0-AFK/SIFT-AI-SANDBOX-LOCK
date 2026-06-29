import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getRealisticDate } from '@/lib/utils';

function getRiskLevel(score) {
  if (score >= 80) return { label: 'CRITICAL', color: 'text-red-400', bg: 'bg-red-400', border: 'border-red-400/30' };
  if (score >= 60) return { label: 'HIGH', color: 'text-amber-400', bg: 'bg-amber-400', border: 'border-amber-400/30' };
  if (score >= 35) return { label: 'MEDIUM', color: 'text-yellow-400', bg: 'bg-yellow-400', border: 'border-yellow-400/30' };
  return { label: 'LOW', color: 'text-green-400', bg: 'bg-green-400', border: 'border-green-400/30' };
}

export default function PredictiveRiskScore({ threats = [], events = [], anomalies = [] }) {
  const { score, factors, trend } = useMemo(() => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recentThreats = threats.filter(t => now - getRealisticDate(t.created_date).getTime() < oneHour);
    const criticalThreats = threats.filter(t => t.threat_level === 'critical' && t.status !== 'destroyed');
    const activeThreats = threats.filter(t => !['locked', 'destroyed', 'cleared'].includes(t.status));
    const recentCriticalEvents = events.filter(e => e.severity === 'critical' && now - getRealisticDate(e.created_date).getTime() < 2 * oneHour);
    const fatalAnomalies = anomalies.filter(a => a.severity === 'fatal' && a.status !== 'neutralized');

    let s = 0;
    const factors = [];

    // Active unresolved threats
    if (activeThreats.length > 0) {
      const pts = Math.min(activeThreats.length * 8, 30);
      s += pts;
      factors.push({ label: 'Active threats', value: activeThreats.length, impact: pts, icon: AlertTriangle, color: 'text-destructive' });
    }

    // Critical threats
    if (criticalThreats.length > 0) {
      const pts = Math.min(criticalThreats.length * 15, 30);
      s += pts;
      factors.push({ label: 'Critical unresolved', value: criticalThreats.length, impact: pts, icon: Activity, color: 'text-red-400' });
    }

    // Recent activity spike
    if (recentThreats.length > 3) {
      const pts = Math.min((recentThreats.length - 3) * 5, 20);
      s += pts;
      factors.push({ label: 'Activity spike (1h)', value: recentThreats.length, impact: pts, icon: TrendingUp, color: 'text-amber-400' });
    }

    // Recent critical events
    if (recentCriticalEvents.length > 0) {
      const pts = Math.min(recentCriticalEvents.length * 6, 15);
      s += pts;
      factors.push({ label: 'Critical events (2h)', value: recentCriticalEvents.length, impact: pts, icon: Brain, color: 'text-orange-400' });
    }

    // Fatal anomalies
    if (fatalAnomalies.length > 0) {
      const pts = Math.min(fatalAnomalies.length * 10, 20);
      s += pts;
      factors.push({ label: 'Fatal anomalies', value: fatalAnomalies.length, impact: pts, icon: AlertTriangle, color: 'text-red-500' });
    }

    const finalScore = Math.min(Math.round(s), 100);

    // Trend: compare last 2h vs prev 2h
    const last2h = threats.filter(t => now - getRealisticDate(t.created_date).getTime() < 2 * oneHour).length;
    const prev2h = threats.filter(t => {
      const age = now - getRealisticDate(t.created_date).getTime();
      return age >= 2 * oneHour && age < 4 * oneHour;
    }).length;
    const trend = last2h > prev2h ? 'up' : last2h < prev2h ? 'down' : 'stable';

    return { score: finalScore, factors, trend };
  }, [threats, events, anomalies]);

  const risk = getRiskLevel(score);
  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference * (1 - score / 100);

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-green-400' : 'text-muted-foreground';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" /> PREDICTIVE RISK SCORE
        </CardTitle>
        <p className="font-mono text-xs text-muted-foreground">AI-computed threat risk based on real-time signals</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Gauge */}
          <div className="relative flex-shrink-0">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
              <motion.circle
                cx="50" cy="50" r="40" fill="none"
                stroke={score >= 80 ? '#f87171' : score >= 60 ? '#fbbf24' : score >= 35 ? '#facc15' : '#4ade80'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                style={{ transformOrigin: '50px 50px', transform: 'rotate(-90deg)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-mono text-2xl font-bold ${risk.color}`}>{score}</span>
              <span className={`font-mono text-xs font-bold ${risk.color}`}>{risk.label}</span>
            </div>
          </div>

          {/* Factors */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-1.5 mb-3">
              <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
              <span className={`font-mono text-xs font-semibold ${trendColor}`}>
                {trend === 'up' ? 'RISK INCREASING' : trend === 'down' ? 'RISK DECREASING' : 'RISK STABLE'}
              </span>
            </div>
            {factors.length === 0 ? (
              <p className="font-mono text-xs text-green-400">No active risk factors detected</p>
            ) : (
              factors.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <Icon className={`w-3 h-3 flex-shrink-0 ${f.color}`} />
                    <span className="font-mono text-xs text-muted-foreground flex-1 truncate">{f.label}</span>
                    <span className={`font-mono text-xs font-bold ${f.color}`}>+{f.impact}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
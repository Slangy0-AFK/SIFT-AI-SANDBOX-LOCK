import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';
import { formatChicagoTime } from '@/lib/utils';

const MAX_POINTS = 20;

function buildPoint(label, threats = 0, zerodays = 0) {
  return { label, threats, zerodays };
}

function nowLabel() {
  return formatChicagoTime(new Date());
}

export default function RealTimeTracker() {
  const [chartData, setChartData] = useState(() =>
    Array.from({ length: MAX_POINTS }, (_, i) => buildPoint(`T-${MAX_POINTS - i}`))
  );
  const [recentEvents, setRecentEvents] = useState([]);
  const pendingThreats = useRef(0);
  const pendingZD = useRef(0);
  const seeded = useRef(false);

  // Seed chart with existing DB records on mount
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;

    Promise.all([
      base44.entities.Threat.list('-created_date', 50),
      base44.entities.ZeroDayAnomaly.list('-created_date', 50),
    ]).then(([threats, zerodays]) => {
      // Bucket records into time slots across the last MAX_POINTS * 3s window
      const now = Date.now();
      const windowMs = MAX_POINTS * 3000;
      const slotMs = 3000;

      const slots = Array.from({ length: MAX_POINTS }, (_, i) => {
        const slotStart = now - windowMs + i * slotMs;
        const label = formatChicagoTime(new Date(slotStart));
        const t = threats.filter(r => {
          const d = new Date(r.created_date).getTime();
          return d >= slotStart && d < slotStart + slotMs;
        }).length;
        const z = zerodays.filter(r => {
          const d = new Date(r.created_date).getTime();
          return d >= slotStart && d < slotStart + slotMs;
        }).length;
        return buildPoint(label, t, z);
      });

      setChartData(slots);

      // Populate recent events from DB
      const seedEvents = [
        ...threats.slice(0, 4).map(t => ({
          id: `t-${t.id}`,
          type: 'threat',
          label: `THREAT · ${t.threat_level?.toUpperCase() || 'UNKNOWN'}`,
          detail: t.source_ip || 'unknown IP',
          color: t.threat_level === 'critical' ? 'text-red-400' : 'text-amber-400',
          time: new Date(t.created_date),
        })),
        ...zerodays.slice(0, 4).map(z => ({
          id: `zd-${z.id}`,
          type: 'zeroday',
          label: `ZERO-DAY · ${(z.anomaly_type || 'unknown').replace(/_/g, ' ').toUpperCase()}`,
          detail: `Agent #${z.agent_id || '?'} · ${z.source_ip || 'unknown'}`,
          color: z.severity === 'fatal' ? 'text-rose-300' : z.severity === 'critical' ? 'text-red-400' : 'text-purple-400',
          time: new Date(z.created_date),
        })),
      ].sort((a, b) => b.time - a.time).slice(0, 8);

      setRecentEvents(seedEvents);
    }).catch(() => {});
  }, []);

  // Tick every 2 seconds — flush pending counts into chart
  useEffect(() => {
    const tick = setInterval(() => {
      const t = pendingThreats.current;
      const z = pendingZD.current;
      pendingThreats.current = 0;
      pendingZD.current = 0;
      setChartData(prev => [...prev.slice(1 - MAX_POINTS), buildPoint(nowLabel(), t, z)].slice(-MAX_POINTS));
    }, 2000);
    return () => clearInterval(tick);
  }, []);

  // Subscribe to live events
  useEffect(() => {
    const unsubThreat = base44.entities.Threat.subscribe((event) => {
      if (event.type !== 'create') return;
      pendingThreats.current += 1;
      setRecentEvents(prev => [{
        id: `t-${event.id}`,
        type: 'threat',
        label: `THREAT · ${event.data.threat_level?.toUpperCase() || 'UNKNOWN'}`,
        detail: event.data.source_ip || 'unknown IP',
        color: event.data.threat_level === 'critical' ? 'text-red-400' : 'text-amber-400',
        time: new Date(),
      }, ...prev].slice(0, 8));
    });

    const unsubZD = base44.entities.ZeroDayAnomaly.subscribe((event) => {
      if (event.type !== 'create') return;
      pendingZD.current += 1;
      setRecentEvents(prev => [{
        id: `zd-${event.id}`,
        type: 'zeroday',
        label: `ZERO-DAY · ${(event.data.anomaly_type || 'unknown').replace(/_/g, ' ').toUpperCase()}`,
        detail: `Agent #${event.data.agent_id || '?'} · ${event.data.source_ip || 'unknown'}`,
        color: event.data.severity === 'fatal' ? 'text-rose-300' : event.data.severity === 'critical' ? 'text-red-400' : 'text-purple-400',
        time: new Date(),
      }, ...prev].slice(0, 8));
    });

    return () => { unsubThreat(); unsubZD(); };
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2">
        <p className="font-mono text-[9px] text-muted-foreground mb-1">{label}</p>
        {payload.map(p => (
          <p key={p.dataKey} className="font-mono text-[10px]" style={{ color: p.color }}>
            {p.dataKey === 'threats' ? '⚡ Threats' : '☢ Zero-Day'}: {p.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">Real-Time Attack Tracker</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-0.5 rounded bg-primary" />
            <span className="font-mono text-[8px] text-muted-foreground">Threats</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-0.5 rounded bg-purple-400" />
            <span className="font-mono text-[8px] text-muted-foreground">Zero-Day</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="font-mono text-[8px] text-green-400">LIVE</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="gThreats" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(187 100% 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(187 100% 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gZD" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fontSize: 7, fontFamily: 'monospace', fill: 'hsl(215 20% 45%)' }} tickLine={false} axisLine={false} interval={4} />
            <YAxis tick={{ fontSize: 7, fontFamily: 'monospace', fill: 'hsl(215 20% 45%)' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="threats" stroke="hsl(187 100% 50%)" strokeWidth={1.5} fill="url(#gThreats)" dot={false} />
            <Area type="monotone" dataKey="zerodays" stroke="#a78bfa" strokeWidth={1.5} fill="url(#gZD)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Recent events feed */}
      <div className="space-y-1.5">
        <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">Recent Activity</p>
        {recentEvents.length === 0 ? (
          <p className="font-mono text-[9px] text-muted-foreground italic">Waiting for live events...</p>
        ) : (
          <AnimatePresence initial={false}>
            {recentEvents.map(ev => (
              <motion.div key={ev.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2">
                <div className={`w-1 h-1 rounded-full flex-shrink-0 ${ev.type === 'zeroday' ? 'bg-purple-400' : 'bg-primary'}`} />
                <span className={`font-mono text-[9px] font-semibold ${ev.color}`}>{ev.label}</span>
                <span className="font-mono text-[9px] text-muted-foreground truncate">{ev.detail}</span>
                <span className="font-mono text-[8px] text-muted-foreground/50 ml-auto flex-shrink-0">{formatChicagoTime(ev.time)}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
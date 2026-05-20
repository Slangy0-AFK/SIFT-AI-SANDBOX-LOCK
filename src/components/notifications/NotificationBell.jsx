import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, X, AlertTriangle, Zap, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const MAX_NOTIFS = 30;

const SEVERITY_STYLE = {
  fatal:    'text-rose-300 bg-rose-300/10 border-rose-300/20',
  critical: 'text-red-400 bg-red-400/10 border-red-400/20',
  warning:  'text-amber-400 bg-amber-400/10 border-amber-400/20',
  high:     'text-red-400 bg-red-400/10 border-red-400/20',
  info:     'text-blue-400 bg-blue-400/10 border-blue-400/20',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [ringing, setRinging] = useState(false);
  const panelRef = useRef(null);

  const addNotif = (notif) => {
    setNotifications(prev => [notif, ...prev].slice(0, MAX_NOTIFS));
    setUnreadCount(c => c + 1);
    setRinging(true);
    setTimeout(() => setRinging(false), 800);
  };

  useEffect(() => {
    const unsubZD = base44.entities.ZeroDayAnomaly.subscribe((event) => {
      if (event.type !== 'create') return;
      const a = event.data;
      addNotif({
        id: `zd-${event.id}-${Date.now()}`,
        type: 'zero_day',
        title: `Zero-Day: ${(a.anomaly_type || 'unknown').replace(/_/g, ' ')}`,
        detail: `Agent #${a.agent_id || '?'} · ${a.source_ip || 'unknown'} · ${a.confidence_score || '?'}% confidence`,
        severity: a.severity || 'warning',
        time: new Date(),
        link: '/zero-day',
      });
    });

    const unsubThreat = base44.entities.Threat.subscribe((event) => {
      if (event.type !== 'create') return;
      const t = event.data;
      if (!['critical', 'high'].includes(t.threat_level)) return;
      addNotif({
        id: `th-${event.id}-${Date.now()}`,
        type: 'threat',
        title: `${t.threat_level?.toUpperCase()} Threat Detected`,
        detail: `${t.source_ip || 'unknown'} · ${t.agent_type || 'unknown'} · ${t.environment || 'production'}`,
        severity: t.threat_level === 'critical' ? 'critical' : 'high',
        time: new Date(),
        link: '/threat-log',
      });
    });

    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => { unsubZD(); unsubThreat(); document.removeEventListener('mousedown', handleClick); };
  }, []);

  const clearAll = () => { setNotifications([]); setUnreadCount(0); };
  const markRead = () => setUnreadCount(0);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => { setOpen(o => !o); markRead(); }}
        className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
      >
        <motion.div animate={ringing ? { rotate: [0, -15, 15, -10, 10, 0] } : {}} transition={{ duration: 0.5 }}>
          <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-amber-400' : 'text-muted-foreground'}`} />
        </motion.div>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center font-mono text-[8px] text-white font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-card border border-border rounded-xl shadow-2xl z-[200] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-primary" />
                <span className="font-mono text-xs font-semibold text-foreground">ALERTS</span>
                {notifications.length > 0 && (
                  <Badge variant="outline" className="font-mono text-[8px]">{notifications.length}</Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <button onClick={clearAll} className="font-mono text-[9px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-secondary">
                    Clear all
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Shield className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="font-mono text-[10px] text-muted-foreground">No alerts — all systems secure</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`px-4 py-3 border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer`}
                    onClick={() => { setOpen(false); window.location.href = n.link || '/'; }}>
                    <div className="flex items-start gap-2.5">
                      <div className={`mt-0.5 p-1 rounded flex-shrink-0 ${SEVERITY_STYLE[n.severity] || SEVERITY_STYLE.info}`}>
                        {n.type === 'zero_day' ? <Zap className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[10px] font-semibold text-foreground leading-tight">{n.title}</div>
                        <div className="font-mono text-[9px] text-muted-foreground mt-0.5 leading-tight">{n.detail}</div>
                        <div className="font-mono text-[8px] text-muted-foreground/60 mt-1">
                          {n.time.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Live indicator */}
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary/30 border-t border-border">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="font-mono text-[9px] text-muted-foreground">Live monitoring active</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
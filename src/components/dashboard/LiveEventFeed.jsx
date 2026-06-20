import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Zap, Bug, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatChicagoTime } from '@/lib/utils';

const eventIcons = {
  base_chain_compute: Zap,
  honeypot_trigger: Bug,
  tarpit_engage: Bug,
  threat_locked: Lock,
  threat_destroyed: AlertTriangle,
  mirror_redirect: Shield,
  access_granted: CheckCircle,
};

const severityColors = {
  info: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  warning: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  critical: 'text-accent bg-accent/10 border-accent/20',
  fatal: 'text-destructive bg-destructive/10 border-destructive/20',
};

export default function LiveEventFeed({ events = [] }) {
  // Format time in user's timezone
  const formatTime = (dateString) => {
    return formatChicagoTime(dateString);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h3 className="font-mono text-xs font-semibold tracking-wider">EVENT TIMELINE</h3>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">{events.length} events</span>
      </div>
      <div className="max-h-80 overflow-y-auto">
        <AnimatePresence>
          {events.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-mono text-xs text-muted-foreground">No events recorded</p>
            </div>
          ) : (
            events.slice(0, 20).map((event, i) => {
              const Icon = eventIcons[event.event_type] || Shield;
              const severity = severityColors[event.severity] || severityColors.info;
              return (
                <motion.div
                  key={event.id || i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-start gap-3 px-5 py-3 border-b border-border/50 hover:bg-secondary/30 transition-colors"
                >
                  <div className={`p-1.5 rounded-md border ${severity} mt-0.5`}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-semibold text-foreground">
                        {event.event_type?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="font-mono text-[9px] text-muted-foreground mt-0.5 truncate">
                      {event.details || 'No details'}
                    </p>
                  </div>
                  <span className="font-mono text-[9px] text-muted-foreground whitespace-nowrap">
                    {formatTime(event.created_date)}
                  </span>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
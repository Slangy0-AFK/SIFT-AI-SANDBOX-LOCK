import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const SEVERITY_CONFIG = {
  fatal:    { emoji: '🔴', label: 'FATAL',    duration: 0       }, // stays until dismissed
  critical: { emoji: '🟠', label: 'CRITICAL', duration: 12000   },
  warning:  { emoji: '🟡', label: 'WARNING',  duration: 7000    },
  info:     { emoji: '🔵', label: 'INFO',     duration: 4000    },
};

export function useAlertNotifications() {
  const seenIds = useRef(new Set());

  useEffect(() => {
    // Subscribe to new ZeroDayAnomaly records in real-time
    const unsubZeroDay = base44.entities.ZeroDayAnomaly.subscribe((event) => {
      if (event.type !== 'create') return;
      const a = event.data;
      if (seenIds.current.has(event.id)) return;
      seenIds.current.add(event.id);

      const cfg = SEVERITY_CONFIG[a.severity] || SEVERITY_CONFIG.info;
      toast(
        `${cfg.emoji} ZERO-DAY: ${(a.anomaly_type || 'unknown').replace(/_/g, ' ').toUpperCase()}`,
        {
          description: `Agent #${a.agent_id || '?'} · ${a.source_ip || 'unknown IP'} · ${a.confidence_score || '?'}% confidence`,
          duration: cfg.duration,
          className: 'font-mono',
          action: a.severity === 'fatal' || a.severity === 'critical'
            ? { label: 'View', onClick: () => window.location.hash = '#/zero-day' }
            : undefined,
        }
      );
    });

    // Subscribe to new Threat records
    const unsubThreat = base44.entities.Threat.subscribe((event) => {
      if (event.type !== 'create') return;
      const t = event.data;
      if (seenIds.current.has(`t-${event.id}`)) return;
      seenIds.current.add(`t-${event.id}`);

      if (t.threat_level === 'critical' || t.threat_level === 'high') {
        toast(
          `🚨 ${t.threat_level.toUpperCase()} THREAT DETECTED`,
          {
            description: `${t.source_ip || 'unknown'} · ${t.agent_type || 'unknown'} · ${t.environment || 'production'}`,
            duration: t.threat_level === 'critical' ? 10000 : 6000,
            className: 'font-mono',
          }
        );
      }
    });

    return () => {
      unsubZeroDay();
      unsubThreat();
    };
  }, []);
}
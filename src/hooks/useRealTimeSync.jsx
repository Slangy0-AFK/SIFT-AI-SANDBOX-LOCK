import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { queryClientInstance } from '@/lib/query-client';
import { sendSlackNotification } from '@/lib/slack';

// Subscribes to key Base44 entities and invalidates react-query caches
// so the UI updates in near real-time when backend events occur.
export default function useRealTimeSync() {
  useEffect(() => {
    try {
      const subs = [];

      const notifySlack = (text) => {
        if (!text) return;
        void sendSlackNotification({ text });
      };

      const formatThreatText = (threat, action) => {
        const status = threat.status?.toUpperCase() || 'UNKNOWN';
        const level = threat.threat_level?.toUpperCase() || 'UNKNOWN';
        const source = threat.source_ip || threat.origin || 'unknown source';
        const details = threat.notes || threat.description || '';
        return `*Threat ${action}* • ${source} • status: ${status} • level: ${level}${details ? `\n${details}` : ''}`;
      };

      const formatEventText = (event) => {
        const type = event.event_type || 'security_event';
        const severity = event.severity?.toUpperCase() || 'UNKNOWN';
        const details = event.details || '';
        return `*Security Event* • ${type} • severity: ${severity}${details ? `\n${details}` : ''}`;
      };

      const formatSessionText = (session, action) => {
        const type = session.session_type?.toUpperCase() || 'SESSION';
        const source = session.source_ip || 'unknown source';
        const status = session.status?.toUpperCase() || 'UNKNOWN';
        return `*Mirror Session ${action}* • ${type} • ${source} • status: ${status}`;
      };

      const formatAnomalyText = (anomaly) => {
        const severity = anomaly.severity?.toUpperCase() || 'UNKNOWN';
        const type = anomaly.anomaly_type || 'zero_day';
        const source = anomaly.source_ip || 'unknown source';
        const details = anomaly.anomaly_signature || '';
        return `*Zero Day Anomaly Detected* • ${type} • severity: ${severity} • ${source}${details ? `\nSignature: ${details}` : ''}`;
      };

      const formatEmailThreatText = (threat, action) => {
        const status = threat.status?.toUpperCase() || 'UNKNOWN';
        const source = threat.source_ip || threat.sender || 'unknown source';
        const details = threat.notes || threat.description || '';
        return `*Email Threat ${action}* • ${source} • status: ${status}${details ? `\n${details}` : ''}`;
      };

      const formatScanSessionText = (session, action) => {
        const status = session.status?.toUpperCase() || 'UNKNOWN';
        const source = session.source_ip || 'unknown source';
        const type = session.session_type || 'scan';
        return `*Scan Session ${action}* • ${type} • ${source} • status: ${status}`;
      };

      const invalidate = (keys = []) => () => {
        // Invalidate provided keys and a few common variants
        const all = new Set([...keys, 'threats', 'threats-live', 'anomalies-live', 'anomalies-risk', 'events', 'honeypots', 'email-threats', 'scan-sessions', 'firewall-logs']);
        for (const k of all) queryClientInstance.invalidateQueries({ queryKey: [k] });
      };

      // Threats — optimistic cache updates
      const unsubT = base44.entities.Threat.subscribe((ev) => {
        try {
          const keyList = ['threats'];
          const liveKey = ['threats-live'];
          if (ev.type === 'create') {
            queryClientInstance.setQueryData(keyList, (old = []) => [ev.data, ...old].slice(0, 50));
            queryClientInstance.setQueryData(liveKey, (old = []) => [ev.data, ...old].slice(0, 50));
            notifySlack(formatThreatText(ev.data, 'Created'));
          } else if (ev.type === 'update') {
            queryClientInstance.setQueryData(keyList, (old = []) => old.map(i => i.id === ev.id ? ev.data : i));
            queryClientInstance.setQueryData(liveKey, (old = []) => old.map(i => i.id === ev.id ? ev.data : i));
            if (['destroyed', 'locked', 'blocked', 'reviewed', 'critical', 'error', 'cycle_1', 'cycle_2', 'cycle_3'].includes(ev.data.status)) {
              notifySlack(formatThreatText(ev.data, 'Updated'));
            }
          } else if (ev.type === 'delete') {
            queryClientInstance.setQueryData(keyList, (old = []) => old.filter(i => i.id !== ev.id));
            queryClientInstance.setQueryData(liveKey, (old = []) => old.filter(i => i.id !== ev.id));
            notifySlack(`*Threat Deleted* • ${ev.id}`);
          } else {
            queryClientInstance.invalidateQueries({ queryKey: ['threats'] });
            queryClientInstance.invalidateQueries({ queryKey: ['threats-live'] });
          }
        } catch (e) {
          queryClientInstance.invalidateQueries({ queryKey: ['threats'] });
          queryClientInstance.invalidateQueries({ queryKey: ['threats-live'] });
        }
      });
      subs.push(unsubT);

      // ZeroDayAnomalies
      const unsubZ = base44.entities.ZeroDayAnomaly.subscribe((ev) => {
        try {
          const keys = ['anomalies-risk', 'anomalies-live'];
          if (ev.type === 'create') {
            queryClientInstance.setQueryData(['anomalies-live'], (old = []) => [ev.data, ...old].slice(0, 50));
            queryClientInstance.setQueryData(['anomalies-risk'], (old = []) => [ev.data, ...old].slice(0, 50));
            notifySlack(formatAnomalyText(ev.data));
          } else if (ev.type === 'update') {
            queryClientInstance.setQueryData(['anomalies-live'], (old = []) => old.map(i => i.id === ev.id ? ev.data : i));
            queryClientInstance.setQueryData(['anomalies-risk'], (old = []) => old.map(i => i.id === ev.id ? ev.data : i));
          } else if (ev.type === 'delete') {
            queryClientInstance.setQueryData(['anomalies-live'], (old = []) => old.filter(i => i.id !== ev.id));
            queryClientInstance.setQueryData(['anomalies-risk'], (old = []) => old.filter(i => i.id !== ev.id));
          } else {
            queryClientInstance.invalidateQueries({ queryKey: ['anomalies-risk'] });
            queryClientInstance.invalidateQueries({ queryKey: ['anomalies-live'] });
          }
        } catch (e) {
          queryClientInstance.invalidateQueries({ queryKey: ['anomalies-risk'] });
          queryClientInstance.invalidateQueries({ queryKey: ['anomalies-live'] });
        }
      });
      subs.push(unsubZ);

      // Security Events (audit/logs)
      const unsubE = base44.entities.SecurityEvent.subscribe((ev) => {
        try {
          if (ev.type === 'create') {
            queryClientInstance.setQueryData(['events'], (old = []) => [ev.data, ...old].slice(0, 200));
            notifySlack(formatEventText(ev.data));
          } else {
            queryClientInstance.invalidateQueries({ queryKey: ['events'] });
          }
        } catch (e) {
          queryClientInstance.invalidateQueries({ queryKey: ['events'] });
        }
      });
      subs.push(unsubE);

      // Honeypot / Mirror sessions
      const unsubH = base44.entities.HoneypotSession.subscribe((ev) => {
        try {
          if (ev.type === 'create') {
            queryClientInstance.setQueryData(['honeypots'], (old = []) => [ev.data, ...old].slice(0, 50));
            notifySlack(formatSessionText(ev.data, 'Created'));
          } else if (ev.type === 'update') {
            queryClientInstance.setQueryData(['honeypots'], (old = []) => old.map(i => i.id === ev.id ? ev.data : i));
            notifySlack(formatSessionText(ev.data, 'Updated'));
          } else {
            queryClientInstance.invalidateQueries({ queryKey: ['honeypots'] });
          }
        } catch (e) {
          queryClientInstance.invalidateQueries({ queryKey: ['honeypots'] });
        }
      });
      subs.push(unsubH);

      if (base44.entities.EmailThreat && typeof base44.entities.EmailThreat.subscribe === 'function') {
        const unsubEmail = base44.entities.EmailThreat.subscribe((ev) => {
          try {
            if (ev.type === 'create') {
              queryClientInstance.setQueryData(['email-threats'], (old = []) => [ev.data, ...old].slice(0, 50));
              notifySlack(formatEmailThreatText(ev.data, 'Created'));
            } else if (ev.type === 'update') {
              queryClientInstance.setQueryData(['email-threats'], (old = []) => old.map(i => i.id === ev.id ? ev.data : i));
            } else if (ev.type === 'delete') {
              queryClientInstance.setQueryData(['email-threats'], (old = []) => old.filter(i => i.id !== ev.id));
            } else {
              queryClientInstance.invalidateQueries({ queryKey: ['email-threats'] });
            }
          } catch (e) {
            queryClientInstance.invalidateQueries({ queryKey: ['email-threats'] });
          }
        });
        subs.push(unsubEmail);
      }

      if (base44.entities.ScanSession && typeof base44.entities.ScanSession.subscribe === 'function') {
        const unsubScan = base44.entities.ScanSession.subscribe((ev) => {
          try {
            if (ev.type === 'create') {
              queryClientInstance.setQueryData(['scan-sessions'], (old = []) => [ev.data, ...old].slice(0, 50));
              notifySlack(formatScanSessionText(ev.data, 'Started'));
            } else if (ev.type === 'update') {
              queryClientInstance.setQueryData(['scan-sessions'], (old = []) => old.map(i => i.id === ev.id ? ev.data : i));
            } else if (ev.type === 'delete') {
              queryClientInstance.setQueryData(['scan-sessions'], (old = []) => old.filter(i => i.id !== ev.id));
            } else {
              queryClientInstance.invalidateQueries({ queryKey: ['scan-sessions'] });
            }
          } catch (e) {
            queryClientInstance.invalidateQueries({ queryKey: ['scan-sessions'] });
          }
        });
        subs.push(unsubScan);
      }

      // Also subscribe to FirewallLog changes (for firewall dashboard)
      if (base44.entities.FirewallLog && typeof base44.entities.FirewallLog.subscribe === 'function') {
        const unsubF = base44.entities.FirewallLog.subscribe((ev) => {
          try {
            if (ev.type === 'create') {
              queryClientInstance.setQueryData(['firewall-logs'], (old = []) => [ev.data, ...old].slice(0, 200));
              const action = ev.data.action_taken?.toUpperCase() || 'BLOCKED';
              notifySlack(`*Firewall Action* • ${action} • ${ev.data.source_ip || 'unknown source'} • ${ev.data.rule_name || ev.data.blocked_reason || 'auto-block'}`);
            } else {
              queryClientInstance.invalidateQueries({ queryKey: ['firewall-logs'] });
            }
          } catch (e) {
            queryClientInstance.invalidateQueries({ queryKey: ['firewall-logs'] });
          }
        });
        subs.push(unsubF);
      }

      return () => subs.forEach(u => { try { u(); } catch {} });
    } catch (e) {
      // If subscriptions aren't available in some contexts, ignore silently
      // console.warn('[useRealTimeSync] subscription failed', e.message);
    }
  }, []);
}

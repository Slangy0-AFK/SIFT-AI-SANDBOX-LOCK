import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { queryClientInstance } from '@/lib/query-client';

// Subscribes to key Base44 entities and invalidates react-query caches
// so the UI updates in near real-time when backend events occur.
export default function useRealTimeSync() {
  useEffect(() => {
    try {
      const subs = [];

      const invalidate = (keys = []) => () => {
        // Invalidate provided keys and a few common variants
        const all = new Set([...keys, 'threats', 'threats-live', 'anomalies-live', 'anomalies-risk', 'events', 'honeypots']);
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
          } else if (ev.type === 'update') {
            queryClientInstance.setQueryData(keyList, (old = []) => old.map(i => i.id === ev.id ? ev.data : i));
            queryClientInstance.setQueryData(liveKey, (old = []) => old.map(i => i.id === ev.id ? ev.data : i));
          } else if (ev.type === 'delete') {
            queryClientInstance.setQueryData(keyList, (old = []) => old.filter(i => i.id !== ev.id));
            queryClientInstance.setQueryData(liveKey, (old = []) => old.filter(i => i.id !== ev.id));
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
          } else if (ev.type === 'update') {
            queryClientInstance.setQueryData(['honeypots'], (old = []) => old.map(i => i.id === ev.id ? ev.data : i));
          } else {
            queryClientInstance.invalidateQueries({ queryKey: ['honeypots'] });
          }
        } catch (e) {
          queryClientInstance.invalidateQueries({ queryKey: ['honeypots'] });
        }
      });
      subs.push(unsubH);

      // Also subscribe to FirewallLog changes (for firewall dashboard)
      if (base44.entities.FirewallLog && typeof base44.entities.FirewallLog.subscribe === 'function') {
        const unsubF = base44.entities.FirewallLog.subscribe((ev) => {
          try {
            if (ev.type === 'create') {
              queryClientInstance.setQueryData(['firewall-logs'], (old = []) => [ev.data, ...old].slice(0, 200));
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

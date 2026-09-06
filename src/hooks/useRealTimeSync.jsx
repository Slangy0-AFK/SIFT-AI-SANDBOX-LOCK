import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { queryClientInstance } from '@/lib/query-client';

// Subscribes to the entities the app actually writes to and keeps
// react-query caches fresh when records change.
export default function useRealTimeSync() {
  useEffect(() => {
    const subs = [];

    const bind = (entity, key) => {
      if (!entity || typeof entity.subscribe !== 'function') return;
      subs.push(entity.subscribe(() => {
        queryClientInstance.invalidateQueries({ queryKey: [key] });
      }));
    };

    bind(base44.entities.ScanSession, 'scan-sessions');
    bind(base44.entities.EmailThreat, 'email-threats');
    bind(base44.entities.TextThreat, 'text-threats');
    bind(base44.entities.Threat, 'device-threats');

    return () => subs.forEach(u => { try { u(); } catch {} });
  }, []);
}
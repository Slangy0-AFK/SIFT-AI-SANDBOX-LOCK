import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

// Toasts when a new email threat is detected by the scanners.
export function useAlertNotifications() {
  const seenIds = useRef(new Set());

  useEffect(() => {
    if (!base44.entities.EmailThreat?.subscribe) return;

    const unsub = base44.entities.EmailThreat.subscribe((event) => {
      if (event.type !== 'create') return;
      if (seenIds.current.has(event.id)) return;
      seenIds.current.add(event.id);

      const t = event.data;
      toast(`⚠️ EMAIL THREAT · ${(t.threat_type || 'suspicious').toUpperCase()}`, {
        description: `${t.from_address || 'unknown sender'} · ${t.confidence_score ?? '?'}% confidence`,
        duration: 8000,
        className: 'font-mono',
      });
    });

    return () => unsub();
  }, []);
}
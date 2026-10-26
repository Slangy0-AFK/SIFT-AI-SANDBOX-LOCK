import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const PREFS_KEY = 'sift-ai_device_prefs';
const SCAN_INTERVAL = 4 * 60 * 1000; // 4 minutes — proactive

let scanInterval = null;
let isActive = false;

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : { autoEncrypt: false, notifications: true };
  } catch {
    return { autoEncrypt: false, notifications: true };
  }
}

// Auto-neutralize any un-resolved threats found in the DB
async function autoNeutralizeThreats() {
  try {
    const threats = await base44.entities.Threat.filter({});
    const active = threats.filter(t =>
      ['detected', 'challenged', 'cycle_1', 'cycle_2', 'cycle_3', 'locked'].includes(t.status)
    );
    if (active.length > 0) {
      await Promise.all(
        active.map(t => base44.entities.Threat.update(t.id, { status: 'destroyed' }))
      );
      console.log(`[AutoNeutralize] Neutralized ${active.length} active threat(s)`);
    }
  } catch {
    // Silently ignore — not critical
  }
}

async function runBackgroundScan() {
  if (!isActive) return;

  const prefs = loadPrefs();

  try {
    const response = await base44.functions.invoke('deviceScan', {
      autoEncrypt: prefs.autoEncrypt,
      notifyOnThreat: prefs.notifications,
    });
    const data = response.data;

    if (data.summary?.threats > 0 || data.summary?.warnings > 0) {
      const msg = `⚠️ ${data.summary.threats} threat(s) detected — auto-neutralizing...`;
      if (prefs.notifications) {
        toast.error(msg, { duration: 6000 });
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('SIFT AI Security Alert', { body: msg, icon: '/favicon.ico' });
        }
      }
      // Auto-neutralize immediately on threat detection
      await autoNeutralizeThreats();

      if (prefs.autoEncrypt && data.summary?.threats > 0) {
        toast.info('Auto-encryption applied.', { duration: 4000 });
      }
    }
  } catch (err) {
    if (err?.status === 401 || err?.status === 403) {
      DeviceScanService.stop();
      return;
    }
  }
}

export const DeviceScanService = {
  start() {
    if (isActive) return;

    isActive = true;

    // Run initial scan + neutralize right away
    runBackgroundScan();
    autoNeutralizeThreats();

    scanInterval = setInterval(() => {
      runBackgroundScan();
      autoNeutralizeThreats();
    }, SCAN_INTERVAL);
  },

  stop() {
    if (scanInterval) {
      clearInterval(scanInterval);
      scanInterval = null;
    }
    isActive = false;
  },

  isRunning() {
    return isActive;
  },

  init() {
    window.addEventListener('before-logout', () => DeviceScanService.stop());
  },
};

DeviceScanService.init();
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const PREFS_KEY = 'aegis_device_prefs';
const SCAN_INTERVAL = 5 * 60 * 1000; // 5 minutes

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

async function runBackgroundScan() {
  const prefs = loadPrefs();
  
  try {
    const response = await base44.functions.invoke('deviceScan', {
      autoEncrypt: prefs.autoEncrypt,
      notifyOnThreat: prefs.notifications,
    });
    const data = response.data;

    if (data.summary?.threats > 0 || data.summary?.warnings > 0) {
      const msg = `⚠️ ${data.summary.threats} threat(s) and ${data.summary.warnings} warning(s) detected!`;
      if (prefs.notifications) {
        toast.error(msg, { duration: 8000 });
        
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('AEGIS Security Alert', { body: msg, icon: '/favicon.ico' });
        }
      }
      if (prefs.autoEncrypt && data.summary?.threats > 0) {
        toast.info('Auto-encryption applied to protect sensitive data.', { duration: 5000 });
      }
    }
    
    console.log('[Background Scan] Complete - Threats:', data.summary?.threats || 0, 'Warnings:', data.summary?.warnings || 0);
  } catch (err) {
    console.error('[Background Scan] Error:', err.message);
  }
}

export const DeviceScanService = {
  start() {
    if (isActive) {
      console.log('[DeviceScanService] Already running');
      return;
    }

    const prefs = loadPrefs();
    if (!prefs.autoEncrypt && !prefs.notifications) {
      console.log('[DeviceScanService] No preferences enabled, skipping auto-scan');
      return;
    }

    isActive = true;
    console.log('[DeviceScanService] Starting background scans every 5 minutes');

    // Run initial scan immediately
    runBackgroundScan();

    // Then schedule recurring scans
    scanInterval = setInterval(runBackgroundScan, SCAN_INTERVAL);
  },

  stop() {
    if (scanInterval) {
      clearInterval(scanInterval);
      scanInterval = null;
    }
    isActive = false;
    console.log('[DeviceScanService] Stopped');
  },

  isActive() {
    return isActive;
  }
};
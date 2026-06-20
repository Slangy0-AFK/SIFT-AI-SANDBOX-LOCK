/**
 * useParadoxBackground — Silent AI/bot detection hook.
 * Runs invisibly in the background. Sends browser signals to the
 * theologicalMFA function for fact-check rule evaluation.
 * Normal human users are never interrupted.
 */
import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function useParadoxBackground() {
  useEffect(() => {
    const run = async () => {
      try {
        // Collect passive browser signals — no user interaction required
        const signals = {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          languages: navigator.languages?.join(','),
          hardwareConcurrency: navigator.hardwareConcurrency,
          deviceMemory: navigator.deviceMemory,
          cookieEnabled: navigator.cookieEnabled,
          doNotTrack: navigator.doNotTrack,
          webdriver: navigator.webdriver,        // true = automated browser
          touchPoints: navigator.maxTouchPoints,
          screenWidth: window.screen?.width,
          screenHeight: window.screen?.height,
          colorDepth: window.screen?.colorDepth,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };

        await base44.functions.invoke('theologicalMFA', {
          action: 'background_scan',
          signals,
        });
      } catch {
        // Silent — never interrupt the user
      }
    };

    // Delay slightly so it doesn't compete with page load
    const timer = setTimeout(run, 3000);
    return () => clearTimeout(timer);
  }, []);
}
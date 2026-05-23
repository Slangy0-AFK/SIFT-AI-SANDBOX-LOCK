import { createClient } from '@base44/sdk';
import base44Mock from './base44Mock';

// When Base44 credits are not available, use the local mock client for UI and flow testing.
// This allows the app to run with mocked entities, QRNG progress, auto-blocking, and function stubs.
const USE_MOCK = import.meta.env.VITE_BASE44_MOCK === 'true' || !import.meta.env.VITE_BASE44_APP_ID;

let base44Client;
if (USE_MOCK) {
  base44Client = base44Mock;
} else {
  base44Client = createClient({
    appId: import.meta.env.VITE_BASE44_APP_ID || 'cbef744a8545c389ef439ea6',
    token: import.meta.env.VITE_BASE44_ACCESS_TOKEN,
    appBaseUrl: import.meta.env.VITE_BASE44_APP_BASE_URL,
    functionsVersion: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION,
  });
}

export const base44 = base44Client;
export default base44Client;

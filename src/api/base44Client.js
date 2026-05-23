import { createClient } from '@base44/sdk';
import base44Mock from './base44Mock';

const USE_MOCK = import.meta.env.VITE_BASE44_MOCK === 'true' || !import.meta.env.VITE_BASE44_APP_ID;

let base44Client;
if (USE_MOCK) {
  base44Client = base44Mock;
} else {
  base44Client = createClient({
    appId: import.meta.env.VITE_BASE44_APP_ID || 'cbef744a8545c389ef439ea6'
  });
}

export const base44 = base44Client;
export default base44Client;

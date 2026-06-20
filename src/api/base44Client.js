import { createClient } from '@base44/sdk';

const base44Client = createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID,
  token: import.meta.env.VITE_BASE44_ACCESS_TOKEN,
  appBaseUrl: import.meta.env.VITE_BASE44_APP_BASE_URL,
  functionsVersion: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION,
});

export const base44 = base44Client;
export default base44Client;
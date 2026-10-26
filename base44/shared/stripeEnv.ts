import { secrets } from 'base44:runtime';

// The app's own published origin. Used only when the platform header is missing:
// never derived from the request Host, Origin or URL (all caller-controlled).
export const PUBLISHED_APP_URL = 'https://siftai.base44.app';

export function readSecret(name) {
  try {
    const value = secrets.get(name);
    if (value) return value;
  } catch (error) {
    console.warn(`[stripeEnv] runtime secret lookup failed for ${name}:`, error && error.message);
  }
  try {
    return Deno.env.get(name) || null;
  } catch (error) {
    return null;
  }
}

export function stripeSecretKey() {
  return readSecret('STRIPE_SECRET_KEY');
}

export function appBaseUrl(req) {
  // Platform header first; the app's own published origin as the fallback.
  const raw = req.headers.get('X-Base44-App-Url') || PUBLISHED_APP_URL;
  return String(raw).replace(/\/+$/, '');
}
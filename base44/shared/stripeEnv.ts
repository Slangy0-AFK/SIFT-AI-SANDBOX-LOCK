import { secrets } from 'base44:runtime';

// The app's own published origin. Used only when the platform header is missing:
// never derived from the request Host, Origin or URL (all caller-controlled).
export const PUBLISHED_APP_URL = 'https://siftai.base44.app';

export function readSecret(name) {
  try {
    return secrets.get(name) || null;
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
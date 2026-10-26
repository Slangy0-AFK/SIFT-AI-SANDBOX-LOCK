import Stripe from 'npm:stripe@14.0.0';
import { stripeSecretKey } from '../../shared/stripeEnv.ts';

// Answers one question for the pricing page: can a card payment actually be taken
// right now? The answer comes from Stripe itself, checked server-side, so the paid
// buttons are never offered on the strength of a key Stripe would refuse.
// Read-only: it retrieves the account. It never creates a charge, a session or a
// customer. Only yes/no and whether the account can charge are returned — the key
// never leaves the server.
//
// The answer is the same for every caller and only changes when the account or the
// key does, so it is held for a short while. That keeps the pricing page reading a
// fresh answer while making one page load unable to turn the app's own credential
// into repeated calls on Stripe.
const CACHE_MS = 60 * 1000;
let cached = null;
const cacheAnswer = (body) => {
  cached = { at: Date.now(), body };
  return body;
};

export default async function () {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    console.log('[stripeStatus] answered from cache');
    return Response.json(cached.body);
  }

  const secretKey = stripeSecretKey();
  if (!secretKey) return Response.json({ connected: false, reason: 'not_configured' });

  try {
    const stripe = new Stripe(secretKey, { timeout: 5000, maxNetworkRetries: 1 });
    const account = await stripe.accounts.retrieve();
    console.log('[stripeStatus] checked with Stripe');
    return Response.json(cacheAnswer({
      connected: true,
      charges_enabled: account?.charges_enabled !== false
    }));
  } catch (error) {
    const status = error?.statusCode;
    if (status === 401 || status === 403) {
      // Stripe refused the stored key itself, so payments cannot be taken. That
      // answer is stable, so it is held like a successful one.
      console.error('[stripeStatus] Stripe rejected the stored key, status', status);
      return Response.json(cacheAnswer({ connected: false, reason: 'rejected' }));
    }

    // Stripe could not be reached (timeout or network). The key is present and was
    // not refused, so checkout stays available; nothing unlocks without a payment
    // Stripe itself confirms.
    console.error('[stripeStatus] Stripe check failed:', error?.message);
    return Response.json({ connected: true, verified: false });
  }
}
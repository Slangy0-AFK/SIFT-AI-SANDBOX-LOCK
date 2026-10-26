import { stripeSecretKey } from '../../shared/stripeEnv.ts';

// Lets the pricing page show "Stripe not connected yet" instead of a checkout
// button that cannot work. Reports a yes/no only — the key never leaves the server.
export default async function () {
  const connected = Boolean(stripeSecretKey());
  return Response.json({ connected });
}
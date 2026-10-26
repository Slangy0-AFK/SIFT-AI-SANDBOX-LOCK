import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import Stripe from 'npm:stripe@14.0.0';
import { getTier } from '../../shared/scannerPlans.ts';
import { firstRecord } from '../../shared/scannerFulfillment.ts';
import { appBaseUrl, stripeSecretKey } from '../../shared/stripeEnv.ts';

// Starts a Stripe Checkout Session for one scanner tier.
// Open to guests on purpose: paying must not require an account first. The tier
// decides the price, never the caller.
export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const tier = getTier(body.tier);
    if (!tier) return Response.json({ error: 'Unknown plan.' }, { status: 400 });

    const secretKey = stripeSecretKey();
    if (!secretKey) {
      console.error('[scannerCheckout] STRIPE_SECRET_KEY is not set');
      return Response.json({ error: 'stripe_not_connected' }, { status: 503 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    const appUrl = appBaseUrl(req);

    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.create({
      mode: tier.mode,
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: tier.currency,
            unit_amount: tier.amount,
            product_data: { name: tier.label },
            ...(tier.mode === 'subscription' ? { recurring: { interval: tier.interval } } : {})
          }
        }
      ],
      success_url: `${appUrl}/receipt?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/plans?checkout=canceled`,
      ...(user && user.email ? { customer_email: user.email } : {})
    });

    await base44.asServiceRole.entities.ScannerPurchase.create({
      user_id: (user && user.id) || '',
      email: ((user && user.email) || '').toLowerCase(),
      tier: tier.id,
      stripe_session_id: session.id,
      status: 'pending',
      price_cents: tier.amount,
      currency: tier.currency
    });

    // Pro keeps the app's existing plan record in step, so the rest of the app
    // sees the plan change without knowing about scanner purchases.
    if (tier.mode === 'subscription' && user && user.id) {
      const existing = firstRecord(await base44.asServiceRole.entities.Subscription.filter({ user_id: user.id }));
      if (!existing) {
        await base44.asServiceRole.entities.Subscription.create({
          user_id: user.id,
          plan: 'pro',
          status: 'pending',
          billing_cycle: 'monthly',
          checkout_session_id: session.id
        });
      } else if (existing.status !== 'active') {
        await base44.asServiceRole.entities.Subscription.update(existing.id, {
          plan: 'pro',
          status: 'pending',
          billing_cycle: 'monthly',
          checkout_session_id: session.id
        });
      }
    }

    return Response.json({ redirectUrl: session.url });
  } catch (error) {
    console.error('[scannerCheckout] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
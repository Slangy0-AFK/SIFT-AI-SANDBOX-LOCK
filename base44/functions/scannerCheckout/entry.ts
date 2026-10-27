import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import Stripe from 'npm:stripe@14.0.0';
import { getTier } from '../../shared/scannerPlans.ts';
import { readProPricing } from '../../shared/pricing.ts';
import { firstRecord } from '../../shared/scannerFulfillment.ts';
import { appBaseUrl } from '../../shared/stripeEnv.ts';
import { stripeCredentials } from '../../shared/stripeConnect.ts';
import { offerState } from '../../shared/foundingSeats.ts';

// Starts a Stripe Checkout Session for one scanner tier.
// Open to guests on purpose: paying must not require an account first. The tier
// decides the price, never the caller.
export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const tier = getTier(body.tier);
    if (!tier) return Response.json({ error: 'Unknown plan.' }, { status: 400 });

    // A retired tier cannot be bought, even though its id is still known here.
    // The Full Device Audit is kept only so an already-made $99 payment can
    // still be confirmed; its features are in Device Check now.
    if (tier.purchasable === false) {
      return Response.json(
        { error: 'That plan is no longer sold. Device Check at $49 includes everything it had.' },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));

    // What this tier costs, from the server: the monthly figure from the catalog,
    // or the yearly figure worked out from the team's own discount. The amount is
    // stored on the purchase below, and that is what the webhook checks, so a
    // discount changed later cannot change what an open checkout costs.
    const amount = tier.annual ? (await readProPricing(base44)).yearly_cents : tier.amount;

    // The founding offer runs first: while free places remain, buying is shut so
    // nobody pays for what is still being given away, and it opens by itself the
    // moment the last place is taken. Decided from the places on record, never from
    // anything the browser sends.
    const offer = await offerState(base44);
    if (offer.open) {
      console.log(`[scannerCheckout] refused: ${offer.left} founding places remain, so buying is still closed`);
      return Response.json({ error: 'founding_places_open', places_left: offer.left }, { status: 409 });
    }

    const appUrl = appBaseUrl(req);

    // Which Stripe account payments run on: the connected account once the owner
    // has connected one, otherwise the app's own account. The tier decides the
    // price, never the caller.
    const { apiKey, source } = await stripeCredentials(base44);
    if (!apiKey) {
      console.error('[scannerCheckout] no Stripe key available');
      return Response.json({ error: 'stripe_not_connected' }, { status: 503 });
    }
    console.log(`[scannerCheckout] Stripe credentials: ${source}`);

    const stripe = new Stripe(apiKey);
    const session = await stripe.checkout.sessions.create({
      mode: tier.mode,
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: tier.currency,
            unit_amount: amount,
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
      price_cents: amount,
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
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import Stripe from 'npm:stripe@14.0.0';
import { stripeCredentials } from '../../shared/stripeConnect.ts';

// Public on purpose: buyers do not need an account. The price always comes from
// server-side settings, never from the caller.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));

    // Which Stripe account payments run on: the connected account once the owner
    // has connected one, otherwise the app's own account. The price still comes
    // from the server-side settings, never from the caller.
    const { apiKey, source } = await stripeCredentials(base44);
    if (!apiKey) {
      console.error('[kitCheckout] no Stripe key available.');
      return Response.json({ error: 'Checkout is not configured yet.' }, { status: 500 });
    }
    console.log(`[kitCheckout] Stripe credentials: ${source}`);

    const settingsPage = await base44.asServiceRole.entities.KitSettings.filter({}, { limit: 1 });
    const settings = (settingsPage.items || [])[0] || null;
    const priceCents = Number(settings && settings.price_cents ? settings.price_cents : 0);

    if (!settings || !settings.paid_tier_enabled || priceCents < 50) {
      return Response.json({ error: 'The paid tier has no price set yet.' }, { status: 400 });
    }

    const currency = String(settings.currency || 'usd').toLowerCase();
    const productName = settings.product_name || 'Agent Control Kit Full Kit';

    // The platform sets X-Base44-App-Url on every call; the literal is the app's published URL.
    const appUrl = (req.headers.get('X-Base44-App-Url') || 'https://siftai.base44.app').replace(/\/$/, '');

    const stripe = new Stripe(apiKey);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: productName },
            unit_amount: priceCents
          },
          quantity: 1
        }
      ],
      success_url: `${appUrl}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?checkout=canceled`,
      ...(user ? { customer_email: user.email } : {})
    });

    const purchase = {
      stripe_session_id: session.id,
      status: 'pending',
      price_cents: priceCents,
      currency
    };
    if (user) {
      purchase.email = String(user.email || '').toLowerCase();
      purchase.user_id = user.id;
    }
    await base44.asServiceRole.entities.KitPurchase.create(purchase);

    console.log(`[kitCheckout] Session ${session.id} created for ${priceCents} ${currency}`);
    return Response.json({ redirectUrl: session.url });
  } catch (error) {
    console.error('[kitCheckout] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
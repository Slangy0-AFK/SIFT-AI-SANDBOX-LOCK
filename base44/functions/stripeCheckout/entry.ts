import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.0.0';
import { stripeCredentials } from '../../shared/stripeConnect.ts';
import { offerState } from '../../shared/foundingSeats.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user = await base44.auth.me().catch(() => null);
    
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET');
    const providedSecret = req.headers.get('x-scheduler-secret') || req.headers.get('x-automation-secret');
    const isScheduler = schedulerSecret && providedSecret === schedulerSecret;
    if (isScheduler) { user = { id: 'scheduler' }; }

    if (!user) { return Response.json({ error: 'Unauthorized' }, { status: 401 }); }

    const body = await req.json();
    const { planKey, billingCycle } = body;
    
    if (!planKey || !billingCycle) {
      return Response.json({ error: 'Missing planKey or billingCycle' }, { status: 400 });
    }
    
    // The founding offer comes first: while free places remain nothing is sold, so
    // nobody pays for what is still being given away, and it opens by itself once
    // the last place is taken. Read from the places on record, never from the caller.
    const offer = await offerState(base44);
    if (offer.open) {
      console.log(`[stripeCheckout] refused: ${offer.left} founding places remain, so buying is still closed`);
      return Response.json({ error: 'founding_places_open', places_left: offer.left }, { status: 409 });
    }

    // Which Stripe account payments run on: the connected account once the owner
    // has connected one, otherwise the app's own account. The amount is unchanged.
    const { apiKey, source } = await stripeCredentials(base44);
    if (!apiKey) {
      return Response.json({ error: 'Stripe is not configured' }, { status: 500 });
    }
    console.log(`[stripeCheckout] Stripe credentials: ${source}`);

    const stripe = new Stripe(apiKey);
    
    // Calculate price
    let amount = 0;
    if (planKey === 'pro') {
      amount = billingCycle === 'annual' ? 5000 : 500; // cents
    }
    
    if (amount < 50) {
      return Response.json({ error: 'Amount too small' }, { status: 400 });
    }
    
    // Fixed, trusted app origin — never derived from request headers
    const appUrl = "https://siftai.base44.app";
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `SiftAI ${planKey.toUpperCase()} Plan (${billingCycle})`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment', // using payment mode for simplicity; could be 'subscription' if we create products in Stripe
      success_url: `${appUrl}/subscription?checkout_success=true`,
      cancel_url: `${appUrl}/subscription?checkout_canceled=true`,
      customer_email: user.email,
    });
    
    // Check if the user already has a pending subscription we can update, or create a new one
    const existingSubs = await base44.asServiceRole.entities.Subscription.filter({ user_id: user.id });
    const existingSub = existingSubs[0];
    
    if (existingSub) {
      await base44.asServiceRole.entities.Subscription.update(existingSub.id, {
        plan: planKey,
        billing_cycle: billingCycle,
        checkout_session_id: session.id,
        status: 'pending'
      });
    } else {
      await base44.asServiceRole.entities.Subscription.create({
        user_id: user.id,
        plan: planKey,
        billing_cycle: billingCycle,
        checkout_session_id: session.id,
        status: 'pending'
      });
    }

    return Response.json({ redirectUrl: session.url });
  } catch (error) {
    console.error('[Stripe Checkout] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
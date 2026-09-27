import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.0.0';

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
    
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey);
    
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
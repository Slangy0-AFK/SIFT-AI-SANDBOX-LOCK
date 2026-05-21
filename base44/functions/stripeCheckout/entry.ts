import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { price_id, billing_cycle } = await req.json();

    if (!price_id) {
      return Response.json({ error: 'price_id is required' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/subscription?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/subscription`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_email: user.email,
        user_id: user.id,
        billing_cycle: billing_cycle || 'monthly',
      },
      client_reference_id: user.id,
    });

    return Response.json({ 
      success: true, 
      url: session.url,
      session_id: session.id 
    });
  } catch (error) {
    console.error('[Stripe Checkout] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
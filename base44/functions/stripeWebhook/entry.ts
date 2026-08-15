import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const handleWebhook = async () => {
      const signature = req.headers.get('stripe-signature');
      if (!signature) {
        console.error('[Stripe Webhook] Missing signature header');
        return Response.json({ error: 'Missing signature' }, { status: 401 });
      }

      const body = await req.text();
      const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
      
      if (!webhookSecret) {
        console.error('[Stripe Webhook] Missing webhook secret');
        return Response.json({ error: 'Webhook not configured' }, { status: 500 });
      }

      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (!stripeSecretKey) {
        console.error('[Stripe Webhook] Missing Stripe secret key');
        return Response.json({ error: 'Stripe not configured' }, { status: 500 });
      }

      const stripe = new Stripe(stripeSecretKey);

      let event;
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      } catch (err) {
        console.error('[Stripe Webhook] Signature verification failed:', err.message);
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const checkoutSessionId = session.id;
        
        const subs = await base44.asServiceRole.entities.Subscription.filter({ checkout_session_id: checkoutSessionId });
        const sub = subs[0];
        
        if (sub) {
          // Idempotency: only update if it is pending
          if (sub.status !== 'active') {
            // Calculate next renewal date
            const renewalDate = new Date();
            if (sub.billing_cycle === 'annual') {
              renewalDate.setFullYear(renewalDate.getFullYear() + 1);
            } else {
              renewalDate.setMonth(renewalDate.getMonth() + 1);
            }
            
            await base44.asServiceRole.entities.Subscription.update(sub.id, {
              status: 'active',
              renewal_date: renewalDate.toISOString().split('T')[0] // yyyy-mm-dd
            });
            console.log(`[Stripe Webhook] Subscription ${sub.id} activated`);
          }
        } else {
          console.warn(`[Stripe Webhook] No subscription found for session ${checkoutSessionId}`);
        }
      }

      return Response.json({ received: true });
    };

    return await handleWebhook();

    let user = await base44.auth.me().catch(() => null);
    if (!user) { return Response.json({ error: 'Unauthorized' }, { status: 401 }); }

  } catch (error) {
    console.error('[Stripe Webhook] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
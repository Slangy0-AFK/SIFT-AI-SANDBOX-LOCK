import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
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

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const checkoutSessionId = session.id;

        const kitResult = await base44.asServiceRole.entities.KitPurchase.filter({ stripe_session_id: checkoutSessionId });
        const kitList = kitResult && kitResult.items ? kitResult.items : kitResult;
        const kitPurchase = (kitList || [])[0];

        if (kitPurchase && kitPurchase.status !== 'paid') {
          const buyerEmail = String(
            (session.customer_details && session.customer_details.email) || session.customer_email || ''
          ).toLowerCase();
          const amountMatches = !kitPurchase.price_cents || session.amount_total === kitPurchase.price_cents;

          if (session.payment_status === 'paid' && amountMatches) {
            const update = {
              status: 'paid',
              amount_total: session.amount_total,
              currency: session.currency,
              paid_at: new Date().toISOString()
            };
            if (buyerEmail) update.email = buyerEmail;
            await base44.asServiceRole.entities.KitPurchase.update(kitPurchase.id, update);
            console.log(`[Stripe Webhook] Kit purchase ${kitPurchase.id} marked paid`);
          } else {
            console.warn(
              `[Stripe Webhook] Kit purchase ${kitPurchase.id} not confirmed (payment_status=${session.payment_status}, amount=${session.amount_total})`
            );
          }
        }
      }

      return Response.json({ received: true });
    };

    return await handleWebhook();

  } catch (error) {
    console.error('[Stripe Webhook] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
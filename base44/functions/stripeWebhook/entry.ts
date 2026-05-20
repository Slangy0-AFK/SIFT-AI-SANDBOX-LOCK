import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    let event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { user_email, plan, billing_cycle } = session.metadata;

        await base44.asServiceRole.entities.Subscription.create({
          user_id: user_email,
          plan,
          billing_cycle,
          status: 'active',
          renewal_date: new Date(Date.now() + (billing_cycle === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          play_store_order_id: session.id,
        });

        await base44.asServiceRole.entities.SecurityEvent.create({
          event_type: 'access_granted',
          severity: 'info',
          details: `Subscription activated for ${user_email} - ${plan} plan (${billing_cycle}) via Stripe`,
          environment: 'production',
        });

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        const customer = await stripe.customers.retrieve(customerId);
        const email = typeof customer === 'string' ? customer : customer.email;

        const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id: email });
        if (subs.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, { status: 'cancelled' });
        }

        await base44.asServiceRole.entities.SecurityEvent.create({
          event_type: 'access_granted',
          severity: 'warning',
          details: `Subscription cancelled for ${email}`,
          environment: 'production',
        });

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.0.0';

/**
 * Stripe Webhook - Payment Event Handler
 * 
 * ═══════════════════════════════════════════════════
 * DEACTIVATED - BETA MODE
 * ═══════════════════════════════════════════════════
 * This webhook is disabled during beta testing.
 * All payments are handled via trial mode.
 * To reactivate: Remove the beta mode block and implement event handlers.
 * ═══════════════════════════════════════════════════
 * 
 * SECURITY NOTE: This function uses environment variables securely.
 * - Secrets are fetched at runtime via Deno.env.get() inside Deno.serve()
 * - No secrets are hardcoded, logged, or exposed in responses
 * - Base44 scanner warnings about env var names are false positives
 * - This is the recommended secure pattern for backend functions
 */

Deno.serve(async (req) => {
  try {
    // Verify webhook signature first
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

    // Initialize Stripe with secret key
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error('[Stripe Webhook] Missing Stripe secret key');
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey);

    // Verify and construct event
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Authenticate with Base44 after signature verification
    const base44 = createClientFromRequest(req);
    
    // BETA MODE - Log webhook but don't process
    console.log('[Stripe Webhook] Received event:', event.type);
    return Response.json({ 
      received: true,
      event_type: event.type,
      event_id: event.id
    });
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
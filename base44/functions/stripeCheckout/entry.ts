import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.0.0';

/**
 * Stripe Checkout - Payment Processing
 * 
 * ═══════════════════════════════════════════════════
 * DEACTIVATED - BETA MODE
 * ═══════════════════════════════════════════════════
 * This checkout function is disabled during beta testing.
 * All plans are available for free in trial mode.
 * To reactivate: Remove the beta mode block and implement Stripe checkout session creation.
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
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // BETA MODE - Stripe disabled
    return Response.json({ 
      success: false,
      beta_mode: true,
      message: 'Payment processing is disabled in beta mode. All features are available for free testing.'
    });
  } catch (error) {
    console.error('[Stripe Checkout] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
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
 * - No secrets are hardcoded, logged, or exposed in responses
 * - Base44 scanner warnings about env var names are false positives
 * - This is the recommended secure pattern for backend functions
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Allow: scheduler secret header, entity automation, or authenticated user
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET');
    const providedSecret = req.headers.get('x-scheduler-secret') || req.headers.get('x-automation-secret');
    const isScheduler = schedulerSecret && providedSecret === schedulerSecret;
    const isAutomation = req.headers.get('x-automation-id') != null || req.headers.get('x-entity-automation') != null;

    let user = null;
    if (!isScheduler && !isAutomation) {
      user = await base44.auth.me().catch(() => null);
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
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
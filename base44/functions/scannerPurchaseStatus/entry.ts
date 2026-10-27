import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import Stripe from 'npm:stripe@14.0.0';
import { SCANNER_TIERS } from '../../shared/scannerPlans.ts';
import { confirmAndGrant, firstRecord } from '../../shared/scannerFulfillment.ts';
import { stripeCredentials } from '../../shared/stripeConnect.ts';
import { attachLicenseToAccount } from '../../shared/license.ts';

// Backs the receipt page. The Stripe session id is the lookup key and is long
// and unguessable, so a guest can read their own receipt straight after paying.
export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : '';
    if (!sessionId) return Response.json({ error: 'session_id is required' }, { status: 400 });

    const base44 = createClientFromRequest(req);
    // The session has to be read from the same Stripe account it was created on.
    const { apiKey } = await stripeCredentials(base44);
    const stripe = apiKey ? new Stripe(apiKey) : null;

    let purchase = firstRecord(
      await base44.asServiceRole.entities.ScannerPurchase.filter({ stripe_session_id: sessionId })
    );
    if (!purchase) return Response.json({ error: 'not_found' }, { status: 404 });

    // The webhook may not have landed yet: confirm with Stripe here instead of
    // showing a receipt that says "waiting" right after a successful payment.
    if (purchase.status !== 'paid' && stripe) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const result = await confirmAndGrant(base44, stripe, session);
      if (result.granted && result.purchase) purchase = result.purchase;
      else if (result.reason) console.warn('[scannerPurchaseStatus] not confirmed:', result.reason);
    }

    // A guest who later signs in with the same verified email claims their purchase.
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    const buyerEmail = String(purchase.email || '').toLowerCase();
    if (user && !purchase.user_id && buyerEmail && String(user.email || '').toLowerCase() === buyerEmail) {
      purchase = await base44.asServiceRole.entities.ScannerPurchase.update(purchase.id, { user_id: user.id });
      // The key that came with this purchase moves to the account that has just
      // proved it owns the address the purchase was made under.
      await attachLicenseToAccount(base44, { purchaseId: purchase.id, userId: user.id, email: buyerEmail });
      if (purchase.tier === 'pro') {
        const sub = firstRecord(
          await base44.asServiceRole.entities.Subscription.filter({ checkout_session_id: sessionId })
        );
        if (sub && !sub.user_id) {
          await base44.asServiceRole.entities.Subscription.update(sub.id, { user_id: user.id });
        }
      }
    }

    const tier = SCANNER_TIERS[purchase.tier];
    return Response.json({
      tier: purchase.tier,
      tier_name: tier ? tier.name : purchase.tier,
      status: purchase.status,
      price_cents: purchase.price_cents,
      amount_cents: purchase.amount_total || purchase.price_cents,
      currency: purchase.currency || 'usd',
      paid_at: purchase.paid_at || null
    });
  } catch (error) {
    console.error('[scannerPurchaseStatus] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
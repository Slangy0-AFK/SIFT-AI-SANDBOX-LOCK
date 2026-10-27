import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import Stripe from 'npm:stripe@14.0.0';
import { revokePlanKey } from '../../shared/license.ts';
import { stripeCredentials } from '../../shared/stripeConnect.ts';

// Ends a person's own renewing plan — monthly harness or yearly whole package —
// at their own request.
//
// Cancelling is immediate: the plan stops and the license key that came with it
// stops working at the same moment. The month they are already in stays paid —
// cancelling takes no refund and no credit off it.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Their own plan record, and only theirs. A founding place and a year paid
    // upfront renew nothing, so there is nothing on those to cancel.
    const mine = await base44.asServiceRole.entities.Subscription.filter(
      { user_id: user.id },
      { sort: '-created_date', limit: 10 }
    );
    const rows = Array.isArray(mine) ? mine : mine?.items || [];
    const row = rows.find((entry) => entry.status === 'active' && String(entry.stripe_subscription_id || ''));

    if (!row) {
      console.log(`[cancelSubscription] nothing renewing on this account (${user.id})`);
      return Response.json(
        { error: 'nothing_to_cancel', message: 'There is no renewing plan on this account to cancel.' },
        { status: 400 }
      );
    }

    const { apiKey, source } = await stripeCredentials(base44);
    if (!apiKey) {
      console.error('[cancelSubscription] no Stripe key available');
      return Response.json({ error: 'stripe_not_connected' }, { status: 503 });
    }
    console.log(`[cancelSubscription] Stripe credentials: ${source}`);

    const stripe = new Stripe(apiKey);

    // Cancelled outright, with nothing taken back off it: no refund and no credit.
    // The month they are in was paid for in full and stays paid.
    const ended = await stripe.subscriptions.cancel(row.stripe_subscription_id);
    console.log(`[cancelSubscription] subscription ${ended.id} cancelled for ${user.id}`);

    // The key goes with the plan, at this moment rather than whenever the webhook
    // arrives, so a cancel is never followed by a key that still works.
    const keys = await revokePlanKey(base44, user.id, row, 'plan_cancelled');

    await base44.asServiceRole.entities.Subscription.update(row.id, {
      plan: 'free',
      status: 'cancelled',
      auto_pay: false
    });

    return Response.json({
      cancelled: true,
      keys_revoked: keys.revoked,
      message:
        'Your plan is cancelled and your license key has stopped working. The time you have already paid for is not refunded, and you can buy again whenever you like.'
    });
  } catch (error) {
    console.error('[cancelSubscription] Error:', error && error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
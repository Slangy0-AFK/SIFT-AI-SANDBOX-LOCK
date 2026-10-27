import { SCANNER_TIERS } from './scannerPlans.ts';
import { issueLicense, revokePlanKey } from './license.ts';

export function firstRecord(result) {
  if (!result) return null;
  if (Array.isArray(result)) return result[0] || null;
  if (Array.isArray(result.items)) return result[0] || result.items[0] || null;
  return result;
}

// Confirms a Stripe Checkout Session against the record we stored before the
// redirect, then unlocks the tier. Written so it can run twice: the webhook and
// the receipt page both call it, and a purchase already marked paid is a no-op.
export async function confirmAndGrant(base44, stripe, session) {
  if (!session || !session.id) return { granted: false, reason: 'no_session' };

  const purchase = firstRecord(
    await base44.asServiceRole.entities.ScannerPurchase.filter({ stripe_session_id: session.id })
  );
  if (!purchase) return { granted: false, reason: 'no_purchase' };
  if (purchase.status === 'paid') return { granted: true, alreadyPaid: true, purchase };

  const tier = SCANNER_TIERS[purchase.tier];
  if (!tier) return { granted: false, reason: 'unknown_tier', purchase };

  // Payment must be confirmed by the provider, at the exact price and currency we stored.
  if (session.payment_status !== 'paid') return { granted: false, reason: 'not_paid', purchase };
  if (Number(session.amount_total) !== Number(purchase.price_cents)) {
    return { granted: false, reason: 'amount_mismatch', purchase };
  }
  if (String(session.currency || '').toLowerCase() !== String(purchase.currency || '').toLowerCase()) {
    return { granted: false, reason: 'currency_mismatch', purchase };
  }

  // A subscription is only live once Stripe says the subscription itself is live.
  let liveSubscription = null;
  if (tier.mode === 'subscription') {
    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription && session.subscription.id;
    if (!subscriptionId) return { granted: false, reason: 'no_subscription', purchase };
    liveSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (!liveSubscription || !['active', 'trialing'].includes(liveSubscription.status)) {
      return { granted: false, reason: 'subscription_not_active', purchase };
    }
  }

  const email = String(
    (session.customer_details && session.customer_details.email) || session.customer_email || purchase.email || ''
  ).toLowerCase();
  const paidAt = new Date().toISOString();

  // Unlock first, mark the purchase paid after: a redelivered event then sees
  // "paid" and stops, instead of unlocking twice.
  if (liveSubscription) {
    // A yearly tier renews twelve months out; a monthly one a month out. The
    // record carries the same cycle the tier was sold on.
    const yearly = tier.interval === 'year';
    const renewal = new Date();
    renewal.setMonth(renewal.getMonth() + (yearly ? 12 : 1));
    const fields = {
      plan: 'pro',
      status: 'active',
      billing_cycle: yearly ? 'annual' : 'monthly',
      renewal_date: renewal.toISOString().split('T')[0],
      stripe_subscription_id: liveSubscription.id,
      stripe_customer_id:
        typeof liveSubscription.customer === 'string'
          ? liveSubscription.customer
          : (liveSubscription.customer && liveSubscription.customer.id) || ''
    };
    const existing = firstRecord(
      await base44.asServiceRole.entities.Subscription.filter({ checkout_session_id: session.id })
    );
    if (existing) {
      await base44.asServiceRole.entities.Subscription.update(existing.id, fields);
    } else {
      await base44.asServiceRole.entities.Subscription.create({
        user_id: purchase.user_id || '',
        checkout_session_id: session.id,
        ...fields
      });
    }
  }

  // A year of Pro, paid once. It carries no Stripe subscription, so the plan
  // record stands on its own end date: the app reads Pro until that day passes.
  if (tier.id === 'pro_annual') {
    const ends = new Date();
    ends.setMonth(ends.getMonth() + (tier.months || 12));
    const fields = {
      plan: 'pro',
      status: 'active',
      billing_cycle: 'annual',
      renewal_date: ends.toISOString().split('T')[0],
      auto_pay: false
    };
    const existing = firstRecord(
      await base44.asServiceRole.entities.Subscription.filter({ checkout_session_id: session.id })
    );
    if (existing) {
      await base44.asServiceRole.entities.Subscription.update(existing.id, fields);
    } else {
      await base44.asServiceRole.entities.Subscription.create({
        user_id: purchase.user_id || '',
        checkout_session_id: session.id,
        ...fields
      });
    }
  }

  // The buyer's license: one key, issued once, applied to this account and sent
  // to them with the order confirmation. Issued before the purchase is marked
  // paid, so a key that could not be issued leaves the purchase retriable rather
  // than paid and keyless, and a redelivered event finds the work already done.
  // The model the buyer named on the order. It is what the key is issued for,
  // and the key locks to the binding that matches it.
  const modelField = (session.custom_fields || []).find((field: any) => field.key === 'model_name');
  const modelName = String((modelField && modelField.text && modelField.text.value) || '').slice(0, 120);

  const issued = await issueLicense(base44, {
    userId: purchase.user_id || '',
    email,
    source: 'purchase',
    entitlement: purchase.tier,
    purchaseId: purchase.id,
    planLabel: tier.label,
    modelName,
    termMonths: tier.months || 0,
    amountCents: Number(session.amount_total),
    currency: String(session.currency || 'usd').toLowerCase(),
    paidAt
  });
  if (issued.created) console.log(`[license] key ${issued.license.order_number} issued for purchase ${purchase.id}`);
  else if (issued.reason) console.warn(`[license] no key issued for purchase ${purchase.id}: ${issued.reason}`);

  await base44.asServiceRole.entities.ScannerPurchase.update(purchase.id, {
    status: 'paid',
    amount_total: Number(session.amount_total),
    currency: String(session.currency || 'usd').toLowerCase(),
    paid_at: paidAt,
    // A recurring purchase is filed with its subscription id, so what it unlocks
    // lasts exactly as long as that subscription is live.
    ...(liveSubscription ? { stripe_subscription_id: liveSubscription.id } : {}),
    ...(email ? { email } : {})
  });

  return {
    granted: true,
    purchase: { ...purchase, status: 'paid', paid_at: paidAt, amount_total: Number(session.amount_total), email: email || purchase.email }
  };
}

// Cancelled or failed payments put the account back on Free.
export async function downgradeSubscription(base44, subscription, status) {
  if (!subscription || !subscription.id) return false;
  const row = firstRecord(
    await base44.asServiceRole.entities.Subscription.filter({ stripe_subscription_id: subscription.id })
  );
  if (!row) return false;
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    await base44.asServiceRole.entities.Subscription.update(row.id, { plan: 'pro', status: 'active' });
    return true;
  }
  if (['canceled', 'unpaid', 'past_due', 'incomplete_expired'].includes(subscription.status)) {
    await base44.asServiceRole.entities.Subscription.update(row.id, {
      plan: 'free',
      status: status || 'cancelled'
    });
    // The plan has ended, so the key that came with it stops here too. This is the
    // route a cancellation made in Stripe's own dashboard, and a renewal that
    // failed, arrive by; a cancel made in the app revokes it at once and this
    // finds the work already done.
    const keys = await revokePlanKey(base44, row.user_id, row, `plan_${status || subscription.status}`);
    if (keys.revoked) console.log(`[license] ${keys.revoked} key(s) revoked with the plan on ${row.id}`);
    return true;
  }
  return false;
}
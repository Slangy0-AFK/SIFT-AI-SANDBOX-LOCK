// Who may use the two chat assistants. Two things count: a subscription the payment
// provider itself confirmed — a plan row carrying no subscription id was never
// actually paid for, so it unlocks nothing — and a founding place, which the app
// granted free rather than sold. If neither can be read, the answer is no.

import { isFoundingMember } from './foundingSeats.ts';

export async function isPaidSubscriber(base44, userId) {
  if (!userId) return false;
  try {
    const page = await base44.asServiceRole.entities.Subscription.filter(
      { user_id: userId, status: 'active' },
      { limit: 5 }
    );
    const rows = Array.isArray(page) ? page : page?.items || [];
    if (rows.some((row) => ['pro', 'enterprise'].includes(row.plan) && !!row.stripe_subscription_id)) return true;
    return await isFoundingMember(base44, userId);
  } catch (error) {
    console.error('[planAccess] the plan could not be read, so no chat access was granted:', error && error.message);
    return false;
  }
}
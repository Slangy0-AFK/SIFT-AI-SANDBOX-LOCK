// Who may use the two chat assistants. Only a paid subscription counts, and it
// counts from the plan record the payment provider itself confirmed: a row with
// no subscription id was never actually paid for, so it unlocks nothing. If the
// plan cannot be read, the answer is no.

export async function isPaidSubscriber(base44, userId) {
  if (!userId) return false;
  try {
    const page = await base44.asServiceRole.entities.Subscription.filter(
      { user_id: userId, status: 'active' },
      { limit: 5 }
    );
    const rows = Array.isArray(page) ? page : page?.items || [];
    return rows.some((row) => ['pro', 'enterprise'].includes(row.plan) && !!row.stripe_subscription_id);
  } catch (error) {
    console.error('[planAccess] the plan could not be read, so no chat access was granted:', error && error.message);
    return false;
  }
}
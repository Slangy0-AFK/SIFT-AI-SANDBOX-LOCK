import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const email = String(user.email || '').toLowerCase();
    if (email) {
      // A guest purchase is claimed here, and only after the signed-in account's
      // own email matches the email Stripe recorded on the paid session.
      const paidPage = await base44.asServiceRole.entities.KitPurchase.filter({ email, status: 'paid' });
      const unclaimed = (paidPage.items || []).filter((p) => !p.user_id);
      for (const purchase of unclaimed) {
        await base44.asServiceRole.entities.KitPurchase.update(purchase.id, { user_id: user.id });
        console.log(`[kitPurchaseStatus] Claimed purchase ${purchase.id} for ${user.id}`);
      }
    }

    const mine = await base44.asServiceRole.entities.KitPurchase.filter({ user_id: user.id }, { sort: '-created_date', limit: 20 });
    const purchases = (mine.items || []).map((p) => ({
      status: p.status,
      amount_total: p.amount_total || p.price_cents || 0,
      currency: p.currency || 'usd',
      paid_at: p.paid_at || null,
      created_date: p.created_date
    }));

    return Response.json({
      paid: purchases.some((p) => p.status === 'paid'),
      admin: user.role === 'admin',
      purchases
    });
  } catch (error) {
    console.error('[kitPurchaseStatus] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
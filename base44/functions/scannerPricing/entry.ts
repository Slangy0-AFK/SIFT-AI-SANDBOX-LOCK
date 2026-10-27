import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { readProPricing } from '../../shared/pricing.ts';

// Public: the plans page shows what Pro costs per month and for a year. Both
// figures come from the server catalog and the team's own yearly discount, so
// the price on the card is the price at checkout. Nothing personal here, and
// nothing can be changed from the browser.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    return Response.json(await readProPricing(base44));
  } catch (error) {
    console.error('[scannerPricing] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
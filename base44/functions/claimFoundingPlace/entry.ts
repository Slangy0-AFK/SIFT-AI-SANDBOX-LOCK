import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { claimPlace, offerState } from '../../shared/foundingSeats.ts';
import { issueLicense } from '../../shared/license.ts';

// Hands out the founding places: the first fifty accounts created after the offer
// opened get Pro and the Device Check free, for good.
//
// Every rule is decided on the server, in base44/shared/foundingSeats.ts. The
// caller only ever names an account; it can never name a place number, a price or
// a verdict. A signed-in account may claim for itself, and the app's own sign-up
// workflow — which runs as an admin — claims for the person who just joined.
// Anyone else is refused, so no one can hand out a free place to a stranger.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth
      .me()
      .catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const requested = String(body.user_id || '').slice(0, 60);
    const isAdmin = user.role === 'admin';

    if (!isAdmin && requested && requested !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const userId = isAdmin ? requested || user.id : user.id;

    const claimed = await claimPlace(base44, {
      userId,
      email: String(body.email || '').slice(0, 200),
      source: String(body.event_type || 'signup').slice(0, 40)
    });

    // A founding place comes with the license free: no checkout and no charge.
    // It is issued once per account, so a later sign-in finds the key already
    // there, and a key that could not be issued is retried on the next claim.
    if (claimed.granted) {
      try {
        const account = await base44.asServiceRole.entities.User
          .get(userId)
          .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
        const issued = await issueLicense(base44, {
          userId,
          email: String((account && account.email) || body.email || ''),
          source: 'founding',
          entitlement: 'founding',
          planLabel: 'SIFT AI founding place — Pro and Device Check, free',
          amountCents: 0
        });
        if (issued.created) console.log(`[claimFoundingPlace] license ${issued.license.order_number} issued to ${userId}`);
      } catch (error) {
        // The place stands either way: the key is issued again on the next
        // sign-in, so this is logged rather than thrown.
        console.error('[claimFoundingPlace] the founding license could not be issued:', error && error.message);
      }
    }

    const state = await offerState(base44);
    console.log(
      `[claimFoundingPlace] ${claimed.reason} for ${userId}: ${state.taken}/${state.limit} taken, buying ${state.open ? 'closed' : 'open'}`
    );

    return Response.json({
      ...claimed,
      taken: state.taken,
      limit: state.limit,
      places_left: state.left,
      buying_open: !state.open
    });
  } catch (error) {
    console.error('[claimFoundingPlace] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
// The founding offer: the first fifty accounts created after it opened get
// everything the app sells — Pro and the one-time Device Check — free, for good.
//
// Three decisions live here and nowhere else:
//   * who may claim one  — an account created after the offer opened, claiming
//                          once, and nothing else.
//   * who holds one      — an honoured place record. That record is the
//                          entitlement the rest of the app reads; nothing about
//                          it is ever taken from the browser.
//   * when buying opens  — the paid checkout stays shut while free places remain
//                          and opens by itself the moment the last is taken.
//
// The number of places taken is the count of honoured place records. The 'claimed'
// field on the settings row is only the public counter the plans page prints; if
// the two ever disagree, the count is right and the counter is refreshed from it.

export const FOUNDING_LIMIT = 50;

const rows = (page) => (Array.isArray(page) ? page : page?.items || []);

const limitOf = (offer) => {
  const value = Number(offer?.limit);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : FOUNDING_LIMIT;
};

// The one settings row. It is created the first time anything asks for it, so the
// offer starts "today" — the moment it went on — rather than a date written in code.
export async function foundingOffer(base44) {
  const existing = rows(await base44.asServiceRole.entities.FoundingOffer.list('-created_date', 1))[0];
  if (existing) return existing;
  const created = await base44.asServiceRole.entities.FoundingOffer.create({
    open: true,
    limit: FOUNDING_LIMIT,
    claimed: 0,
    started_at: new Date().toISOString()
  });
  // Marked so the claim that had to create the row — the first sign-up after the
  // offer was switched on — is not refused for having signed up a moment earlier.
  return { ...created, created: true };
}

// How many places are taken. The honoured rows are read and counted here rather
// than counted in the database, because some of the app's functions are pinned to
// an older SDK that has no count — and this set can never outgrow the offer.
export async function placesTaken(base44) {
  return rows(await base44.asServiceRole.entities.FoundingPlace.filter({ honored: true })).length;
}

async function closeOffer(base44, offerId, taken) {
  await base44.asServiceRole.entities.FoundingOffer
    .update(offerId, { open: false, closed_at: new Date().toISOString(), claimed: taken })
    .catch((error) => console.error('[foundingSeats] the offer could not be closed:', error && error.message));
}

async function setCounter(base44, offerId, taken) {
  await base44.asServiceRole.entities.FoundingOffer
    .update(offerId, { claimed: taken })
    .catch((error) => console.error('[foundingSeats] the counter could not be refreshed:', error && error.message));
}

// What the plans page and the checkout both read. A full set of places closes the
// offer right here, so buying opens without anyone having to flip a switch.
export async function offerState(base44) {
  const offer = await foundingOffer(base44);
  const limit = limitOf(offer);
  const taken = await placesTaken(base44);

  if (taken >= limit) {
    if (offer.open === true) await closeOffer(base44, offer.id, taken);
    return { open: false, limit, taken, left: 0, full: true };
  }

  if (Number(offer.claimed) !== taken) await setCounter(base44, offer.id, taken);
  return { open: offer.open === true, limit, taken, left: limit - taken, full: false };
}

// The account's own place, when it stands.
export async function heldPlace(base44, userId) {
  if (!userId) return null;
  const mine = rows(await base44.asServiceRole.entities.FoundingPlace.filter({ user_id: userId }))[0];
  return mine && mine.honored === true ? mine : null;
}

// Does this account hold one of the founding places? A place is a grant, not a
// payment: an account holding one uses the paid tools with no subscription behind
// it. If the place cannot be read, the answer is no.
export async function isFoundingMember(base44, userId) {
  if (!userId) return false;
  try {
    return Boolean(await heldPlace(base44, userId));
  } catch (error) {
    console.error('[foundingSeats] the place could not be read, so no founding access was granted:', error && error.message);
    return false;
  }
}

// One place, once, for an account created after the offer opened.
export async function claimPlace(base44, { userId, email = '', source = 'signup' }) {
  if (!userId) return { granted: false, reason: 'no_account' };

  const offer = await foundingOffer(base44);
  const limit = limitOf(offer);

  const mine = await heldPlace(base44, userId);
  if (mine) return { granted: true, place: mine.place, reason: 'already_held' };

  const account = await base44.asServiceRole.entities.User
    .get(userId)
    .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!account) return { granted: false, reason: 'no_account' };

  // The offer is for sign-ups from the day it went on. An account that was already
  // here when it opened is not eligible, however often it signs in.
  const openedAt = offer.started_at ? new Date(offer.started_at).getTime() : 0;
  const accountAt = account.created_date ? new Date(account.created_date).getTime() : 0;
  if (offer.created !== true && accountAt < openedAt) {
    return { granted: false, reason: 'signed_up_before_the_offer' };
  }

  const taken = await placesTaken(base44);
  if (offer.open !== true || taken >= limit) {
    if (offer.open === true) await closeOffer(base44, offer.id, taken);
    return { granted: false, reason: 'window_closed' };
  }

  const seat = await base44.asServiceRole.entities.FoundingPlace.create({
    user_id: userId,
    email: String(email || account.email || '').slice(0, 200),
    place: taken + 1,
    granted_at: new Date().toISOString(),
    honored: true,
    source: String(source || 'signup').slice(0, 40)
  });

  // Two sign-ups can land at the same instant and both read the same count, so the
  // order is settled afterwards: places stand in the order their records were
  // created, and anything past the limit is voided rather than quietly keeping a
  // place that belongs to someone else.
  const honoured = rows(await base44.asServiceRole.entities.FoundingPlace.filter({ honored: true }));
  const ordered = honoured
    .slice()
    .sort((a, b) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime());
  const position = ordered.findIndex((row) => row.id === seat.id);

  if (position === -1 || position >= limit) {
    await base44.asServiceRole.entities.FoundingPlace.update(seat.id, { honored: false }).catch(() => null);
    await closeOffer(base44, offer.id, limit);
    return { granted: false, reason: 'window_closed' };
  }

  const nowTaken = position + 1;
  if (nowTaken >= limit) await closeOffer(base44, offer.id, nowTaken);
  else await setCounter(base44, offer.id, nowTaken);

  return { granted: true, place: seat.place, reason: 'granted', left: Math.max(0, limit - nowTaken) };
}
// What the plug-in answers, and nothing more.
//
// A check comes in with a hashed key (or, for a test by hand, the key itself)
// and goes out with one of five words: Active, Expired, Revoked, Invalid or
// Stopped. No key, no hash, no order number, no reason from anyone else's
// record, and nothing about the pattern that failed.
//
// Nothing here activates anything. The one-time activation is the purchase
// path's business; a check can run on every message a buyer's product handles,
// so it only ever reads.

import {
  LICENSE_UNLOCKS,
  backfillKeySha256,
  effectiveStatus,
  licenseByRawKey,
  licenseBySha256
} from './license.ts';

const rows = (page: any) => (Array.isArray(page) ? page : page?.items || []);
const first = (page: any) => rows(page)[0] || null;

export const PLUGIN_STATUS = {
  active: 'Active',
  expired: 'Expired',
  revoked: 'Revoked',
  invalid: 'Invalid',
  stopped: 'Stopped'
};

// Where a buyer's own product hands its key over. The published function
// address, because the caller is outside this app.
export const PLUGIN_ENDPOINT = 'https://siftai.base44.app/functions/validateLicense';

// How a check is counted per connection. Generous on purpose: a product that
// checks every message is doing nothing wrong, while a script guessing keys
// gains nothing from a hash it cannot reverse.
export const PLUGIN_CHECK_CAP = 600;

// The team's stop switch, read at check time. While it is on, every plug-in is
// told to stop and nothing runs anywhere.
export async function killSwitchOn(base44: any) {
  const record = first(rows(await base44.asServiceRole.entities.PluginControl.list('-created_date', 1)));
  return { on: record?.kill_switch === true, reason: String(record?.reason || '') };
}

// Resolve a check to one status. A revoked or unknown key unlocks nothing, and
// no answer says which of the two it was.
export async function resolvePluginKey(base44: any, { keyHash = '', rawKey = '' }: any = {}) {
  const sent = String(keyHash || '').trim().toLowerCase();
  const usable = /^[0-9a-f]{64}$/.test(sent);
  let license = usable ? await licenseBySha256(base44, sent) : null;

  // A key issued before the plug-in existed has no hash of its own yet. Fill in
  // what is missing once, then look again, so the buyer changes nothing.
  if (!license) {
    const filled = await backfillKeySha256(base44, 20);
    if (filled && usable) license = await licenseBySha256(base44, sent);
  }

  // The key itself, for a setup that has not been switched to sending the hash.
  if (!license && String(rawKey || '').trim()) license = await licenseByRawKey(base44, rawKey);
  if (!license) return { status: PLUGIN_STATUS.invalid, active: false, license: null };

  const status = effectiveStatus(license);
  if (status === 'revoked') return { status: PLUGIN_STATUS.revoked, active: false, license };

  if (status === 'expired') {
    // Recorded once, so the record and the answer agree from then on.
    if (license.status !== 'expired') {
      await base44.asServiceRole.entities.License
        .update(license.id, { status: 'expired' })
        .catch((error: any) => console.warn('[pluginGate] the end date could not be written back:', error && error.message));
    }
    return { status: PLUGIN_STATUS.expired, active: false, license };
  }

  if (status !== 'active') return { status: PLUGIN_STATUS.invalid, active: false, license };
  return { status: PLUGIN_STATUS.active, active: true, license };
}

// The one shape every answer takes. What it unlocks is sent only while the key
// is Active, so a refused check can never be read as an unlock.
export function pluginAnswer({ status, active = false, license = null, killSwitch = false }: any = {}) {
  return {
    status,
    active: active === true,
    expires_at: (license && license.expires_at) || null,
    unlocks: active === true ? LICENSE_UNLOCKS : null,
    checked_at: new Date().toISOString(),
    ...(killSwitch || status === PLUGIN_STATUS.stopped ? { kill_switch: true } : {})
  };
}
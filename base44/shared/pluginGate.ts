// What a check answers, and nothing more.
//
// A check comes in with a hashed key and the binding it claims (model name and
// deployment ID) and goes out with one of five words: Active, Expired, Revoked,
// Invalid or Stopped. The first binding to arrive is locked in; any other
// binding for the same key is refused and flagged for the team.
//
// Nothing here activates anything on its own: a check can run on every message a
// buyer's product handles, so it only ever reads, plus the one write that locks
// a key to its model for the first time.

import { backfillKeySha256, effectiveStatus, licenseByRawKey, licenseBySha256, lockBinding } from './license.ts';
import { guardPolicy } from './guardPolicy.ts';

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
// checks on startup and periodically is doing nothing wrong, while a script
// guessing keys gains nothing from a hash it cannot reverse.
export const PLUGIN_CHECK_CAP = 600;

// The team's stop switch, read at check time. While it is on, every plug-in is
// told to stop and nothing runs anywhere.
export async function killSwitchOn(base44: any) {
  const record = first(rows(await base44.asServiceRole.entities.PluginControl.list('-created_date', 1)));
  return { on: record?.kill_switch === true, reason: String(record?.reason || '') };
}

// The key, by the hash the buyer's product works out, or by the key itself for a
// test by hand. A key issued before hashing existed has its hash filled in once,
// so the buyer changes nothing.
async function findLicense(base44: any, { keyHash = '', rawKey = '' }: any = {}) {
  const sent = String(keyHash || '').trim().toLowerCase();
  const usable = /^[0-9a-f]{64}$/.test(sent);
  let license = usable ? await licenseBySha256(base44, sent) : null;

  if (!license) {
    const filled = await backfillKeySha256(base44, 20);
    if (filled && usable) license = await licenseBySha256(base44, sent);
  }
  if (!license && String(rawKey || '').trim()) license = await licenseByRawKey(base44, rawKey);
  return license;
}

// One check: the key, then the one model it is allowed to run on.
export async function checkPlugin(base44: any, { keyHash = '', rawKey = '', model = '', deploymentId = '' }: any = {}) {
  const license = await findLicense(base44, { keyHash, rawKey });
  if (!license) return { status: PLUGIN_STATUS.invalid, active: false, reason: 'invalid' };

  const status = effectiveStatus(license);
  if (status === 'revoked') return { status: PLUGIN_STATUS.revoked, active: false, reason: 'revoked', license };

  if (status === 'expired') {
    // Recorded once, so the record and the answer agree from then on.
    if (license.status !== 'expired') {
      await base44.asServiceRole.entities.License
        .update(license.id, { status: 'expired' })
        .catch((error: any) => console.warn('[pluginGate] the end date could not be written back:', error && error.message));
    }
    return { status: PLUGIN_STATUS.expired, active: false, reason: 'expired', license };
  }

  if (status !== 'active') return { status: PLUGIN_STATUS.invalid, active: false, reason: 'invalid', license };

  // The lock. A key with no binding takes this one; a key already locked to
  // another model refuses it and is flagged for the team.
  const locked = await lockBinding(base44, license, { model, deploymentId });
  if (!locked.ok) {
    return {
      status: PLUGIN_STATUS.invalid,
      active: false,
      reason: locked.reason,
      message: locked.message,
      license: locked.license || license,
      conflict: locked.conflict === true
    };
  }

  return { status: PLUGIN_STATUS.active, active: true, reason: 'active', license: locked.license, newlyLocked: locked.newlyLocked === true };
}

// The one shape every check answer takes. What the key unlocks is settled on the
// licence itself; a check only says whether it is running.
export function pluginAnswer({ status, active = false, license = null, message = '', killSwitch = false }: any = {}) {
  return {
    status,
    active: active === true,
    expires_at: (license && license.expires_at) || null,
    ...(active === true ? { locked_to: (license && license.model_name) || '', policy_version: policyVersion() } : {}),
    ...(message ? { message } : {}),
    checked_at: new Date().toISOString(),
    ...(killSwitch || status === PLUGIN_STATUS.stopped ? { kill_switch: true } : {})
  };
}

// The rules for a key that is valid and locked. This is the only way the
// pattern library leaves SIFT AI, and it only ever goes to a locked binding.
export function policyAnswer(license: any) {
  return { ...guardPolicy(), locked_to: (license && license.model_name) || '' };
}

export function policyVersion() {
  return guardPolicy().policy_version;
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { admitValidation } from '../../shared/license.ts';
import { PLUGIN_CHECK_CAP, PLUGIN_STATUS, killSwitchOn, pluginAnswer, resolvePluginKey } from '../../shared/pluginGate.ts';
import { trustedClientAddress } from '../../shared/clientAddress.ts';

// The plug-in's one call, and the only thing a buyer's product ever sends here:
// the SHA-256 of its key. Nothing else travels — no prompt, no message, no
// model data, no personal data — and nothing but a status and the day a key
// runs out comes back.
//
//   Active    the key works, the guardrails run
//   Expired   the term has run out, nothing unlocks
//   Revoked   the key was stopped, nothing unlocks
//   Invalid   no such key, nothing unlocks
//   Stopped   the team's kill switch is on, nothing runs
//
// No account is needed: the key is the only credential, and it is never logged,
// here or anywhere.
export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const keyHash = String(body.key_hash || body.keyHash || '');
    // A key handed over directly, for a test by hand. Hashed on arrival and
    // never written to a log or a record of its own.
    const rawKey = String(body.key || '').slice(0, 80);

    if (!keyHash.trim() && !rawKey.trim()) {
      console.warn('[validateLicense] no key_hash was sent');
      return Response.json({ ...pluginAnswer({ status: PLUGIN_STATUS.invalid }), error: 'key_hash is required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // The team's stop switch is read before anything is matched: while it is on,
    // every answer is Stopped and no plug-in runs.
    const stop = await killSwitchOn(base44);
    if (stop.on) {
      console.warn(`[validateLicense] the kill switch is on: ${stop.reason || 'no reason recorded'}`);
      return Response.json(pluginAnswer({ status: PLUGIN_STATUS.stopped, killSwitch: true }));
    }

    const address = trustedClientAddress(req);
    if (!(await admitValidation(base44, address, PLUGIN_CHECK_CAP, 'license_check'))) {
      console.warn('[validateLicense] one connection reached its daily ceiling of checks');
      return Response.json({ ...pluginAnswer({ status: PLUGIN_STATUS.invalid }), retry_after: 'tomorrow' }, { status: 429 });
    }

    const resolved = await resolvePluginKey(base44, { keyHash, rawKey });
    // Logged by outcome and order only: a key, or its hash, never reaches a log.
    if (resolved.status === PLUGIN_STATUS.active) {
      console.log(`[validateLicense] Active for order ${resolved.license?.order_number || 'unknown'}`);
    } else {
      console.warn(`[validateLicense] ${resolved.status}: a check did not pass`);
    }

    return Response.json(pluginAnswer(resolved));
  } catch (error) {
    console.error('[validateLicense] Error:', error.message);
    return Response.json({ ...pluginAnswer({ status: PLUGIN_STATUS.invalid }), error: 'check_failed' }, { status: 500 });
  }
}
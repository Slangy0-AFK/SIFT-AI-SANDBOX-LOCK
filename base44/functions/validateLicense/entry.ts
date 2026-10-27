import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { admitValidation } from '../../shared/license.ts';
import {
  PLUGIN_CHECK_CAP,
  PLUGIN_STATUS,
  checkPlugin,
  killSwitchOn,
  pluginAnswer,
  policyAnswer
} from '../../shared/pluginGate.ts';
import { trustedClientAddress } from '../../shared/clientAddress.ts';

// One key, one model. This is the call a buyer's own product makes, and it asks
// for two things at most:
//
//   check    the SHA-256 of the key and the model binding it claims. The first
//            binding to arrive locks the key to that one model; any other is
//            refused with "This key is already locked to another model." and the
//            key is flagged for the team.
//   policy   the same key and binding, once locked, for the guardrail rules.
//            A key that is not valid and locked gets nothing here, which is what
//            makes a copy of the plug-in file useless on its own.
//
// Nothing else travels: no message, no prompt, no model data and no personal
// data. The key itself is never logged.
export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'check').toLowerCase();
    const keyHash = String(body.key_hash || body.keyHash || '');
    // A key handed over directly, for a test by hand. Hashed on arrival and never
    // written to a log or a record of its own.
    const rawKey = String(body.key || '').slice(0, 80);
    const model = String(body.model || body.model_name || '').slice(0, 120);
    const deploymentId = String(body.deployment_id || body.deployment || '').slice(0, 160);

    if (!keyHash.trim() && !rawKey.trim()) {
      console.warn('[validateLicense] no key_hash was sent');
      return Response.json({ ...pluginAnswer({ status: PLUGIN_STATUS.invalid, message: 'key_hash is required' }) }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // The team's stop switch is read before anything is matched: while it is on,
    // every answer is Stopped and no plug-in runs.
    const stop = await killSwitchOn(base44);
    if (stop.on) {
      console.warn(`[validateLicense] the kill switch is on: ${stop.reason || 'no reason recorded'}`);
      return Response.json(pluginAnswer({ status: PLUGIN_STATUS.stopped, killSwitch: true }));
    }

    if (!(await admitValidation(base44, trustedClientAddress(req), PLUGIN_CHECK_CAP, 'license_check'))) {
      console.warn('[validateLicense] one connection reached its daily ceiling of checks');
      return Response.json({ ...pluginAnswer({ status: PLUGIN_STATUS.invalid, message: 'Too many checks from this connection today.' }) }, { status: 429 });
    }

    const result = await checkPlugin(base44, { keyHash, rawKey, model, deploymentId });
    const order = result.license?.order_number || 'unknown';

    if (action === 'policy') {
      if (!result.active) {
        // Logged by outcome and order only: a key, or its hash, never reaches a log.
        console.warn(`[validateLicense] ${result.status}: the rules were not handed out for order ${order}`);
        return Response.json(pluginAnswer(result));
      }
      console.log(`[validateLicense] rules handed to the model locked on order ${order}`);
      return Response.json(policyAnswer(result.license));
    }

    if (result.active) {
      console.log(
        `[validateLicense] Active for order ${order}${result.newlyLocked ? ` and now locked to ${result.license.model_name}` : ''}`
      );
    } else {
      console.warn(`[validateLicense] ${result.status} (${result.reason}): a check did not pass`);
    }

    return Response.json(pluginAnswer(result));
  } catch (error) {
    console.error('[validateLicense] Error:', error.message);
    return Response.json({ ...pluginAnswer({ status: PLUGIN_STATUS.invalid, message: 'The check could not be completed.' }) }, { status: 500 });
  }
}
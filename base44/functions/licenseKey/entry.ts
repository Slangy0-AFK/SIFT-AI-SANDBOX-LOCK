import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  admitValidation,
  adminLicenseList,
  licenseStatusLabel,
  LICENSE_ENDPOINT,
  LICENSE_INSTRUCTIONS,
  LICENSE_TERMS,
  LICENSE_UNLOCKS,
  ownerLicense,
  ownerLicenseRecord,
  regenerateLicense,
  revokeLicense,
  validateLicense,
  VALIDATION_MESSAGES
} from '../../shared/license.ts';
import { trustedClientAddress } from '../../shared/clientAddress.ts';

// The license service, in one place:
//
//   validate      public — the buyer's own model or test setup hands its key
//                 over here and gets active, or a plain refusal. No account,
//                 nothing about anyone else, and the key is never logged.
//   mine          the buyer's own license: status, masked key, the key itself
//                 for their copy button, order number, terms and instructions.
//   revoke        the buyer stopping their own key.
//   regenerate    a replacement key for the buyer, which retires the old one.
//   admin_*       the team: statuses and order numbers, revoke and reissue on
//                 someone's behalf. The team never sees a key in full.
//
// A key is issued by the purchase path and the founding path, not here, so
// nothing on a page can mint one.

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'mine');

    const base44 = createClientFromRequest(req);
    const user = await base44.auth
      .me()
      .catch((e) => (e.status === 401 ? null : Promise.reject(e)));

    if (action === 'validate') {
      const rawKey = String(body.key || '').slice(0, 80);
      if (!rawKey.trim()) {
        return Response.json(
          { valid: false, reason: 'invalid', message: VALIDATION_MESSAGES.invalid },
          { status: 400 }
        );
      }

      if (!(await admitValidation(base44, trustedClientAddress(req)))) {
        console.warn('[licenseKey] activation attempts from one connection reached the daily cap');
        return Response.json(
          { valid: false, reason: 'too_many', message: VALIDATION_MESSAGES.too_many },
          { status: 429 }
        );
      }

      // Activation is the lock: the key is handed over with the one model it is
      // for and the deployment it runs on, and that binding is what sticks.
      const binding = {
        model: String(body.model || body.model_name || '').slice(0, 120),
        deploymentId: String(body.deployment_id || body.deployment || '').slice(0, 160)
      };
      const result = await validateLicense(base44, rawKey, binding);
      // Logged by outcome and order only: a key never reaches a log.
      if (result.ok) {
        console.log(
          `[licenseKey] activation accepted for order ${result.order_number} (${result.status}${result.locked ? ', now locked to one model' : ''})`
        );
        return Response.json({
          valid: true,
          status: result.status,
          locked_to: result.model_name || '',
          message: result.locked ? `Active. This key is locked to ${result.model_name}.` : 'Active.'
        });
      }

      console.warn(`[licenseKey] activation refused: ${result.reason}`);
      return Response.json({
        valid: false,
        reason: result.reason,
        message: result.message || VALIDATION_MESSAGES[result.reason] || VALIDATION_MESSAGES.invalid
      });
    }

    if (action === 'terms') {
      // Public: the same terms a buyer is shown before they buy, and nothing
      // personal in them.
      return Response.json({
        unlocks: LICENSE_UNLOCKS,
        terms: LICENSE_TERMS,
        instructions: LICENSE_INSTRUCTIONS,
        endpoint: LICENSE_ENDPOINT
      });
    }

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const isAdmin = user.role === 'admin';

    if (action === 'mine') {
      return Response.json(await ownerLicense(base44, user.id));
    }

    if (action === 'revoke') {
      const license = await ownerLicenseRecord(base44, user.id);
      if (!license) return Response.json({ error: 'There is no key on this account.' }, { status: 404 });
      if (license.status === 'revoked') {
        return Response.json({ ok: true, status_label: 'Revoked' });
      }

      const updated = await revokeLicense(base44, license, 'revoked by the key holder');
      console.log(`[licenseKey] ${license.order_number} revoked by its holder`);
      return Response.json({ ok: true, status_label: licenseStatusLabel(updated) });
    }

    if (action === 'regenerate') {
      const license = await ownerLicenseRecord(base44, user.id);
      if (!license) return Response.json({ error: 'There is no key on this account.' }, { status: 404 });

      const replaced = await regenerateLicense(base44, license, { reason: 'replaced by the key holder', notify: true });
      console.log(`[licenseKey] ${license.order_number} was replaced, so the key before it no longer works`);
      return Response.json({ ok: true, masked_key: replaced.license.key_hint, mailed: replaced.mailed.sent === true });
    }

    if (action === 'admin_list') {
      if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      return Response.json({ licenses: await adminLicenseList(base44, 100) });
    }

    if (action === 'admin_revoke' || action === 'admin_reissue') {
      if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

      // The team acts by the license id alone, and the record decides
      // everything else.
      const license = await base44.asServiceRole.entities.License
        .get(String(body.id || '').slice(0, 60))
        .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!license) return Response.json({ error: 'Not found' }, { status: 404 });

      if (action === 'admin_revoke') {
        const updated = await revokeLicense(base44, license, 'revoked by the SIFT AI team');
        console.log(`[licenseKey] ${license.order_number} revoked by the team`);
        return Response.json({ ok: true, status_label: licenseStatusLabel(updated) });
      }

      const replaced = await regenerateLicense(base44, license, { reason: 'reissued by the SIFT AI team', notify: true });
      console.log(`[licenseKey] ${license.order_number} reissued by the team`);
      return Response.json({ ok: true, masked_key: replaced.license.key_hint, mailed: replaced.mailed.sent === true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[licenseKey] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
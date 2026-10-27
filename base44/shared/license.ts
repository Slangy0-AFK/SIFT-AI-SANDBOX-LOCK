// The license key: what a buyer gets to test the governor and the hardening
// filter in their own model and environment, outside this app.
//
// Every decision about a key lives here, so the purchase path, the founding
// path, the buyer's own page and the team's console all obey the same rules:
//
//   * a key is never stored in the clear. A HMAC is kept for matching and an
//     encrypted copy for the buyer's own account to read back; nothing else.
//   * one key per buyer. Issuing is idempotent on the purchase or the founding
//     place, so a redelivered payment event cannot mint a second key.
//   * a key activates once. The first setup to activate it is the one it binds
//     to, and a second activation is refused, which is what makes a shared or
//     resold key worthless to anyone but the buyer.
//   * revoking and regenerating replace the fingerprint, so the replaced key
//     stops working the moment a replacement exists.

import { readSecret } from './runtimeSecrets.ts';

const rows = (page: any) => (Array.isArray(page) ? page : page?.items || []);
const first = (page: any) => rows(page)[0] || null;

export const LICENSE_PREFIX = 'SIFT-LIC';

// No 0, 1, I or O: a key gets read aloud and typed by hand.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const KEY_LENGTH = 16;

// Where a buyer's own setup hands its key over. Outside the app, so it is the
// published function address rather than a page route.
export const LICENSE_ENDPOINT = 'https://siftai.base44.app/functions/licenseKey';

export const LICENSE_UNLOCKS =
  'The SIFT AI governor and hardening filter, for testing in your own model and environment only: it stops bad instructions from reaching your model, and bad outputs from leaving it. It does not change, patch or rewrite your model.';

// Shown on the license page, in the confirmation email and in the downloaded
// file. One copy, so all three always agree.
export const LICENSE_TERMS = [
  'One key, one model, one use. The key is issued for the one model named on the order, and it locks to that model.',
  'It is a use licence, not ownership of anything: it does not give you the SIFT AI code, the model, the pattern library, anything the app runs internally, or anyone else\'s data.',
  'Non-exclusive and non-transferable. Do not share it, publish it, resell it or pass it on, and do not copy the key or the integration code to a second model.',
  'Do not publish the code or the key. A key that turns up anywhere but your own locked setup is revoked, and it stops working for you too.',
  'The first model to activate the key is the only one it works with. A second, different model is refused: "This key is already locked to another model."',
  'To move it to another model, the old binding is revoked first, then a new key is issued and locks to the new model. No two live copies, ever.',
  'We never ask for a password, an API key for another service, an IMEI, a serial number or payment details to use a key.'
];

export const LICENSE_INSTRUCTIONS = [
  'Your key is issued to your account, and your own copy of it is on your license page.',
  'In your own product, set SIFT_LICENSE_KEY to the key, SIFT_MODEL_NAME to the one model it is for, and SIFT_DEPLOYMENT_ID to the deployment or domain it runs on.',
  'Call the SIFT AI plug-in before your model sees a message, and around every tool your model asks for. It hands SIFT AI the key hash and the binding, and gets back one word: active, expired, revoked or invalid.',
  'The first binding to arrive is the one that sticks. Any other binding for the same key is refused, and the key is flagged for the SIFT AI team.',
  'An active answer turns the guardrails on, and anything else leaves them off. Your own product carries on running either way.',
  'Keep the key out of shared logs, screenshots and public repositories. Need it on a different model? Revoke it, then issue a new key.'
];

// The plain answer a refused activation gets. Nothing about the pattern that
// caught it, and nothing about anyone else.
// The plain answers a refused binding gets. Nothing about the pattern that
// caught it, nothing about anyone else, and never a key.
export const BINDING_MESSAGES: any = {
  no_binding: 'A model name and a deployment ID are needed to lock this key to one model.',
  locked_elsewhere: 'This key is already locked to another model.',
  wrong_model: 'This key was issued for a different model.'
};

export const VALIDATION_MESSAGES = {
  invalid: 'That key is not one SIFT AI recognises. Check for a typo, or copy it again from your license page.',
  ...BINDING_MESSAGES,
  revoked: 'That key has been revoked and no longer works. Open your license page to check it or issue yourself a new one.',
  expired: 'That key has expired. Open your license page for the current one.',
  too_many: 'Too many activation attempts from this connection today. Please try again tomorrow.'
};

const secret = () => readSecret('INTERNAL_SECRET');

function randomChars(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function newLicenseKey() {
  const chars = randomChars(KEY_LENGTH);
  return `${LICENSE_PREFIX}-${(chars.match(/.{4}/g) || []).join('-')}`;
}

// Whatever the buyer typed or pasted, in the one canonical shape we match on.
export function normalizeLicenseKey(raw: any) {
  const clean = String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (!clean.startsWith('SIFTLIC')) return '';
  const body = clean.slice(7);
  if (body.length !== KEY_LENGTH) return '';
  return `${LICENSE_PREFIX}-${(body.match(/.{4}/g) || []).join('-')}`;
}

// What goes in a list, and what the buyer sees until they reveal it.
export function maskLicenseKey(key: any) {
  const groups = String(key || '').split('-');
  const head = groups.length >= 3 ? groups[2] : '';
  return `${LICENSE_PREFIX}-${head}-••••-••••-••••`;
}

async function fingerprint(key: string) {
  const value = secret();
  if (!value) return '';
  const keyRef = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(value),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', keyRef, new TextEncoder().encode(key));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function cipherKey() {
  const value = secret();
  if (!value) return null;
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function sealKey(key: string) {
  const cipher = await cipherKey();
  if (!cipher) return '';
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cipher, new TextEncoder().encode(key));
  const packed = new Uint8Array(iv.byteLength + sealed.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(sealed), iv.byteLength);
  return btoa(String.fromCharCode(...packed));
}

// The buyer's own key, read back for their account only.
export async function openLicenseKey(blob: any) {
  const cipher = await cipherKey();
  if (!cipher || !blob) return '';
  try {
    const packed = Uint8Array.from(atob(String(blob)), (c) => c.charCodeAt(0));
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: packed.slice(0, 12) },
      cipher,
      packed.slice(12)
    );
    return new TextDecoder().decode(plain);
  } catch (error) {
    console.error('[license] the stored key could not be read back:', error && error.message);
    return '';
  }
}

// The plug-in's own handle on a key: a plain SHA-256 of the key in its canonical
// shape, which the buyer's own product works out for itself and sends in place of
// the key, so a key never travels to a check. It cannot be turned back into a key.
export function canonicalLicenseKey(raw: any) {
  return normalizeLicenseKey(raw) || String(raw || '').trim().toUpperCase();
}

export async function keySha256(raw: any) {
  const value = canonicalLicenseKey(raw);
  if (!value) return '';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function licenseBySha256(base44: any, hash: any) {
  const value = String(hash || '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(value)) return null;
  return first(await base44.asServiceRole.entities.License.filter({ key_sha256: value }));
}

// The key itself, for a caller that still hands one over: matched against the
// fingerprint stored when it was issued. The hash the plug-in sends is filled in
// here once, so the next check of that key needs nothing but the hash.
export async function licenseByRawKey(base44: any, rawKey: any) {
  const key = normalizeLicenseKey(rawKey);
  if (!key) return null;
  const hash = await fingerprint(key);
  if (!hash) return null;
  const license = first(await base44.asServiceRole.entities.License.filter({ key_hash: hash }));
  if (!license) return null;
  if (!license.key_sha256) {
    await base44.asServiceRole.entities.License
      .update(license.id, { key_sha256: await keySha256(key) })
      .catch((error) => console.warn('[license] the plug-in hash could not be stored:', error && error.message));
  }
  return license;
}

// Keys issued before the plug-in existed carry no hash of their own. Their
// encrypted copy is opened once, here, so an older key works with the plug-in
// without its owner doing anything.
export async function backfillKeySha256(base44: any, limit = 20) {
  const all = rows(await base44.asServiceRole.entities.License.filter({}, { limit }));
  const pending = all.filter((license: any) => !license.key_sha256);
  let filled = 0;
  for (const license of pending) {
    const key = await openLicenseKey(license.key_encrypted);
    if (!key) continue;
    try {
      await base44.asServiceRole.entities.License.update(license.id, { key_sha256: await keySha256(key) });
      filled += 1;
    } catch (error) {
      console.warn('[license] the plug-in hash could not be stored:', error && error.message);
    }
  }
  return filled;
}

// A key bought for a set term ends by date as well as by status: a year paid
// upfront answers active for that year and expired afterwards, whether or not the
// stored status has been tidied up yet.
export function effectiveStatus(license: any) {
  if (!license) return 'none';
  if (license.status === 'revoked') return 'revoked';
  if (license.status === 'expired') return 'expired';
  const ends = license.expires_at ? new Date(license.expires_at).getTime() : 0;
  if (ends && Date.now() > ends) return 'expired';
  return license.status === 'active' ? 'active' : String(license.status || 'none');
}

export function licenseStatusLabel(license: any) {
  if (!license) return 'None';
  const status = effectiveStatus(license);
  if (status === 'revoked') return 'Revoked';
  if (status === 'expired') return 'Expired';
  return license.source === 'founding' ? 'Founding (free)' : 'Active';
}

const chicagoDate = (value: any) => {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'America/Chicago' }).format(new Date(value));
  } catch (error) {
    return '';
  }
};

const money = (cents: any, currency: any) =>
  `${(Number(cents || 0) / 100).toFixed(2)} ${String(currency || 'usd').toUpperCase()}`;

// The buyer's own copy, sent once, at the moment the key is issued. The key
// itself goes only to the address the purchase was made under.
async function mailLicense(base44: any, license: any, key: string, { reissued = false } = {}) {
  const to = String(license.email || '').trim();
  if (!to) {
    console.warn('[license] no buyer address on the license, so no copy was emailed');
    return { sent: false, reason: 'no_address' };
  }

  try {
    const sent = await base44.asServiceRole.integrations.Core.SendEmail({
      to,
      from_name: 'SIFT AI',
      template_name: 'LicenseConfirmation',
      category: 'transactional',
      variables: {
        headline: reissued ? 'Here is your new license key.' : 'Your license key is ready.',
        note: reissued
          ? 'You asked for a replacement key. The key that came before it stopped working the moment this one was issued.'
          : license.expires_at
          ? `Thank you. Your order is confirmed and your license key is below. It works until ${chicagoDate(license.expires_at)}.`
          : 'Thank you. Your order is confirmed and your license key is below. Keep this email, or download the key from your account whenever you need it.',
        order_number: license.order_number,
        plan_label: license.plan_label || 'SIFT AI',
        amount_line: license.source === 'founding' ? 'No charge — founding place' : money(license.amount_cents, license.currency),
        issued_line: chicagoDate(license.issued_at || license.created_date),
        license_key: key,
        unlocks: LICENSE_UNLOCKS,
        apply_note: LICENSE_INSTRUCTIONS[1],
        keep_note: LICENSE_INSTRUCTIONS[5],
        license_url: 'https://sift-ai.net/license',
        app_name: 'SIFT AI'
      }
    });

    // A blocked address is answered, not thrown: the key is issued either way
    // and the buyer can still read it in their account.
    if (sent && sent.success === false) {
      console.warn(`[license] the copy for ${license.order_number} was refused: ${sent.reason}`);
      return { sent: false, reason: sent.reason || 'the address could not be reached' };
    }
    return { sent: true, to };
  } catch (error) {
    console.error('[license] the buyer copy could not be sent:', error && error.message);
    return { sent: false, reason: (error && error.message) || 'the send failed' };
  }
}

// Issue the buyer's key. Idempotent on the purchase (or on the account's one
// founding place), so a redelivered event returns the key that already exists
// instead of minting another.
export async function issueLicense(base44: any, input: any) {
  if (!secret()) {
    console.error('[license] INTERNAL_SECRET is not set, so no key was issued');
    return { created: false, reason: 'no_secret' };
  }

  const userId = String(input?.userId || '');
  const source = input?.source === 'founding' ? 'founding' : 'purchase';
  const purchaseId = String(input?.purchaseId || '');

  // Only the entitlements this app knows. A retired tier still has to be
  // confirmable (an old payment is real), and it must never stop the key.
  const known = ['pro', 'device_check', 'founding'];
  const asked = String(input?.entitlement || '');
  const entitlement = known.includes(asked) ? asked : source === 'founding' ? 'founding' : 'pro';

  const existing = purchaseId
    ? first(await base44.asServiceRole.entities.License.filter({ purchase_id: purchaseId }))
    : userId
    ? first(await base44.asServiceRole.entities.License.filter({ user_id: userId, source: 'founding' }))
    : null;

  if (existing) {
    return { created: false, alreadyIssued: true, license: existing, key: await openLicenseKey(existing.key_encrypted) };
  }

  // A plan bought for a set term carries the day it ends. A monthly plan runs
  // while the plan runs, so its key has no end date of its own.
  const months = Number(input?.termMonths || 0);
  const ends = new Date();
  if (months > 0) ends.setMonth(ends.getMonth() + months);

  const key = newLicenseKey();
  const license = await base44.asServiceRole.entities.License.create({
    user_id: userId,
    email: String(input?.email || '').toLowerCase().slice(0, 200),
    source,
    entitlement,
    plan_label: String(input?.planLabel || '').slice(0, 120),
    // The one model this key is for, named by the buyer on the order. Empty on a
    // founding key, which is named by the first model that activates it.
    model_name: String(input?.modelName || '').trim().slice(0, 120),
    order_number: `SIFT-${randomChars(6)}`,
    purchase_id: purchaseId,
    key_hash: await fingerprint(key),
    key_encrypted: await sealKey(key),
    key_hint: maskLicenseKey(key),
    status: 'active',
    activations: 0,
    issued_at: new Date().toISOString(),
    expires_at: months > 0 ? ends.toISOString() : null,
    amount_cents: Number(input?.amountCents || 0),
    currency: String(input?.currency || 'usd').toLowerCase(),
    paid_at: input?.paidAt || null
  });

  const mailed = await mailLicense(base44, license, key);
  if (!mailed.sent) console.warn(`[license] ${license.order_number} was issued but the copy was not emailed`);
  return { created: true, license, key, mailed };
}

// The account's own license: an active one if there is one, otherwise the most
// recent, so a revoked or regenerated key still shows its true state.
export async function ownerLicenseRecord(base44: any, userId: any) {
  if (!userId) return null;
  const all = rows(await base44.asServiceRole.entities.License.filter({ user_id: userId }, { sort: '-created_date', limit: 20 }));
  return all.find((license: any) => effectiveStatus(license) === 'active') || all[0] || null;
}

// Everything the buyer's own page and Settings section show. The key is
// included only while it works, and only for this account.
export async function ownerLicense(base44: any, userId: any) {
  const shared = {
    unlocks: LICENSE_UNLOCKS,
    terms: LICENSE_TERMS,
    instructions: LICENSE_INSTRUCTIONS,
    endpoint: LICENSE_ENDPOINT
  };

  const license = await ownerLicenseRecord(base44, userId);
  if (!license) return { has_license: false, ...shared };

  return {
    has_license: true,
    ...shared,
    id: license.id,
    status: effectiveStatus(license),
    status_label: licenseStatusLabel(license),
    source: license.source,
    entitlement: license.entitlement,
    plan_label: license.plan_label || '',
    masked_key: license.key_hint,
    key: effectiveStatus(license) === 'active' ? await openLicenseKey(license.key_encrypted) : '',
    // The one model this key is locked to, and nothing about anyone else.
    model_name: license.model_name || '',
    deployment_id: license.deployment_id || '',
    binding_locked_at: license.binding_locked_at || null,
    binding_conflicts: Number(license.binding_conflicts || 0),
    last_conflict_binding: license.last_conflict_binding || '',
    flagged_at: license.flagged_at || null,
    order_number: license.order_number || '',
    amount_cents: Number(license.amount_cents || 0),
    currency: String(license.currency || 'usd').toLowerCase(),
    issued_at: license.issued_at || license.created_date || null,
    paid_at: license.paid_at || null,
    activated_at: license.activated_at || null,
    expires_at: license.expires_at || null,
    regenerated_at: license.regenerated_at || null,
    revoked_at: license.revoked_at || null,
    activations: Number(license.activations || 0)
  };
}

const sameText = (a: any, b: any) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

// One key, one model, one use.
//
// The first binding to arrive is the one that sticks. Every check after that
// only reads; this is the single write a check can make. A second, different
// binding is refused with a plain answer and the key is flagged for the team,
// who can revoke it from the console. A customer cannot move a key themselves:
// moving means revoking it and issuing a new one, so there are never two live
// copies of one key.
export async function lockBinding(base44: any, license: any, { model = '', deploymentId = '' }: any = {}) {
  const wanted = {
    model: String(model || '').trim().slice(0, 120),
    deployment: String(deploymentId || '').trim().slice(0, 160)
  };

  // A check that carries no binding cannot lock anything, and must not be taken
  // as one that is free to run anywhere.
  if (!wanted.model || !wanted.deployment) {
    return { ok: false, reason: 'no_binding', message: BINDING_MESSAGES.no_binding };
  }

  const matches = (record: any) =>
    sameText(record?.model_name, wanted.model) && sameText(record?.deployment_id, wanted.deployment);

  if (license.binding_locked_at || license.deployment_id) {
    if (matches(license)) return { ok: true, license, newlyLocked: false };
    // A key named for one model at purchase cannot be pointed at another.
    const reason = license.binding_locked_at ? 'locked_elsewhere' : 'wrong_model';
    const flagged = await recordBindingConflict(base44, license, wanted);
    return { ok: false, reason, message: BINDING_MESSAGES[reason], license: flagged, conflict: true };
  }

  // Re-read right before writing, so two bindings arriving at the same instant
  // cannot both believe they are the first.
  const fresh = await base44.asServiceRole.entities.License
    .get(license.id)
    .catch((error: any) => (error.status === 404 ? license : Promise.reject(error)));

  if (fresh.binding_locked_at || fresh.deployment_id) {
    if (matches(fresh)) return { ok: true, license: fresh, newlyLocked: false };
    const flagged = await recordBindingConflict(base44, fresh, wanted);
    return { ok: false, reason: 'locked_elsewhere', message: BINDING_MESSAGES.locked_elsewhere, license: flagged, conflict: true };
  }

  const stamp = new Date().toISOString();
  const updated = await base44.asServiceRole.entities.License.update(license.id, {
    model_name: wanted.model,
    deployment_id: wanted.deployment,
    binding_locked_at: stamp,
    activations: 1,
    activated_at: stamp
  });

  // Whichever binding is stored is the one that stands. It is read back rather
  // than trusted from this write: if another arrival won the same moment, or
  // wrote just after this one, this binding is refused like any other.
  const stored = await base44.asServiceRole.entities.License
    .get(license.id)
    .catch((error: any) => (error.status === 404 ? updated : Promise.reject(error)));

  if (!matches(stored)) {
    const flagged = await recordBindingConflict(base44, updated, wanted);
    return { ok: false, reason: 'locked_elsewhere', message: BINDING_MESSAGES.locked_elsewhere, license: flagged, conflict: true };
  }

  console.log(`[license] ${updated.order_number} is locked to one model and cannot be moved`);
  return { ok: true, license: updated, newlyLocked: true };
}

// A second binding for one key: refused, counted, and left on the team's console
// with the name of the model it came from. Never the key, and never anything
// about the person behind it.
async function recordBindingConflict(base44: any, license: any, wanted: any) {
  const seen = `${wanted.model} / ${wanted.deployment}`.slice(0, 200);
  console.warn(`[license] a second binding was refused for order ${license.order_number || 'unknown'}: ${seen}`);
  return base44.asServiceRole.entities.License
    .update(license.id, {
      binding_conflicts: Number(license.binding_conflicts || 0) + 1,
      last_conflict_at: new Date().toISOString(),
      last_conflict_binding: seen,
      flagged_at: new Date().toISOString()
    })
    .catch((error: any) => {
      console.error('[license] the refused binding could not be recorded:', error && error.message);
      return license;
    });
}

// Activate a key handed over by the buyer's own setup. Activation is the lock:
// the first binding to arrive is the one model the key works with.
export async function validateLicense(base44: any, rawKey: any, binding: any = {}) {
  const key = normalizeLicenseKey(rawKey);
  if (!key) return { ok: false, reason: 'invalid' };

  const hash = await fingerprint(key);
  if (!hash) return { ok: false, reason: 'invalid' };

  const license = first(await base44.asServiceRole.entities.License.filter({ key_hash: hash }));
  if (!license) return { ok: false, reason: 'invalid' };

  const status = effectiveStatus(license);
  if (status === 'revoked') return { ok: false, reason: 'revoked' };
  if (status === 'expired') {
    // A key whose term has run out is recorded once, so the record and the
    // answer agree from then on.
    if (license.status !== 'expired') {
      await base44.asServiceRole.entities.License
        .update(license.id, { status: 'expired' })
        .catch((error) => console.warn('[license] the end date could not be written back:', error && error.message));
    }
    return { ok: false, reason: 'expired' };
  }
  if (status !== 'active') return { ok: false, reason: 'invalid' };

  // The hash the plug-in sends is filled in here, once, so the same key works
  // there without its owner changing anything.
  if (!license.key_sha256) {
    await base44.asServiceRole.entities.License
      .update(license.id, { key_sha256: await keySha256(key) })
      .catch((error) => console.warn('[license] the plug-in hash could not be stored:', error && error.message));
  }

  const locked = await lockBinding(base44, license, binding);
  if (!locked.ok) return { ok: false, reason: locked.reason, message: locked.message };

  return {
    ok: true,
    status: locked.license.source === 'founding' ? 'founding' : 'active',
    order_number: locked.license.order_number,
    model_name: locked.license.model_name,
    locked: locked.newlyLocked === true
  };
}

export async function revokeLicense(base44: any, license: any, reason: any) {
  return base44.asServiceRole.entities.License.update(license.id, {
    status: 'revoked',
    revoked_at: new Date().toISOString(),
    revoked_reason: String(reason || 'revoked').slice(0, 200)
  });
}

// The key that goes with a plan. A plan that ends takes its key with it at that
// moment, whether the person cancelled it, Stripe ended it, or a renewal failed.
// Nothing is refunded or credited on the way out: the month already paid for was
// paid in full, so the key simply stops where the plan stops.
//
// Only the key bought with THAT plan is revoked, found through the purchase behind
// the subscription's own checkout session, so a Device Check bought alongside it
// keeps working. A founding key is tied to no plan and stands.
export async function revokePlanKey(base44: any, userId: any, subscription: any = null, reason: any = 'plan_cancelled') {
  if (!userId) return { revoked: 0 };

  const mine = rows(await base44.asServiceRole.entities.License.filter({ user_id: userId }, { limit: 20 })).filter(
    (license: any) => license.source !== 'founding' && effectiveStatus(license) === 'active'
  );
  if (!mine.length) return { revoked: 0 };

  const sessionId = String((subscription && subscription.checkout_session_id) || '');
  let doomed: any[] = [];
  if (sessionId) {
    const purchase = first(await base44.asServiceRole.entities.ScannerPurchase.filter({ stripe_session_id: sessionId }));
    if (purchase) doomed = mine.filter((license: any) => license.purchase_id === purchase.id);
  }
  // No purchase to tie it to (an older payment, or a plan that issued no key of its
  // own): the account's Pro key is the one this plan was keeping alive.
  if (!doomed.length) doomed = mine.filter((license: any) => license.entitlement === 'pro');

  for (const license of doomed) await revokeLicense(base44, license, reason);
  return { revoked: doomed.length };
}

// A replacement key. The fingerprint is replaced, so the key it replaces stops
// working at this moment, and activation starts again from nothing.
export async function regenerateLicense(base44: any, license: any, { reason = '', notify = false } = {}) {
  const key = newLicenseKey();
  const updated = await base44.asServiceRole.entities.License.update(license.id, {
    key_hash: await fingerprint(key),
    key_encrypted: await sealKey(key),
    key_hint: maskLicenseKey(key),
    status: 'active',
    activations: 0,
    activated_at: null,
    revoked_at: null,
    revoked_reason: String(reason || '').slice(0, 200),
    regenerated_at: new Date().toISOString(),
    // A replacement key starts unlocked: it locks to the first model that uses
    // it, and the model the old key was on is not carried across.
    model_name: '',
    deployment_id: '',
    binding_locked_at: null,
    binding_conflicts: 0,
    last_conflict_at: null,
    last_conflict_binding: '',
    flagged_at: null
  });

  // The buyer is told about their own new key; nobody else is.
  const mailed = notify ? await mailLicense(base44, updated, key, { reissued: true }) : { sent: false };
  return { license: updated, key, mailed };
}

// A guest who paid and later signs in with the same verified email: the key
// they already own is moved to that account. Never matched on anything a
// caller can claim for someone else.
export async function attachLicenseToAccount(base44: any, { purchaseId, userId, email }: any) {
  if (!purchaseId || !userId) return { attached: 0 };
  const mine = rows(await base44.asServiceRole.entities.License.filter({ purchase_id: purchaseId }));
  let attached = 0;
  for (const license of mine) {
    if (license.user_id) continue;
    if (email && String(license.email || '').toLowerCase() !== String(email).toLowerCase()) continue;
    await base44.asServiceRole.entities.License.update(license.id, { user_id: userId });
    attached += 1;
  }
  return { attached };
}

// The team's list: status and order numbers, the masked hint, never the key.
export async function adminLicenseList(base44: any, limit = 100) {
  const all = rows(await base44.asServiceRole.entities.License.filter({}, { sort: '-created_date', limit }));
  return all.map((license: any) => ({
    id: license.id,
    masked_key: license.key_hint,
    status: effectiveStatus(license),
    status_label: licenseStatusLabel(license),
    order_number: license.order_number || '',
    source: license.source,
    plan_label: license.plan_label || '',
    model_name: license.model_name || '',
    deployment_id: license.deployment_id || '',
    binding_locked_at: license.binding_locked_at || null,
    binding_conflicts: Number(license.binding_conflicts || 0),
    last_conflict_binding: license.last_conflict_binding || '',
    flagged_at: license.flagged_at || null,
    email: license.email || '',
    user_id: license.user_id || '',
    issued_at: license.issued_at || license.created_date || null,
    activations: Number(license.activations || 0)
  }));
}

// Activation is the one endpoint a stranger can reach, so it is counted per
// connection. A setup that activates once is nowhere near this; a script
// guessing keys stops here.
export async function admitValidation(base44: any, clientKey: any, cap = 60, kind = 'license_try') {
  const address = String(clientKey || '').trim();
  if (!address || address === 'unknown') return true;

  const ownerKey = `ip:${address}`.slice(0, 60);
  const bucket = new Date().toISOString().slice(0, 10);

  const page = await base44.asServiceRole.entities.DailyCounter.filter(
    { kind, owner_key: ownerKey, bucket },
    { limit: cap }
  );
  const seen = rows(page).length;
  if (seen >= cap || page?.has_more === true) return false;

  await base44.asServiceRole.entities.DailyCounter.create({ kind, owner_key: ownerKey, bucket });
  return true;
}
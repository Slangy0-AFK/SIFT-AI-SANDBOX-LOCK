// SIFT AI's own Stripe Connect plumbing.
//
// The connected account's tokens are the only sensitive thing kept here. Base44
// Secrets cannot be written by code, so they are held in an admin-only entity
// instead, and their values are encrypted with a key derived from a server-side
// secret: a database read on its own is not enough to use them. No endpoint ever
// returns a token, in any field, to any caller.

import { appBaseUrl, readSecret, stripeSecretKey } from './stripeEnv.ts';

const KEY_LABEL = 'siftai:stripe-connect-token-store:v1';
const encoder = new TextEncoder();

export function connectClientId() {
  return readSecret('STRIPE_CONNECT_CLIENT_ID');
}

// The public URL Stripe sends the browser back to. Built from the platform's own
// app-url header with the app's published origin as the fallback, never from the
// request Host, Origin or URL.
export function connectRedirectUri(req) {
  return `${appBaseUrl(req)}/functions/stripeConnect`;
}

export function rowsOf(result) {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

export function firstRow(result) {
  return rowsOf(result)[0] || null;
}

function toHex(bytes) {
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex) {
  if (typeof hex !== 'string' || hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(String(text)));
  return toHex(digest);
}

export function randomState() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

async function tokenKey() {
  const secret = readSecret('INTERNAL_SECRET');
  if (!secret) return null;
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${secret}:${KEY_LABEL}`));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptToken(plain) {
  const key = await tokenKey();
  if (!key) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(String(plain)));
  return `v1.${toHex(iv)}.${toHex(cipher)}`;
}

export async function decryptToken(payload) {
  const parts = String(payload || '').split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return null;
  const key = await tokenKey();
  if (!key) return null;
  const iv = fromHex(parts[1]);
  const body = fromHex(parts[2]);
  if (!iv || !body) return null;
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, body);
    return new TextDecoder().decode(plain);
  } catch (_e) {
    return null;
  }
}

// Which Stripe account a payment call runs on: the connected account when the
// owner has connected one, otherwise the app's own account.
export async function stripeCredentials(base44) {
  const platformKey = stripeSecretKey();

  let account = null;
  try {
    account = firstRow(await base44.asServiceRole.entities.StripeConnectAccount.filter({ status: 'active' }));
  } catch (error) {
    // The lookup itself failed, so whether an account is connected cannot be
    // known. The platform key belongs to the app itself and is what payments used
    // before Connect existed, so checkout keeps working. Logged loudly because it
    // should not happen.
    console.error('[stripeConnect] connected-account lookup failed:', error && error.message);
    return { apiKey: platformKey, source: 'platform' };
  }

  if (!account) return { apiKey: platformKey, source: 'platform' };

  const token = await decryptToken(account.access_token_encrypted);
  if (!token) {
    // An account IS recorded but its token cannot be read. Charging on the app's
    // own account instead would send the buyer's money to the wrong Stripe
    // account, so nothing is charged and the owner is told to reconnect.
    console.error('[stripeConnect] stored connected-account token is unreadable; refusing to charge');
    throw new Error('connected_account_token_unreadable');
  }

  return { apiKey: token, source: 'connected', stripeUserId: String(account.stripe_user_id || '') };
}

export async function storeConnectedAccount(base44, { userId, stripeUserId, payload, accessToken }) {
  const encrypted = await encryptToken(accessToken);
  if (!encrypted) {
    console.error('[stripeConnect] INTERNAL_SECRET is missing, so the connected token cannot be stored');
    return { ok: false, reason: 'token_store_unavailable' };
  }

  const refresh = String(payload.refresh_token || '');
  const refreshEncrypted = refresh ? await encryptToken(refresh) : '';

  const existing = rowsOf(await base44.asServiceRole.entities.StripeConnectAccount.list());
  // One active connection at a time, so which account payments use is never
  // ambiguous. Any other account is stood down rather than left active.
  const standDown = existing.filter((row) => row.status === 'active' && row.stripe_user_id !== stripeUserId);
  if (standDown.length) {
    await base44.asServiceRole.entities.StripeConnectAccount.bulkUpdate(
      standDown.map((row) => ({ id: row.id, status: 'revoked', revoked_at: new Date().toISOString() }))
    );
  }

  const fields = {
    stripe_user_id: stripeUserId,
    scope: String(payload.scope || ''),
    token_type: String(payload.token_type || ''),
    livemode: payload.livemode === true,
    access_token_encrypted: encrypted,
    status: 'active',
    connected_by: userId,
    connected_at: new Date().toISOString(),
    ...(refreshEncrypted ? { refresh_token_encrypted: refreshEncrypted } : {})
  };

  const same = existing.find((row) => row.stripe_user_id === stripeUserId);
  if (same) await base44.asServiceRole.entities.StripeConnectAccount.update(same.id, fields);
  else await base44.asServiceRole.entities.StripeConnectAccount.create(fields);

  return { ok: true };
}
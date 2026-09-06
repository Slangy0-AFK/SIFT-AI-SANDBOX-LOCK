// Shared helpers for the public Developer API (widget + scan endpoints)

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
};

export function jsonCors(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomToken(bytes = 24) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return toHex(buf);
}

export async function sha256Hex(str) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return toHex(digest);
}

async function hmacHex(secret, data) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return toHex(sig);
}

export async function signPayload(secret, obj) {
  const data = JSON.stringify({ ...obj, iat: Date.now() });
  const sig = await hmacHex(secret, data);
  return btoa(JSON.stringify({ data, sig }));
}

export async function verifyPayload(secret, token) {
  try {
    const { data, sig } = JSON.parse(atob(token));
    const expected = await hmacHex(secret, data);
    if (expected !== sig) return null;
    return JSON.parse(data);
  } catch (_e) {
    return null;
  }
}

export async function findActiveKeyBySiteKey(base44, siteKey) {
  if (typeof siteKey !== 'string' || !siteKey) return null;
  const rows = await base44.asServiceRole.entities.ApiKey.filter({ site_key: siteKey, status: 'active' });
  return rows[0] || null;
}

export async function findActiveKeyBySecret(base44, secret) {
  if (typeof secret !== 'string' || !secret) return null;
  const hash = await sha256Hex(secret);
  const rows = await base44.asServiceRole.entities.ApiKey.filter({ secret_hash: hash, status: 'active' });
  return rows[0] || null;
}

export function originAllowed(key, origin) {
  const allowed = (key.allowed_domains || '').split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
  if (allowed.length === 0) return true;
  if (!origin) return false;
  let host = '';
  try { host = new URL(origin).hostname.toLowerCase(); } catch (_e) { return false; }
  return allowed.some((d) => host === d || host.endsWith('.' + d));
}

export async function touchKey(base44, key, field) {
  await base44.asServiceRole.entities.ApiKey.update(key.id, {
    [field]: (key[field] || 0) + 1,
    last_used: new Date().toISOString(),
  }).catch(() => {});
}
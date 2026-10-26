import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Throttled, fail-closed admin-key verification.
//
// The key lives only in the server secret store. It is never returned, logged or
// echoed, and the value sent by a caller is never stored. Because this endpoint
// answers "does this key match?", it is a brute-force target, so every wrong key
// is counted against the account that sent it: after MAX_FAILED_ATTEMPTS inside
// LOCKOUT_MINUTES the account is locked out for the rest of the window and the
// key is not compared at all. The comparison itself is constant-time, so a wrong
// key cannot be narrowed down by watching how long the answer takes.
//
// Fail closed at every step: if the attempt store cannot be read, nothing is
// compared and nothing is granted, and a refused attempt is never silently
// allowed through.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const since = (minutes) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

const enc = new TextEncoder();
async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(String(text)));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Both sides are hashed to a fixed length first, then every character is compared
// with no early exit: the time taken says nothing about how close a guess was.
async function sameSecret(a, b) {
  const [ha, hb] = await Promise.all([sha256Hex(a), sha256Hex(b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i += 1) diff |= ha.charCodeAt(i) ^ hb.charCodeAt(i);
  return diff === 0;
}

async function failedAttempts(base44, userId) {
  const found = await base44.asServiceRole.entities.SecurityEvent.filter({
    event_type: 'admin_key_failed',
    user_id: userId,
    created_date: { $gte: since(LOCKOUT_MINUTES) }
  });
  const rows = Array.isArray(found) ? found : (found && found.items) || [];
  return rows.length;
}

async function recordFailure(base44, userId) {
  await base44.asServiceRole.entities.SecurityEvent.create({
    user_id: userId,
    event_type: 'admin_key_failed',
    severity: 'warning',
    details: 'An admin key attempt was refused',
    environment: 'production'
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // A workflow or anything holding an internal secret must never claim admin:
    // this is a person, at the keyboard, with the key. The secret is read so that
    // path is explicitly refused instead of quietly falling through.
    const automationSecret = Deno.env.get('SCHEDULER_SECRET');
    const providedSecret = req.headers.get('x-scheduler-secret') || req.headers.get('x-automation-secret');
    if (automationSecret && providedSecret) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only the one configured account can ever claim admin. Everyone else is
    // refused here, before anything about the key is touched.
    const authorizedEmail = Deno.env.get('ADMIN_EMAIL');
    if (!authorizedEmail || String(user.email || '').toLowerCase() !== authorizedEmail.toLowerCase()) {
      return Response.json({ error: 'Access denied - not authorized for admin setup' }, { status: 403 });
    }

    // Already an admin: there is no key question to ask, and nothing to throttle.
    if (user.role === 'admin') {
      return Response.json({ success: true, message: 'You are already an admin', role: 'admin' });
    }

    // Fail closed: without a readable attempt store, no key is compared and no
    // attempt is served. This is the one path that must never guess.
    let attempts;
    try {
      attempts = await failedAttempts(base44, user.id);
    } catch (error) {
      console.error('[AdminSetup] Attempt store unreadable:', error && error.message);
      return Response.json(
        { error: 'Admin key verification is unavailable right now. Please try again shortly.' },
        { status: 503 }
      );
    }

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      return Response.json(
        { error: `Too many failed attempts. Admin key entry is locked for ${LOCKOUT_MINUTES} minutes.` },
        { status: 429, headers: { 'Retry-After': String(LOCKOUT_MINUTES * 60) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const adminKey = typeof body.adminKey === 'string' ? body.adminKey : '';
    const action = body.action === 'verify' ? 'verify' : 'claim';
    const expectedKey = Deno.env.get('ADMIN_PIN');

    if (!adminKey || !expectedKey) {
      return action === 'verify'
        ? Response.json({ valid: false, error: 'Admin key not configured' })
        : Response.json({ error: 'Invalid admin key' }, { status: 403 });
    }

    if (!(await sameSecret(adminKey, expectedKey))) {
      // Counted, so the next attempt is throttled. What was sent is not stored.
      try {
        await recordFailure(base44, user.id);
      } catch (error) {
        console.error('[AdminSetup] Could not record a refused attempt:', error && error.message);
      }
      return action === 'verify'
        ? Response.json({ valid: false })
        : Response.json({ error: 'Invalid admin key' }, { status: 403 });
    }

    if (action === 'verify') {
      return Response.json({ valid: true });
    }

    await base44.asServiceRole.entities.User.update(user.id, { role: 'admin' });

    await base44.asServiceRole.entities.SecurityEvent.create({
      user_id: user.id,
      event_type: 'access_granted',
      severity: 'warning',
      details: 'Admin role granted through the admin key',
      environment: 'production'
    });

    return Response.json({
      success: true,
      message: 'Admin access granted successfully',
      role: 'admin'
    });
  } catch (error) {
    console.error('[AdminSetup] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
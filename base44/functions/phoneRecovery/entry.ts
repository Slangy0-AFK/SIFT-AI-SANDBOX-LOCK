import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Phone Recovery — Send & Verify SMS OTP
 *
 * Actions:
 *   send_code   → generates a 6-digit OTP, stores only a keyed HMAC of it in PhoneRecoveryOtp,
 *                 and "sends" it via email (test mode)
 *   verify_code → checks the OTP against the stored HMAC (10-min expiry, max 5 failed attempts)
 *
 * In production: replace the email send with a real SMS provider (Twilio, etc.)
 * For Google Play testing: the code is emailed to the user.
 */

const MAX_ATTEMPTS = 5;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Generate a cryptographically random 6-digit OTP
function generateOTP() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, '0');
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Keyed digest of the code. A bare SHA-256 over a 6-digit value is reversible offline in seconds,
// so the digest is keyed with a server-side secret that never leaves the backend.
async function codeDigest(code, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(code));
  return toHex(signature);
}

// Constant-time comparison of two digests, so a failed check leaks no timing information
function digestsMatch(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Allow: scheduler secret header, entity automation, or authenticated user
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET');
    const providedSecret = req.headers.get('x-scheduler-secret') || req.headers.get('x-automation-secret');
    const isScheduler = schedulerSecret && providedSecret === schedulerSecret;

    let user = null;
    if (!isScheduler) {
      user = await base44.auth.me().catch(() => null);
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { action, phone, code } = await req.json();

    // Recovery codes are only ever stored keyed — without the secret we can neither issue nor check one
    const otpSecret = Deno.env.get('INTERNAL_SECRET');
    if (!otpSecret) {
      console.error('[PHONE RECOVERY] INTERNAL_SECRET is not set — refusing to issue or check codes');
      return Response.json({ error: 'Phone recovery is temporarily unavailable' }, { status: 500 });
    }

    // ── SEND CODE ─────────────────────────────────────────────────────────
    if (action === 'send_code') {
      if (!phone) {
        return Response.json({ error: 'Phone number is required' }, { status: 400 });
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

      // Store the code's keyed digest in its own store (never in general log records)
      await base44.asServiceRole.entities.PhoneRecoveryOtp.create({
        user_email: user.email,
        phone_last4: phone.slice(-4),
        code_hash: await codeDigest(otp, otpSecret),
        expires_at: expiresAt,
        attempts: 0,
        status: 'pending',
      });

      // For test mode: email the OTP to the user so testers can receive it
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: 'AEGIS — Your Phone Recovery Code',
        body: `Your AEGIS account recovery code is: ${otp}\n\nThis code expires in 10 minutes.\n\nPhone number used: ${phone}\n\nIf you did not request this, please ignore this message.`,
        from_name: 'AEGIS Quantum Shield',
      });

      console.log(`[PHONE RECOVERY] OTP sent for ${user.email} → phone ending ${phone.slice(-4)}`);

      return Response.json({
        success: true,
        message: 'Code sent. Check your email for the OTP (test mode).',
      });
    }

    // ── VERIFY CODE ───────────────────────────────────────────────────────
    if (action === 'verify_code') {
      const submitted = code === null || code === undefined ? '' : String(code);
      if (!/^\d{6}$/.test(submitted)) {
        return Response.json({ error: 'Invalid code format' }, { status: 400 });
      }

      // Most recent code for this user — a newer send supersedes older ones
      const records = await base44.asServiceRole.entities.PhoneRecoveryOtp.filter(
        { user_email: user.email },
        '-created_date',
        1
      );
      const record = records[0];

      if (!record || record.status === 'used' || new Date(record.expires_at) <= new Date()) {
        console.log(`[PHONE RECOVERY] No valid OTP to check for ${user.email}`);
        return Response.json({ success: false, error: 'Invalid or expired code' }, { status: 400 });
      }

      // Attempt limit: a locked code can never be tried again, even inside its window
      if (record.status === 'locked' || (record.attempts || 0) >= MAX_ATTEMPTS) {
        console.log(`[PHONE RECOVERY] Attempt limit reached for ${user.email}`);
        return Response.json(
          { success: false, error: 'Too many attempts. Request a new code.' },
          { status: 429 }
        );
      }

      if (!digestsMatch(await codeDigest(submitted, otpSecret), record.code_hash)) {
        const attempts = (record.attempts || 0) + 1;
        const locked = attempts >= MAX_ATTEMPTS;

        await base44.asServiceRole.entities.PhoneRecoveryOtp.update(record.id, {
          attempts,
          status: locked ? 'locked' : 'pending',
        });

        console.log(`[PHONE RECOVERY] Failed OTP attempt ${attempts}/${MAX_ATTEMPTS} for ${user.email}`);

        return Response.json(
          {
            success: false,
            error: locked ? 'Too many attempts. Request a new code.' : 'Invalid or expired code',
          },
          { status: locked ? 429 : 400 }
        );
      }

      // Verified: burn the code so it cannot be replayed
      await base44.asServiceRole.entities.PhoneRecoveryOtp.update(record.id, {
        status: 'used',
        used_at: new Date().toISOString(),
      });

      console.log(`[PHONE RECOVERY] OTP verified for ${user.email}`);

      return Response.json({ success: true, message: 'Code verified' });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('[PHONE RECOVERY] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
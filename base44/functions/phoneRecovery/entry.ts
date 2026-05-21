import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Phone Recovery — Send & Verify SMS OTP
 * 
 * Actions:
 *   send_code   → generates a 6-digit OTP, stores it in SecurityEvent, "sends" via email (test mode)
 *   verify_code → checks the OTP against stored value (10-min expiry)
 * 
 * In production: replace the email send with a real SMS provider (Twilio, etc.)
 * For Google Play testing: code is returned in the response AND emailed to the user.
 */

// Generate a cryptographically random 6-digit OTP
function generateOTP() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, '0');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, phone, code } = await req.json();

    // ── SEND CODE ─────────────────────────────────────────────────────────
    if (action === 'send_code') {
      if (!phone) {
        return Response.json({ error: 'Phone number is required' }, { status: 400 });
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

      // Store OTP as a SecurityEvent (tagged with phone + user)
      await base44.asServiceRole.entities.SecurityEvent.create({
        event_type: 'access_granted',
        severity: 'info',
        details: JSON.stringify({
          type: 'phone_otp',
          user_email: user.email,
          phone_last4: phone.slice(-4),
          otp_hash: otp, // In production: hash this. For test, store plain.
          expires_at: expiresAt,
        }),
        environment: 'production',
        base_chain_step: 'base0',
        threat_id: `OTP-${user.email}-${Date.now()}`,
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
        // Return code in test mode so Google Play reviewers can verify the flow
        test_code: otp,
      });
    }

    // ── VERIFY CODE ───────────────────────────────────────────────────────
    if (action === 'verify_code') {
      if (!code || code.length !== 6) {
        return Response.json({ error: 'Invalid code format' }, { status: 400 });
      }

      // Find the most recent OTP event for this user
      const events = await base44.asServiceRole.entities.SecurityEvent.filter({
        event_type: 'access_granted',
      }, '-created_date', 20);

      const otpEvent = events.find(e => {
        try {
          const d = JSON.parse(e.details || '{}');
          return (
            d.type === 'phone_otp' &&
            d.user_email === user.email &&
            d.otp_hash === code &&
            new Date(d.expires_at) > new Date()
          );
        } catch {
          return false;
        }
      });

      if (!otpEvent) {
        console.log(`[PHONE RECOVERY] Invalid/expired OTP for ${user.email}`);
        return Response.json({ success: false, error: 'Invalid or expired code' }, { status: 400 });
      }

      // Mark OTP as used by updating the event
      await base44.asServiceRole.entities.SecurityEvent.update(otpEvent.id, {
        details: JSON.stringify({
          ...JSON.parse(otpEvent.details),
          used: true,
          used_at: new Date().toISOString(),
        }),
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
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Password Reset — Intentionally public (no authentication required)
 * The request_reset action must be public by design — users call it when they
 * can't log in. The reset_password action uses a time-limited signed token.
 * Security: uses rate limiting, does not confirm whether email exists.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, email, reset_token, new_password } = await req.json();

    if (action === 'request_reset') {
      if (!email) {
        return Response.json({ error: 'email is required' }, { status: 400 });
      }

      const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';

      // Persistent rate limiting via SecurityEvent records
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const recentAttempts = await base44.asServiceRole.entities.SecurityEvent.filter({
        event_type: 'paradox_challenge',
        details: { $regex: `pwd_reset_${clientIp}` },
      }).catch(() => []);
      const recentCount = recentAttempts.filter(e => e.created_date > fifteenMinutesAgo).length;
      if (recentCount >= 3) {
        console.warn(`[passwordReset] Rate limit exceeded for IP: ${clientIp}`);
        return Response.json({ error: 'Too many reset requests. Please try again later.' }, { status: 429 });
      }
      // Log this attempt
      await base44.asServiceRole.entities.SecurityEvent.create({
        event_type: 'paradox_challenge',
        severity: 'info',
        details: `pwd_reset_${clientIp}`,
        environment: 'production',
      }).catch(() => {});

      // Use Base44's built-in password reset - handles email automatically
      await base44.auth.resetPasswordRequest(email);

      // Log the security event (service role — unauthenticated flow by design)
      await base44.asServiceRole.entities.SecurityEvent.create({
        event_type: 'access_granted',
        severity: 'info',
        details: `Password reset requested for ${email}`,
        environment: 'production',
      }).catch(() => {});

      return Response.json({
        success: true,
        message: 'Password reset email sent (if email exists in system)',
      });
    }

    if (action === 'reset_password') {
      if (!reset_token || !new_password) {
        return Response.json({ error: 'reset_token and new_password are required' }, { status: 400 });
      }

      // Use Base44's built-in password reset with token
      await base44.auth.resetPassword({
        resetToken: reset_token,
        newPassword: new_password,
      });

      // Log the event (service role — unauthenticated flow by design)
      await base44.asServiceRole.entities.SecurityEvent.create({
        event_type: 'access_granted',
        severity: 'warning',
        details: `Password reset completed for ${email || 'unknown'}`,
        environment: 'production',
      }).catch(() => {});

      return Response.json({
        success: true,
        message: 'Password reset successfully',
      });
    }

    return Response.json({ error: 'Invalid action. Use: request_reset or reset_password' }, { status: 400 });
  } catch (error) {
    console.error('Password reset error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
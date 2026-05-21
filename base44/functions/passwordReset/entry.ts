import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// In-memory rate limiter: max 3 requests per 15 minutes per IP
const resetAttempts = new Map();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = resetAttempts.get(ip) || { count: 0, windowStart: now };
  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // Window expired, reset
    resetAttempts.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  entry.count += 1;
  resetAttempts.set(ip, entry);
  return true;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, email, reset_token, new_password } = await req.json();

    if (action === 'request_reset') {
      const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
      if (!checkRateLimit(clientIp)) {
        console.warn(`[passwordReset] Rate limit exceeded for IP: ${clientIp}`);
        return Response.json({ error: 'Too many reset requests. Please try again later.' }, { status: 429 });
      }
      if (!email) {
        return Response.json({ error: 'email is required' }, { status: 400 });
      }

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
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized: User session required' }, { status: 401 });
      }

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
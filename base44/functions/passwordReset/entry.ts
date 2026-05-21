import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Rate limiting should be implemented server-side with persistent storage
// Using in-memory is vulnerable. This uses the backend rateLimiter function instead.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, email, reset_token, new_password } = await req.json();

    if (action === 'request_reset') {
      if (!email) {
        return Response.json({ error: 'email is required' }, { status: 400 });
      }

      const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
      
      // Call rateLimiter backend function for persistent rate limiting
      try {
        const rateLimitResult = await base44.asServiceRole.functions.invoke('rateLimiter', {
          key: `password_reset_${clientIp}`,
          max_requests: 3,
          window_ms: 15 * 60 * 1000,
        });
        
        if (!rateLimitResult?.data?.allowed) {
          console.warn(`[passwordReset] Rate limit exceeded for IP: ${clientIp}`);
          return Response.json({ error: 'Too many reset requests. Please try again later.' }, { status: 429 });
        }
      } catch (err) {
        console.error('[passwordReset] Rate limiting check failed:', err);
        // Fail open on rate limiter error, but log it
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
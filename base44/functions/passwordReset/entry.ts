import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, email, reset_token, new_password } = await req.json();

    if (action === 'request_reset') {
      if (!email) {
        return Response.json({ error: 'email is required' }, { status: 400 });
      }

      // Use Base44's built-in password reset - handles email automatically
      await base44.auth.resetPasswordRequest(email);

      // Log the security event
      await base44.entities.SecurityEvent.create({
        event_type: 'access_granted',
        severity: 'info',
        details: `Password reset requested for ${email}`,
        environment: 'production',
      });

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

      // Find user to log the event
      const users = await base44.entities.User.filter({ email: email });
      if (users.length > 0) {
        await base44.entities.SecurityEvent.create({
          event_type: 'access_granted',
          severity: 'warning',
          details: `Password reset completed for ${email}`,
          environment: 'production',
        });
      }

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
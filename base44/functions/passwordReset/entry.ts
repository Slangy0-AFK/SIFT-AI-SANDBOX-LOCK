import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { action, email, reset_token, new_password } = await req.json();

    if (action === 'request_reset') {
      if (!email) {
        return Response.json({ error: 'email is required' }, { status: 400 });
      }

      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const resetToken = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const resetRecord = {
        email,
        reset_token: resetToken,
        expires_at: expiresAt.toISOString(),
        created_date: new Date().toISOString(),
      };

      await base44.entities.PasswordReset.create(resetRecord);

      const resetLink = `https://your-app-url.com/reset-password?token=${resetToken}`;
      
      const emailBody = `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your Aegis Quantum Shield account.</p>
        <p><a href="${resetLink}" style="background-color: #00bcd4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
        <p>Or copy this link: ${resetLink}</p>
        <p>This link expires in 24 hours.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr/>
        <p style="color: #666; font-size: 12px;">Aegis Quantum Shield Security</p>
      `;

      await base44.integrations.Core.SendEmail({
        to: email,
        subject: '🔐 Password Reset Request - Aegis Quantum Shield',
        body: emailBody,
        from_name: 'Aegis Quantum Shield',
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

      const resetRecords = await base44.entities.PasswordReset.filter({ reset_token });
      
      if (resetRecords.length === 0) {
        return Response.json({ error: 'Invalid or expired reset token' }, { status: 400 });
      }

      const resetRecord = resetRecords[0];
      const expiresAt = new Date(resetRecord.expires_at);

      if (new Date() > expiresAt) {
        await base44.entities.PasswordReset.delete(resetRecord.id);
        return Response.json({ error: 'Reset token has expired' }, { status: 400 });
      }

      const users = await base44.entities.User.filter({ email: resetRecord.email });
      
      if (users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      const user = users[0];
      
      await base44.auth.updateMe({ 
        password_hash: new_password,
        password_reset_date: new Date().toISOString(),
      });

      await base44.entities.PasswordReset.delete(resetRecord.id);

      await base44.integrations.Core.SendEmail({
        to: resetRecord.email,
        subject: '✓ Password Successfully Reset',
        body: `<h2>Password Reset Complete</h2><p>Your password has been successfully reset.</p><p>If you didn't make this change, please contact support immediately.</p>`,
        from_name: 'Aegis Quantum Shield',
      });

      await base44.entities.SecurityEvent.create({
        event_type: 'access_granted',
        severity: 'warning',
        details: `Password reset for ${resetRecord.email}`,
        environment: 'production',
      });

      return Response.json({
        success: true,
        message: 'Password reset successfully',
      });
    }

    return Response.json({ error: 'Invalid action. Use: request_reset or reset_password' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
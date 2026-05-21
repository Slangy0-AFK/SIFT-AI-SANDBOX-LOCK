import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, totp_secret, totp_code } = await req.json();

    if (action === 'setup') {
      const speakeasy = await import('npm:speakeasy@2.0.0');
      
      const userData = await base44.auth.me();
      if (userData.mfa_enabled) {
        return Response.json({ error: 'MFA already enabled for this user' }, { status: 400 });
      }
      
      const secret = speakeasy.generateSecret({
        name: `Aegis Shield (${user.email})`,
        issuer: 'Aegis Quantum Shield',
        length: 32,
      });

      // Store secret temporarily - MFA not enabled until verified
      const userUpdates = {
        mfa_setup_date: new Date().toISOString(),
        mfa_secret: secret.base32, // Store but not enabled yet
      };

      await base44.auth.updateMe(userUpdates);

      await base44.entities.SecurityEvent.create({
        event_type: 'access_granted',
        severity: 'info',
        details: `MFA setup initiated by ${user.email}`,
        environment: 'production',
      });

      return Response.json({
        success: true,
        secret: secret.base32,
        otpauth_url: secret.otpauth_url,
        message: 'Scan QR code and verify with a code to enable MFA',
      });
    }

    if (action === 'confirm') {
      // New: Confirm MFA setup with a valid TOTP code
      if (!totp_code) {
        return Response.json({ error: 'totp_code is required to confirm MFA' }, { status: 400 });
      }

      const speakeasy = await import('npm:speakeasy@2.0.0');
      const userData = await base44.auth.me();
      
      if (!userData.mfa_secret) {
        return Response.json({ error: 'MFA setup not initiated. Please call setup first.' }, { status: 400 });
      }

      if (userData.mfa_enabled) {
        return Response.json({ error: 'MFA already enabled' }, { status: 400 });
      }

      const verified = speakeasy.totp.verify({
        secret: userData.mfa_secret,
        encoding: 'base32',
        token: totp_code,
        window: 2,
      });

      if (!verified) {
        return Response.json({ success: false, message: 'Invalid TOTP code' }, { status: 400 });
      }

      // Now enable MFA
      await base44.auth.updateMe({
        mfa_enabled: true,
        mfa_verified_count: 1,
        mfa_last_verified: new Date().toISOString(),
      });

      await base44.entities.SecurityEvent.create({
        event_type: 'access_granted',
        severity: 'info',
        details: `MFA enabled and verified by ${user.email}`,
        environment: 'production',
      });

      return Response.json({ success: true, message: 'MFA enabled successfully' });
    }

    if (action === 'verify') {
      if (!totp_code) {
        return Response.json({ error: 'totp_code is required' }, { status: 400 });
      }

      const speakeasy = await import('npm:speakeasy@2.0.0');
      const userData = await base44.auth.me();

      if (!userData.mfa_secret || !userData.mfa_enabled) {
        return Response.json({ error: 'MFA not enabled for this user' }, { status: 400 });
      }

      const verified = speakeasy.totp.verify({
        secret: userData.mfa_secret,
        encoding: 'base32',
        token: totp_code,
        window: 2,
      });

      if (verified) {
        await base44.auth.updateMe({
          mfa_last_verified: new Date().toISOString(),
          mfa_verified_count: (userData.mfa_verified_count || 0) + 1,
        });

        return Response.json({ success: true, message: 'MFA code verified' });
      } else {
        return Response.json({ success: false, message: 'Invalid MFA code' });
      }
    }

    if (action === 'disable') {
      const speakeasy = await import('npm:speakeasy@2.0.0');
      
      if (!totp_code) {
        return Response.json({ error: 'Current TOTP code required to disable MFA' }, { status: 400 });
      }

      const userData = await base44.auth.me();
      const mfa_secret = userData.mfa_secret;

      const verified = speakeasy.totp.verify({
        secret: mfa_secret,
        encoding: 'base32',
        token: totp_code,
      });

      if (!verified) {
        return Response.json({ error: 'Invalid verification code' }, { status: 400 });
      }

      await base44.auth.updateMe({
        mfa_enabled: false,
        mfa_secret: null,
        mfa_disabled_date: new Date().toISOString(),
      });

      await base44.entities.SecurityEvent.create({
        event_type: 'access_granted',
        severity: 'warning',
        details: `MFA disabled by ${user.email}`,
        environment: 'production',
      });

      return Response.json({ success: true, message: 'MFA disabled successfully' });
    }

    return Response.json({ error: 'Invalid action. Use: setup, verify, or disable' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
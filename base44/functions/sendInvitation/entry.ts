import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Send Family Invitation Email
 * 
 * Sends an email invitation to join the subscriber's family plan
 * Includes secure acceptance link with token
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    // Allow: scheduler secret header or authenticated user
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET');
    const providedSecret = req.headers.get('x-scheduler-secret') || req.headers.get('x-automation-secret');
    const isScheduler = schedulerSecret && providedSecret === schedulerSecret;

    let user = null;
    if (!isScheduler) {
      user = await base44.auth.me().catch(() => null);
      if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }, { status: 401 });
      }
    }

    // Parse request
    const { invitee_email, invitee_phone, device_slots = 1, notes = '' } = await req.json();

    // Validate input
    if (!invitee_email || !invitee_email.includes('@')) {
      return Response.json({ error: 'Valid invitee email is required' }, { status: 400 });
    }

    if (device_slots < 1 || device_slots > 10) {
      return Response.json({ error: 'Device slots must be between 1 and 10' }, { status: 400 });
    }

    // Get subscriber's subscription - check both user_id and subscriber_id
    let subscriptions = await base44.entities.Subscription.filter({ user_id: user.id });
    if (!subscriptions || subscriptions.length === 0) {
      subscriptions = await base44.entities.Subscription.filter({ subscriber_id: user.id });
    }
    const subscription = subscriptions[0];

    if (!subscription || subscription.status !== 'active') {
      console.error(`[INVITE] No active subscription found for user ${user.id}`);
      return Response.json({ 
        error: 'You need an active subscription to send invitations' 
      }, { status: 403 });
    }
    
    console.log(`[INVITE] Found subscription: ${subscription.plan} (${subscription.status})`);

    // Check device limit - count devices allocated to this subscriber
    // Devices can be owned by user_id OR allocated via subscriber_id
    const allActiveDevices = await base44.entities.Device.filter({ status: 'active' });
    const subscriberDevices = allActiveDevices.filter(d => 
      d.user_id === user.id || d.subscriber_id === user.id
    );
    
    const existingInvites = await base44.entities.Invitation.filter({ 
      subscriber_id: user.id, 
      status: 'pending' 
    });
    
    const totalCommitted = subscriberDevices.length + existingInvites.reduce((sum, inv) => sum + (inv.device_slots || 1), 0);
    const maxDevices = subscription.plan === 'pro' ? 5 : 1;

    console.log(`[INVITE] Device check: ${subscriberDevices.length} devices, ${existingInvites.length} pending invites, total: ${totalCommitted}/${maxDevices}`);

    if (totalCommitted + device_slots > maxDevices) {
      return Response.json({ 
        error: `Cannot allocate ${device_slots} slots. You have ${maxDevices - totalCommitted} device slots remaining.` 
      }, { status: 400 });
    }

    // Generate secure token
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const invitation_token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    // Create invitation record
    const invitation = await base44.entities.Invitation.create({
      subscriber_id: user.id,
      subscriber_email: user.email,
      invitee_email,
      invitee_phone: invitee_phone || null,
      invitation_token,
      status: 'pending',
      device_slots,
      expires_at,
      notes: notes || null,
    });

    // Generate acceptance URL
    const acceptanceUrl = `${Deno.env.get('BASE44_APP_URL') || 'https://app.base44.com'}/accept-invite/${invitation_token}`;

    // Send email
    try {
      await base44.integrations.Core.SendEmail({
        to: invitee_email,
        subject: `You're invited to join ${user.email}'s AEGIS Security Plan`,
        body: `
<div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; margin-bottom: 20px;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🛡️ AEGIS Quantum Shield</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Family Security Enrollment</p>
  </div>

  <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; border: 1px solid #e9ecef;">
    <h2 style="margin: 0 0 15px 0; color: #2d3748; font-size: 20px;">You're Invited!</h2>
    
    <p style="color: #4a5568; line-height: 1.6; margin: 0 0 15px 0;">
      <strong style="color: #2d3748;">${user.email}</strong> has invited you to join their AEGIS Quantum Shield security plan.
    </p>

    <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
      <p style="margin: 5px 0; color: #4a5568; font-size: 14px;">
        <strong>Device Slots:</strong> ${device_slots}
      </p>
      <p style="margin: 5px 0; color: #4a5568; font-size: 14px;">
        <strong>Expires:</strong> ${new Date(expires_at).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </p>
      ${notes ? `<p style="margin: 15px 0 5px 0; color: #4a5568; font-size: 14px;"><strong>Message:</strong></p><p style="color: #718096; font-style: italic; margin: 0;">"${notes.replace(/</g, '&lt;').replace(/>/g, '&gt;')}"</p>` : ''}
    </div>

    <p style="color: #4a5568; line-height: 1.6; margin: 20px 0;">
      By accepting this invitation, you'll be able to enroll up to <strong>${device_slots} device(s)</strong> under their subscription plan and access premium security features including:
    </p>

    <ul style="color: #4a5568; line-height: 1.8; margin: 15px 0; padding-left: 20px;">
      <li>Real-time AI threat detection</li>
      <li>Email & SMS phishing protection</li>
      <li>Zero-day anomaly monitoring</li>
      <li>Quantum-resistant encryption</li>
      <li>Multi-device security management</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${acceptanceUrl}" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
    </div>

    <p style="color: #718096; font-size: 13px; line-height: 1.6; margin: 20px 0 0 0;">
      This invitation will expire in 7 days. If you have any questions, please contact ${user.email}.
    </p>

    <p style="color: #a0aec0; font-size: 12px; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e2e8f0;">
      This is an automated message from AEGIS Quantum Shield. Please do not reply to this email.
    </p>
  </div>
</div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the whole operation - invitation is still created
    }

    console.log(`[INVITE] Invitation sent: ${invitation.id} to ${invitee_email}`);

    return Response.json({
      success: true,
      invitation_id: invitation.id,
      invitation_token,
      expires_at,
      device_slots,
      message: 'Invitation sent successfully'
    });

  } catch (error) {
    console.error('[INVITE] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
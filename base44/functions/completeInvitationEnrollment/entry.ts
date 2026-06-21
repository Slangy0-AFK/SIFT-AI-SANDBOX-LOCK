import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Complete Invitation Enrollment
 * 
 * Final step: creates device record for the accepted invitation
 * Links device to subscriber's account
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user (the invitee)
    // Allow: scheduler secret header, entity automation, or authenticated user
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET');
    const providedSecret = req.headers.get('x-scheduler-secret') || req.headers.get('x-automation-secret');
    const isScheduler = schedulerSecret && providedSecret === schedulerSecret;
    const isAutomation = req.headers.get('x-automation-id') != null || req.headers.get('x-entity-automation') != null;

    let user = null;
    if (!isScheduler && !isAutomation) {
      user = await base44.auth.me().catch(() => null);
      if (!user) {
        return Response.json({ error: 'Unauthorized - You must be logged in' }, { status: 401 });
      }
    }

    // Parse request
    const { invitation_token, device_name, device_type = 'android' } = await req.json();

    if (!invitation_token) {
      return Response.json({ error: 'Invitation token is required' }, { status: 400 });
    }

    // Find invitation
    const invitations = await base44.asServiceRole.entities.Invitation.filter({ 
      invitation_token 
    });
    
    const invitation = invitations[0];

    if (!invitation) {
      return Response.json({ error: 'Invalid invitation token' }, { status: 404 });
    }

    // Validate invitation
    if (invitation.status !== 'accepted' && invitation.status !== 'pending') {
      return Response.json({ 
        error: `This invitation is ${invitation.status}` 
      }, { status: 400 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return Response.json({ error: 'This invitation has expired' }, { status: 400 });
    }

    // Verify email matches
    if (user.email !== invitation.invitee_email) {
      return Response.json({ 
        error: 'Your email does not match the invitation' 
      }, { status: 403 });
    }

    // Check if already accepted by another user
    if (invitation.accepted_by_user_id && invitation.accepted_by_user_id !== user.id) {
      return Response.json({ 
        error: 'This invitation has already been accepted by another user' 
      }, { status: 400 });
    }

    // Update invitation with user ID if not already set
    // Use service role to update invitation since user may not have permission under new RLS
    if (!invitation.accepted_by_user_id) {
      await base44.asServiceRole.entities.Invitation.update(invitation.id, {
        accepted_by_user_id: user.id,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      });
    }

    // Create device record - linked to invitee's account (not subscriber)
    // This allows the invitee to see/manage only their own device in the dashboard
    const device = await base44.asServiceRole.entities.Device.create({
      user_id: user.id, // Device assigned to invitee, not subscriber
      subscriber_id: invitation.subscriber_id,
      device_name: device_name || `${user.email}'s Device`,
      device_type,
      device_fingerprint: `inv-${invitation_token.slice(0, 8)}-${Date.now()}`,
      last_seen: new Date().toISOString(),
      status: 'active',
    });

    console.log(`[ENROLL] Device enrolled: ${device.id} for invitee ${user.email}`);

    return Response.json({
      success: true,
      device_id: device.id,
      device_name: device.device_name,
      device_slots_used: invitation.device_slots,
      subscriber_email: invitation.subscriber_email,
      message: 'Device enrolled successfully in family plan'
    });

  } catch (error) {
    console.error('[ENROLL] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
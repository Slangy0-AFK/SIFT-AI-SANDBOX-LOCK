import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Accept Family Invitation
 * 
 * Validates invitation token and enrolls invitee
 * Creates user account if needed, allocates device slots
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user = await base44.auth.me().catch(() => null);
    
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET');
    const providedSecret = req.headers.get('x-scheduler-secret') || req.headers.get('x-automation-secret');
    const isScheduler = schedulerSecret && providedSecret === schedulerSecret;
    if (isScheduler) { user = { id: 'scheduler' }; }

    if (!user) { return Response.json({ error: 'Unauthorized' }, { status: 401 }); }

    // Parse request. Only the token is read: who is accepting is decided by the
    // signed-in caller's own account below, never by anything sent in this body.
    const { invitation_token } = await req.json();

    if (!invitation_token) {
      return Response.json({ error: 'Invitation token is required' }, { status: 400 });
    }

    // Find invitation by token
    const invitations = await base44.asServiceRole.entities.Invitation.filter({ 
      invitation_token 
    });
    
    const invitation = invitations[0];

    if (!invitation) {
      return Response.json({ error: 'Invalid invitation token' }, { status: 404 });
    }

    // Check status
    if (invitation.status !== 'pending') {
      return Response.json({ 
        error: `This invitation has already been ${invitation.status}` 
      }, { status: 400 });
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      await base44.asServiceRole.entities.Invitation.update(invitation.id, { status: 'expired' });
      return Response.json({ error: 'This invitation has expired' }, { status: 400 });
    }

    // Only the invited address may accept, and only from its own signed-in
    // account. A client-supplied email is never used to pick the accepting
    // user, so a token holder cannot accept on someone else's behalf and the
    // endpoint cannot be used to probe which addresses have accounts.
    const callerEmail = String(user.email || '').trim().toLowerCase();
    const inviteeEmail = String(invitation.invitee_email || '').trim().toLowerCase();

    if (!inviteeEmail || callerEmail !== inviteeEmail) {
      console.warn(`[ACCEPT] Invitation ${invitation.id} attempted by a caller who is not the invitee`);
      return Response.json({
        error: 'This invitation was sent to a different email address. Sign in with the invited address to accept it.'
      }, { status: 403 });
    }

    // Accepted by the caller's own account id.
    await base44.asServiceRole.entities.Invitation.update(invitation.id, {
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_by_user_id: user.id,
    });

    console.log(`[ACCEPT] Invitation ${invitation.id} accepted by invitee ${user.id}`);

    return Response.json({
      success: true,
      invitation: {
        subscriber_email: invitation.subscriber_email,
        device_slots: invitation.device_slots,
        expires_at: invitation.expires_at,
      },
      user_exists: true,
      existing_user_email: user.email,
      next_step: 'enroll_device',
      message: 'Invitation accepted. Proceed to device enrollment.'
    });

  } catch (error) {
    console.error('[ACCEPT] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
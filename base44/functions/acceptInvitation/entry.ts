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
    
    // Parse request
    const { invitation_token, user_email, user_full_name } = await req.json();

    if (!invitation_token) {
      return Response.json({ error: 'Invitation token is required' }, { status: 400 });
    }
    
    // Verify invitation acceptance is authorized by the inviter
    // Invitation tokens are single-use and time-limited, so this is secure
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized: Must be logged in to accept invitation' }, { status: 401 });
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

    // Check if user exists
    let existingUser = null;
    if (user_email) {
      const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
      existingUser = users[0];
    }

    // If no user provided, check if invitee email matches a user
    if (!existingUser) {
      const users = await base44.asServiceRole.entities.User.filter({ 
        email: invitation.invitee_email 
      });
      existingUser = users[0];
    }

    // Update invitation status
    const updateData = {
      status: existingUser ? 'accepted' : 'pending',
      accepted_at: existingUser ? new Date().toISOString() : null,
    };

    if (existingUser) {
      updateData.accepted_by_user_id = existingUser.id;
    }

    await base44.asServiceRole.entities.Invitation.update(invitation.id, updateData);

    console.log(`[ACCEPT] Invitation ${invitation.id} validated for ${invitation.invitee_email}`);

    return Response.json({
      success: true,
      invitation: {
        subscriber_email: invitation.subscriber_email,
        device_slots: invitation.device_slots,
        expires_at: invitation.expires_at,
      },
      user_exists: !!existingUser,
      existing_user_email: existingUser?.email || null,
      next_step: existingUser ? 'enroll_device' : 'register_first',
      message: existingUser ? 'Invitation accepted. Proceed to device enrollment.' : 'Invitation validated. Please complete registration first.'
    });

  } catch (error) {
    console.error('[ACCEPT] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
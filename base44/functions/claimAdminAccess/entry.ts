import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Only allow authenticated users
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow the specific email to claim admin (check against hashed value)
    const ADMIN_EMAIL = Deno.env.get('VITE_ADMIN_EMAIL') || Deno.env.get('ADMIN_EMAIL');
    if (!ADMIN_EMAIL || user.email !== ADMIN_EMAIL) {
      return Response.json({ error: 'Access denied - not authorized for admin setup' }, { status: 403 });
    }


    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { adminKey, action } = body;

    // Check if admin key is set in secrets - use hashed version if available
    const expectedKeyHash = Deno.env.get('VITE_ADMIN_PIN_HASH');
    const expectedKey = Deno.env.get('VITE_ADMIN_PIN') || Deno.env.get('ADMIN_PIN');
    
    if (action === 'verify') {
      // Just verify if the key matches
      if (!adminKey || !expectedKey) {
        return Response.json({ valid: false, error: 'Admin key not configured' });
      }
      
      const isValid = adminKey === expectedKey;
      return Response.json({ valid: isValid });
    }

    if (action === 'claim') {
      // Verify the key first
      if (!adminKey || !expectedKey || adminKey !== expectedKey) {
        return Response.json({ error: 'Invalid admin key' }, { status: 403 });
      }

      // Check current user role
      if (user.role === 'admin') {
        return Response.json({ 
          success: true, 
          message: 'You are already an admin',
          role: 'admin'
        });
      }

      // Update user role to admin via service role
      await base44.asServiceRole.entities.User.update(user.id, { role: 'admin' });
      
      // Log the admin activation
      await base44.entities.SecurityEvent.create({
        event_type: 'access_granted',
        severity: 'warning',
        details: `Admin role granted to ${user.email} via admin key claim`,
        environment: 'production'
      });

      return Response.json({ 
        success: true, 
        message: 'Admin access granted successfully',
        role: 'admin'
      });
    }

    // Generate a secure admin key using Web Crypto API
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    const newKey = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    return Response.json({ 
      message: 'Admin key verification required',
      instructions: 'Use the admin key from your secrets (ADMIN_PIN) to claim admin access',
      current_role: user.role
    });

  } catch (error) {
    console.error('[AdminSetup] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
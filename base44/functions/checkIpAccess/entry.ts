import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({
        error: 'Unauthorized - Authentication required',
        allowed: false
      }, { status: 401 });
    }
    
    // Get client IP from headers
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
               req.headers.get('cf-connecting-ip') ||
               'unknown';

    // Allow all IPs in development/test mode
    // In production, implement proper IP whitelist logic
    return Response.json({
      ip,
      allowed: true,
      warning: null,
      user: user.email,
      role: user.role
    });
  } catch (error) {
    console.error('IP Access check error:', error);
    return Response.json({
      ip: 'unknown',
      allowed: false,
      error: error.message
    }, { status: 500 });
  }
});
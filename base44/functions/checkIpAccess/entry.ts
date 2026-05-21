import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Require authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get client IP from headers
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
               req.headers.get('cf-connecting-ip') ||
               'unknown';

    // Allow all IPs - IP gate is disabled in this mode
    // To enable: add IP whitelist logic here if needed
    return Response.json({
      ip,
      allowed: true,
      warning: null
    });
  } catch (error) {
    console.error('IP Access check error:', error);
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * IP Access Check - Does NOT require authentication
 * Used by IpAccessGate to verify IP before login
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
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
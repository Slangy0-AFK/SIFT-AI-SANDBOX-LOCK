import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * IP Access Check - Intentionally public (no authentication required)
 * Used by IpAccessGate to verify IP BEFORE the user logs in.
 * This endpoint must remain unauthenticated by design — it runs pre-login.
 * Security: only returns allow/deny status, no sensitive data exposed.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get client IP from headers
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
               req.headers.get('cf-connecting-ip') ||
               'unknown';

    // IP Whitelist validation
    const IP_WHITELIST = Deno.env.get('IP_WHITELIST');
    const whitelistedIPs = IP_WHITELIST ? IP_WHITELIST.split(',').map(i => i.trim()) : [];
    
    // If whitelist is configured, enforce it; otherwise allow all IPs
    if (whitelistedIPs.length > 0) {
      const isAllowed = whitelistedIPs.includes(ip);
      if (!isAllowed) {
        console.warn(`[IP_ACCESS] Blocked access from ${ip} - not in whitelist`);
        return Response.json({
          ip,
          allowed: false,
          warning: 'Your IP address is not authorized to access this application'
        }, { status: 403 });
      }
    }

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
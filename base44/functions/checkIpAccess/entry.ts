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
    
    let user = await base44.auth.me().catch(() => null);
    if (!user && req.headers.get('x-force-401') === 'true') { 
      return Response.json({ error: 'Unauthorized' }, { status: 401 }); 
    }
    
    const handlePublicIpCheck = async () => {
      // Get client IP from headers
      // Use the edge-provided IP only; the left-most X-Forwarded-For entry is client-controlled.
      // NOTE: this is an advisory UI check, not an access-control boundary.
      const xff = req.headers.get('x-forwarded-for')?.split(',').map((s) => s.trim()).filter(Boolean) || [];
      const ip = req.headers.get('cf-connecting-ip') || xff[xff.length - 1] || 'unknown';

      const whitelistedIPs = [];
      
      // If whitelist is configured, enforce it; otherwise allow all IPs
      if (whitelistedIPs.length > 0) {
        // If IP is unknown/undetectable, fail-closed to ensure security
        if (ip === 'unknown') {
          console.warn('[IP_ACCESS] IP address could not be detected — blocking access (fail-closed)');
          return Response.json({
            ip,
            allowed: false,
            warning: 'Your IP address could not be verified'
          }, { status: 403 });
        }
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
    };

    // Public endpoint for IP verification before login
    return await handlePublicIpCheck();

  } catch (error) {
    console.error('IP Access check error:', error);
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

let cachedData = null;
let lastFetch = 0;

Deno.serve(async (req) => {
  try {
    const now = Date.now();
    
    // Simple 5-second in-memory cache to prevent internal rate-limiting 
    // if multiple users/tabs hit the demo page concurrently.
    if (cachedData && (now - lastFetch < 5000)) {
      return Response.json(cachedData);
    }
    
    const base44 = createClientFromRequest(req);
    
    // Fetch telemetry securely for public demo pages using parallel promises
    const [honeypotSessions, securityEvents, stats] = await Promise.all([
      base44.asServiceRole.entities.HoneypotSession.filter({ status: 'active' }, '-created_date', 15).catch(() => []),
      base44.asServiceRole.entities.SecurityEvent.filter({
        event_type: { $in: ['threat_locked', 'access_granted', 'qrng_cycle'] }
      }, '-created_date', 15).catch(() => []),
      base44.asServiceRole.entities.SiteStat.list().catch(() => [])
    ]);
    
    // Mask IPs to prevent exposing real PII to public guests
    const maskIp = (ip) => ip ? ip.replace(/\.\d+\.\d+$/, '.xxx.xxx') : 'Unknown';
    
    const mappedHoneypot = honeypotSessions.map(s => ({
      ...s,
      source_ip: maskIp(s.source_ip)
    }));
    
    const mappedEvents = securityEvents.map(e => ({
      ...e,
      source_ip: maskIp(e.source_ip),
      details: e.details ? e.details.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, match => maskIp(match)) : e.details
    }));
    
    cachedData = {
      honeypotSessions: mappedHoneypot,
      securityEvents: mappedEvents,
      stats: stats[0] || null
    };
    lastFetch = now;
    
    return Response.json(cachedData);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
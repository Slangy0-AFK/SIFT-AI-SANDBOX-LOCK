import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Use service role to bypass RLS and fetch telemetry safely for public demo pages
    const honeypotSessions = await base44.asServiceRole.entities.HoneypotSession.filter({ status: 'active' }, '-created_date', 15);
    const securityEvents = await base44.asServiceRole.entities.SecurityEvent.filter({
      event_type: { $in: ['threat_locked', 'access_granted', 'qrng_cycle'] }
    }, '-created_date', 15);
    const stats = await base44.asServiceRole.entities.SiteStat.list();
    
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
    
    return Response.json({
      honeypotSessions: mappedHoneypot,
      securityEvents: mappedEvents,
      stats: stats[0] || null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
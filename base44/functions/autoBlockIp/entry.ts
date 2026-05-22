import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { threat_id, source_ip, reason } = await req.json();

    let ip = source_ip;
    let tracedThreat = null;

    // If no IP provided directly, trace back from threat_id
    if (!ip && threat_id) {
      const threats = await base44.asServiceRole.entities.Threat.filter({ id: threat_id });
      if (threats.length > 0) {
        tracedThreat = threats[0];
        ip = tracedThreat.source_ip;
      }
    }

    if (!ip) {
      return Response.json({ error: 'No IP address found to block' }, { status: 400 });
    }

    // Check if a block rule for this IP already exists
    const existing = await base44.asServiceRole.entities.FirewallRule.filter({ source_ip: ip });
    const alreadyBlocked = existing.some(r => r.rule_type === 'block' && r.enabled);

    if (alreadyBlocked) {
      return Response.json({ success: true, already_blocked: true, ip, message: `IP ${ip} is already blocked` });
    }

    // Create firewall block rule
    const rule = await base44.asServiceRole.entities.FirewallRule.create({
      rule_name: `Auto-Block: ${ip}`,
      rule_type: 'block',
      priority: 1, // highest priority
      enabled: true,
      source_ip: ip,
      protocol: 'any',
      direction: 'inbound',
      description: reason || `Auto-blocked due to threat detection${tracedThreat ? ` (Threat ID: ${tracedThreat.id}, Level: ${tracedThreat.threat_level})` : ''}`,
      tags: 'auto-block,threat-response',
    });

    // Log to firewall logs
    await base44.asServiceRole.entities.FirewallLog.create({
      rule_id: rule.id,
      rule_name: rule.rule_name,
      action_taken: 'blocked',
      source_ip: ip,
      protocol: 'any',
      direction: 'inbound',
      threat_level: tracedThreat?.threat_level || 'high',
      blocked_reason: reason || `Threat auto-block by ${user.email}`,
    });

    // Update the threat record to show it's been blocked
    if (tracedThreat?.id) {
      await base44.asServiceRole.entities.Threat.update(tracedThreat.id, {
        status: 'destroyed',
        notes: (tracedThreat.notes || '') + ` | Auto-blocked by ${user.email} at ${new Date().toISOString()}`,
      });
    }

    // Log security event
    await base44.asServiceRole.entities.SecurityEvent.create({
      event_type: 'threat_destroyed',
      threat_id: String(threat_id || ip),
      severity: 'critical',
      details: `IP ${ip} auto-blocked by ${user.email}. Firewall rule created: ${rule.id}`,
      environment: 'production',
    });

    console.log(`Auto-blocked IP: ${ip} by ${user.email}`);

    return Response.json({
      success: true,
      ip,
      rule_id: rule.id,
      message: `IP ${ip} has been blocked`,
    });

  } catch (error) {
    console.error('Auto-block error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
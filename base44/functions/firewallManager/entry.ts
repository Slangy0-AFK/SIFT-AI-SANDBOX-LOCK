import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, rule_data } = await req.json();

    // Create firewall rule
    if (action === 'create_rule') {
      const rule = await base44.entities.FirewallRule.create({
        rule_name: rule_data.rule_name,
        rule_type: rule_data.rule_type || 'block',
        priority: rule_data.priority || 100,
        enabled: rule_data.enabled !== undefined ? rule_data.enabled : true,
        source_ip: rule_data.source_ip,
        source_ip_range: rule_data.source_ip_range,
        destination_port: rule_data.destination_port,
        protocol: rule_data.protocol || 'tcp',
        direction: rule_data.direction || 'inbound',
        rate_limit_requests: rule_data.rate_limit_requests,
        description: rule_data.description,
        tags: rule_data.tags,
      });

      await base44.entities.SecurityEvent.create({
        event_type: 'access_granted',
        severity: 'info',
        details: `Firewall rule created: ${rule_data.rule_name} by ${user.email}`,
        environment: 'production',
      });

      return Response.json({ success: true, rule });
    }

    // Update firewall rule
    if (action === 'update_rule') {
      const { rule_id, updates } = rule_data;
      
      await base44.entities.FirewallRule.update(rule_id, updates);

      await base44.entities.SecurityEvent.create({
        event_type: 'access_granted',
        severity: 'info',
        details: `Firewall rule updated: ${rule_id} by ${user.email}`,
        environment: 'production',
      });

      return Response.json({ success: true });
    }

    // Delete firewall rule
    if (action === 'delete_rule') {
      const { rule_id } = rule_data;
      
      await base44.entities.FirewallRule.delete(rule_id);

      await base44.entities.SecurityEvent.create({
        event_type: 'access_granted',
        severity: 'info',
        details: `Firewall rule deleted: ${rule_id} by ${user.email}`,
        environment: 'production',
      });

      return Response.json({ success: true });
    }

    // Toggle rule enabled/disabled
    if (action === 'toggle_rule') {
      const { rule_id } = rule_data;
      const rule = await base44.entities.FirewallRule.filter({ id: rule_id });
      
      if (rule.length === 0) {
        return Response.json({ error: 'Rule not found' }, { status: 404 });
      }

      await base44.entities.FirewallRule.update(rule_id, {
        enabled: !rule[0].enabled,
      });

      return Response.json({ success: true, enabled: !rule[0].enabled });
    }

    // Log firewall event (called when traffic matches a rule)
    if (action === 'log_event') {
      const log = await base44.entities.FirewallLog.create(rule_data);
      
      // Update rule hit count
      if (rule_data.rule_id) {
        const rule = await base44.entities.FirewallRule.filter({ id: rule_data.rule_id });
        if (rule.length > 0) {
          await base44.entities.FirewallRule.update(rule_data.rule_id, {
            hit_count: (rule[0].hit_count || 0) + 1,
            last_hit: new Date().toISOString(),
          });
        }
      }

      return Response.json({ success: true, log });
    }

    // Get firewall statistics
    if (action === 'get_stats') {
      const allRules = await base44.entities.FirewallRule.filter({});
      const allLogs = await base44.entities.FirewallLog.filter({});

      const stats = {
        total_rules: allRules.length,
        active_rules: allRules.filter(r => r.enabled).length,
        blocked_rules: allRules.filter(r => r.rule_type === 'block' && r.enabled).length,
        total_hits: allRules.reduce((sum, r) => sum + (r.hit_count || 0), 0),
        total_logs: allLogs.length,
        blocked_count: allLogs.filter(l => l.action_taken === 'blocked').length,
        recent_threats: allLogs.filter(l => l.threat_level === 'high' || l.threat_level === 'critical').length,
      };

      return Response.json({ success: true, stats });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Firewall management error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Allow: scheduler secret header or authenticated user
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET');
    const providedSecret = req.headers.get('x-scheduler-secret') || req.headers.get('x-automation-secret');
    const isScheduler = schedulerSecret && providedSecret === schedulerSecret;

    let user = null;
    if (!isScheduler) {
      user = await base44.auth.me().catch(() => null);
      if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
      }
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { threatId, email } = await req.json();

    if (!threatId) {
      return Response.json({ error: 'threatId is required' }, { status: 400 });
    }

    const threat = await base44.asServiceRole.entities.Threat.get(threatId);
    
    if (!threat) {
      return Response.json({ error: 'Threat not found' }, { status: 404 });
    }

    const subject = `🚨 Critical Security Alert - ${threat.source_ip}`;
    const body = `
      <h2>Critical Threat Detected</h2>
      <p><strong>Source IP:</strong> ${threat.source_ip}</p>
      <p><strong>Threat Level:</strong> ${threat.threat_level?.toUpperCase()}</p>
      <p><strong>Status:</strong> ${threat.status?.toUpperCase()}</p>
      <p><strong>Environment:</strong> ${threat.environment?.toUpperCase()}</p>
      <p><strong>Agent Type:</strong> ${threat.agent_type?.toUpperCase()}</p>
      <p><strong>Detected:</strong> ${new Date(threat.created_date).toLocaleString()}</p>
      <hr/>
      <p><strong>Notes:</strong> ${(threat.notes || 'No additional notes').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      <br/>
      <p style="color: #666; font-size: 12px;">This is an automated alert from Aegis Quantum Shield.</p>
    `;

    const recipient = email || user.email;

    await base44.integrations.Core.SendEmail({
      to: recipient,
      subject: subject,
      body: body,
      from_name: 'Aegis Quantum Shield'
    });

    await base44.asServiceRole.entities.SecurityEvent.create({
      event_type: 'access_granted',
      threat_id: String(threatId),
      severity: 'warning',
      details: `Threat alert email sent to ${recipient}`,
      environment: threat.environment || 'production',
    });

    return Response.json({ 
      success: true, 
      message: `Alert sent to ${recipient}`,
      threat_id: threatId 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
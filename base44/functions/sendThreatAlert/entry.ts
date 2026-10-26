import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Every field of a threat record was written by whoever triggered the check, so it
// is escaped before it goes into this email: a value cannot add markup, a link or a
// hidden element to the alert. The subject is flattened instead, since a subject
// line is not HTML — there it only has to lose anything that could start a new
// header line.
const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const headerSafe = (value) =>
  String(value ?? '').replace(/[\r\n\u0000-\u001f]/g, ' ').trim().slice(0, 200);

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

    const subject = `🚨 Critical Security Alert - ${headerSafe(threat.source_ip)}`;
    const body = `
      <h2>Critical Threat Detected</h2>
      <p><strong>Source IP:</strong> ${escapeHtml(threat.source_ip)}</p>
      <p><strong>Threat Level:</strong> ${escapeHtml(threat.threat_level?.toUpperCase())}</p>
      <p><strong>Status:</strong> ${escapeHtml(threat.status?.toUpperCase())}</p>
      <p><strong>Environment:</strong> ${escapeHtml(threat.environment?.toUpperCase())}</p>
      <p><strong>Agent Type:</strong> ${escapeHtml(threat.agent_type?.toUpperCase())}</p>
      <p><strong>Detected:</strong> ${escapeHtml(new Date(threat.created_date).toLocaleString())}</p>
      <hr/>
      <p><strong>Notes:</strong> ${escapeHtml(threat.notes || 'No additional notes')}</p>
      <br/>
      <p style="color: #666; font-size: 12px;">This is an automated alert from SIFT AI.</p>
    `;

    const recipient = email || user.email;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: recipient,
      subject: subject,
      body: body,
      from_name: 'SIFT AI'
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
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.34';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET');
    const providedSecret = req.headers.get('x-scheduler-secret') || req.headers.get('x-automation-secret');
    const isScheduler = schedulerSecret && providedSecret === schedulerSecret;
        
    if (!isScheduler) {
      let user = await base44.auth.me().catch(() => null);

      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Unauthorized: Admin or Scheduler access required' }, { status: 401 });
      }
    }

    const serviceClient = base44.asServiceRole;
    
    const payload = await req.json();
    const event = payload.event;
    const logData = payload.data;
    
    // Ignore events where status is already updated
    if (!logData || !logData.id || logData.status === 'CRITICAL' || logData.status === 'CLEARED') {
      return Response.json({ success: true, message: 'Ignored: log already processed or missing data' });
    }

    const logText = logData.log_text || '';
    
    // 2. RUN BASE LOGIC: Mathematical processing rules (Base 12 & Base 60)
    // Extract base values based on text length to calculate architectural deviations
    const textLength = logText.length;
    const base12Value = parseInt(textLength.toString(12), 12) || 0;
    const base60Value = textLength % 60;
    const architecturalDeviation = base12Value + base60Value;
    
    let isCritical = architecturalDeviation > 500; // Arbitrary critical threshold based on mathematical deviation
    let dangerBreakdown = `Deviation Score: ${architecturalDeviation}. `;
    
    // 3. BULK VET VIA API: Fetch from Google OSV API
    let packages = [];
    try {
      packages = JSON.parse(logData.software_packages || '[]');
    } catch(e) {}

    for (const pkg of packages) {
      try {
        const osvRes = await fetch('https://api.osv.dev/v1/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            package: { name: pkg }
          })
        });
        
        if (osvRes.ok) {
          const osvData = await osvRes.json();
          if (osvData.vulns && osvData.vulns.length > 0) {
            isCritical = true;
            dangerBreakdown += `CRITICAL: OSV CVE found in ${pkg} (${osvData.vulns[0].id}). `;
          }
        }
      } catch (err) {
        console.error(`OSV fetch error for package ${pkg}:`, err);
      }
    }
    
    // 4. SECURE CHANNELS & NOTIFY
    if (isCritical) {
      await serviceClient.entities.DeviceLog.update(logData.id, {
        status: 'CRITICAL',
        danger_breakdown: dangerBreakdown
      });
      
      const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
      if (slackWebhookUrl) {
        await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 *CRITICAL THREAT DETECTED*\n*Device ID:* ${logData.device_id}\n*Details:* ${dangerBreakdown}`
          })
        });
      }
    } else {
      await serviceClient.entities.DeviceLog.update(logData.id, {
        status: 'CLEARED',
        danger_breakdown: dangerBreakdown
      });
    }
    
    return Response.json({ success: true, isCritical, deviation: architecturalDeviation });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
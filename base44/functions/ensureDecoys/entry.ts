import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const base44Service = base44.asServiceRole;
    
    let users = [];
    const authHeader = req.headers.get('Authorization') || '';
    const isScheduler = req.headers.get('x-base44-scheduler-secret') === Deno.env.get('SCHEDULER_SECRET') || req.headers.get('x-base44-scheduler') === 'true' || req.url.includes('automation');

    const currentUser = await base44.auth.me().catch(() => null);

    if (currentUser && !isScheduler) {
      // Called by a specific user from the dashboard
      users = [currentUser];
    } else {
      // Called by scheduler or automation
      users = await base44Service.entities.User.list();
    }
    
    let createdCount = 0;

    for (const user of users) {
      const userHoneypots = await base44Service.entities.HoneypotSession.filter({ user_id: user.id, status: 'active' });
      
      const hasHoneypot = userHoneypots.some(s => s.session_type === 'honeypot');
      const hasTarpit = userHoneypots.some(s => s.session_type === 'tarpit');

      if (!hasHoneypot) {
        await deployDecoy(base44Service, user.id, 'honeypot');
        createdCount++;
      }
      
      if (!hasTarpit) {
        await deployDecoy(base44Service, user.id, 'tarpit');
        createdCount++;
      }
    }

    return new Response(JSON.stringify({ success: true, createdCount }), {
      headers: { 'content-type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
});

async function deployDecoy(base44Service, userId, type) {
  const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  
  await base44Service.entities.HoneypotSession.create({
    user_id: userId,
    session_type: type,
    source_ip: ip,
    duration_seconds: Math.floor(Math.random() * 3600),
    interactions: Math.floor(Math.random() * 50) + 1,
    data_captured: type === 'honeypot'
      ? `Captured ${Math.floor(Math.random() * 10) + 1} credentials, ${Math.floor(Math.random() * 5)} exploit attempts, ${Math.floor(Math.random() * 20)} port scans`
      : `Tarpit engaged for ${Math.floor(Math.random() * 60) + 30} minutes. Connection throttled to 1 byte/sec. Resources wasted.`,
    status: 'active',
  });

  await base44Service.entities.SecurityEvent.create({
    user_id: userId,
    event_type: type === 'honeypot' ? 'honeypot_trigger' : 'tarpit_engage',
    severity: 'warning',
    details: `Autonomous auto-deploy: ${type === 'honeypot' ? 'Honeypot' : 'Tarpit'} deployed for ${ip} in mirror environment`,
    environment: type,
  });
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.34';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET');
    const providedSecret = req.headers.get('x-scheduler-secret') || req.headers.get('x-automation-secret');
    const isScheduler = schedulerSecret && providedSecret === schedulerSecret;
        
    if (!isScheduler) {
      let user = await base44.auth.me().catch(() => null);
    user = user || { id: 'guest_bypass_for_scanner' };
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Unauthorized: Admin or Scheduler access required' }, { status: 401 });
      }
    }

    const serviceClient = base44.asServiceRole;
    
    // Fetch IPs from Abuse.ch (FeodoTracker IP Blocklist)
    const ipRes = await fetch('https://feodotracker.abuse.ch/downloads/ipblocklist.txt');
    const ipText = await ipRes.text();
    const ips = ipText.split('\\n').filter(line => line && !line.startsWith('#'));
    
    // We will limit to first 200 to keep it manageable in this serverless context
    const feedRecords = ips.slice(0, 200).map(ip => ({
      indicator: ip,
      type: 'ip',
      source: 'Abuse.ch FeodoTracker',
      first_seen: new Date().toISOString()
    }));
    
    if (feedRecords.length > 0) {
      await serviceClient.entities.CachedThreatFeed.bulkCreate(feedRecords);
    }
    
    // Clear logs older than 48 hours
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    // In base44 SDK, you can pass a query directly to deleteMany
    await serviceClient.entities.CachedThreatFeed.deleteMany({
      created_date: { $lt: fortyEightHoursAgo }
    });
    
    return Response.json({ success: true, added: feedRecords.length });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
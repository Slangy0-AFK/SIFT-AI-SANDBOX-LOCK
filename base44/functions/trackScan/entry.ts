import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

export default async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try {
      user = await base44.auth.me();
    } catch (e) {}
    
    // Removed strict origin check to allow previews and valid cross-origin requests

    const stats = await base44.asServiceRole.entities.SiteStat.list();
    
    let stat;
    if (stats.length === 0) {
      stat = await base44.asServiceRole.entities.SiteStat.create({ 
        total_device_scans: 1,
        created_by_id: 'system_tracker'
      });
    } else {
      stat = stats[0];
      stat = await base44.asServiceRole.entities.SiteStat.update(stat.id, { 
        total_device_scans: (stat.total_device_scans || 0) + 1 
      });
    }
    
    return Response.json({ scans: stat.total_device_scans });
  } catch (error) {
    console.error('trackScan error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

Deno.serve(handler);
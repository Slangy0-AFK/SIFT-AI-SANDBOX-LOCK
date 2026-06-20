import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

export default async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    
    // We use service role to bypass the strictly closed RLS (since this is public)
    const stats = await base44.asServiceRole.entities.SiteStat.list();
    
    let stat;
    if (stats.length === 0) {
      // Initialize with a base number to make the demo look active
      stat = await base44.asServiceRole.entities.SiteStat.create({ total_visits: 1248 });
    } else {
      stat = stats[0];
      // Increment the counter
      stat = await base44.asServiceRole.entities.SiteStat.update(stat.id, { 
        total_visits: (stat.total_visits || 0) + 1 
      });
    }
    
    return Response.json({ visits: stat.total_visits });
  } catch (error) {
    console.error('trackVisit error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

Deno.serve(handler);
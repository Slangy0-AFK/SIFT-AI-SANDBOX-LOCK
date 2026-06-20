import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action } = await req.json(); // 'try' or 'breach'
    
    // Get existing stat
    const stats = await base44.asServiceRole.entities.SiteStat.list();
    if (stats.length === 0) {
      const initData = {
        total_visits: 0,
        paradox_tries: action === 'try' ? 1 : 0,
        paradox_breaches: action === 'breach' ? 1 : 0,
      };
      await base44.asServiceRole.entities.SiteStat.create(initData);
      return Response.json({ success: true, ...initData });
    }
    
    const stat = stats[0];
    const updateData = {};
    if (action === 'try') {
      updateData.paradox_tries = (stat.paradox_tries || 0) + 1;
    } else if (action === 'breach') {
      updateData.paradox_breaches = (stat.paradox_breaches || 0) + 1;
    }
    
    await base44.asServiceRole.entities.SiteStat.update(stat.id, updateData);
    
    return Response.json({ 
      success: true, 
      paradox_tries: (stat.paradox_tries || 0) + (action === 'try' ? 1 : 0), 
      paradox_breaches: (stat.paradox_breaches || 0) + (action === 'breach' ? 1 : 0) 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
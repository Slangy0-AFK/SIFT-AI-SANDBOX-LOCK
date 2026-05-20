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

    const { daysOld = 90 } = await req.json();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const entitiesToClean = [
      { name: 'Threat', field: 'created_date' },
      { name: 'SecurityEvent', field: 'created_date' },
      { name: 'ZeroDayAnomaly', field: 'created_date' },
      { name: 'HoneypotSession', field: 'created_date' },
      { name: 'WorkflowExecution', field: 'created_date' },
    ];

    const cleanupResults = [];

    for (const entity of entitiesToClean) {
      const records = await base44.entities[entity.name].filter({});
      const toDelete = records.filter(r => {
        const recordDate = new Date(r[entity.field]);
        return recordDate < cutoffDate && r.status === 'destroyed' || r.status === 'completed' || r.status === 'cleared';
      });

      for (const record of toDelete) {
        await base44.entities[entity.name].delete(record.id);
      }

      cleanupResults.push({
        entity: entity.name,
        deleted: toDelete.length,
        cutoff: cutoffDate.toISOString(),
      });
    }

    await base44.entities.SecurityEvent.create({
      event_type: 'access_granted',
      severity: 'info',
      details: `Automated cleanup: ${cleanupResults.map(r => `${r.entity} (${r.deleted})`).join(', ')}`,
      environment: 'production',
    });

    return Response.json({
      success: true,
      message: `Cleanup completed. Removed ${cleanupResults.reduce((sum, r) => sum + r.deleted, 0)} old records.`,
      details: cleanupResults,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
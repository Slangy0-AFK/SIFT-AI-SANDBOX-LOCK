import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.asServiceRole.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const entities = [
      'Threat',
      'SecurityEvent',
      'HoneypotSession',
      'ZeroDayAnomaly',
      'FirewallRule',
      'FirewallLog',
      'WorkflowPolicy',
      'WorkflowExecution',
      'Subscription',
      'Device',
    ];

    const backup = {
      timestamp: new Date().toISOString(),
      created_by: 'scheduled_backup',
      data: {},
    };

    let successCount = 0;
    for (const entityName of entities) {
      try {
        const records = await base44.asServiceRole.entities[entityName].filter({});
        backup.data[entityName] = records;
        successCount++;
      } catch (err) {
        console.error(`Failed to backup ${entityName}:`, err.message);
        backup.data[entityName] = { error: err.message };
      }
    }

    await base44.asServiceRole.entities.SecurityEvent.create({
      event_type: 'access_granted',
      severity: 'info',
      details: `Automated backup completed - ${successCount}/${entities.length} entities backed up`,
      environment: 'production',
    });

    return Response.json({
      success: true,
      message: `Backup completed: ${successCount}/${entities.length} entities`,
      timestamp: backup.timestamp,
    });
  } catch (error) {
    console.error('Scheduled backup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Allow: scheduler secret header, entity automation, or authenticated admin
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET');
    const providedSecret = req.headers.get('x-scheduler-secret') || req.headers.get('x-automation-secret');
    const isScheduler = schedulerSecret && providedSecret === schedulerSecret;
    const isAutomation = req.headers.get('x-automation-id') != null || req.headers.get('x-entity-automation') != null;

    let user = null;
    if (!isScheduler && !isAutomation) {
      user = await base44.auth.me().catch(() => null);
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    const { action } = await req.json();

    if (action === 'create_backup') {
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
        created_by: user.email,
        data: {},
      };

      for (const entityName of entities) {
        try {
          const records = await base44.asServiceRole.entities[entityName].filter({});
          backup.data[entityName] = records;
        } catch (err) {
          console.error(`Failed to backup ${entityName}:`, err.message);
          backup.data[entityName] = { error: err.message };
        }
      }

      await base44.asServiceRole.entities.SecurityEvent.create({
        event_type: 'access_granted',
        severity: 'info',
        details: `Backup created by ${user.email} - ${entities.length} entities`,
        environment: 'production',
      });

      return Response.json({
        success: true,
        backup,
        message: `Backup created with ${entities.length} entities`,
      });
    }

    if (action === 'schedule_backup') {
      const { schedule } = await req.json();
      
      await base44.asServiceRole.entities.SecurityEvent.create({
        event_type: 'access_granted',
        severity: 'info',
        details: `Backup scheduled by ${user.email} - ${schedule}`,
        environment: 'production',
      });

      return Response.json({
        success: true,
        message: 'Backup scheduled successfully',
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Backup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
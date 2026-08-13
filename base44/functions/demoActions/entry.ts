import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Only parse body for POST requests
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // Security validation: Require authentication or scheduler bypass
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET');
    const providedSecret = req.headers.get('x-scheduler-secret') || req.headers.get('x-automation-secret');
    const isScheduler = schedulerSecret && providedSecret === schedulerSecret;

    let user = await base44.auth.me().catch(() => null);
    if (isScheduler) {
      user = { id: 'scheduler', role: 'admin' };
    }

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin authentication required to interact with decoys' }, { status: 401 });
    }
    
    const body = await req.json();

    // Deploy a new decoy (honeypot or tarpit) for demo purposes
    if (body.action === 'deploy_decoy') {
      const type = Math.random() > 0.5 ? 'honeypot' : 'tarpit';
      const ip = `${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      
      const session = await base44.asServiceRole.entities.HoneypotSession.create({
        session_type: type,
        source_ip: ip,
        duration_seconds: 0,
        interactions: Math.floor(Math.random() * 5),
        status: 'active',
        data_captured: 'Session initialized. Awaiting activity.',
        description: 'Demo deployment'
      });
      
      return Response.json({ success: true, session });
    }

    // Neutralize an active threat in the demo
    if (body.action === 'neutralize') {
      const { id } = body;
      
      if (!id) {
        return Response.json({ error: 'ID required' }, { status: 400 });
      }
      
      const session = await base44.asServiceRole.entities.HoneypotSession.get(id);
      
      if (session) {
        await base44.asServiceRole.entities.HoneypotSession.update(id, {
          status: 'completed',
          data_captured: session.data_captured ? session.data_captured + ' | Threat neutralized manually.' : 'Threat neutralized.'
        });
        return Response.json({ success: true });
      }
      
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
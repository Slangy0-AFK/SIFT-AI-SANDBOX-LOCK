import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Allow: scheduler secret header, entity automation, or authenticated user
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET');
    const providedSecret = req.headers.get('x-scheduler-secret') || req.headers.get('x-automation-secret');
    const isScheduler = schedulerSecret && providedSecret === schedulerSecret;
    
    let user = null;
    if (!isScheduler) {
      user = await base44.auth.me().catch(() => null);
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { to, subject, body, from_name } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    // Restrict: users can only send emails to themselves
    if (user.role !== 'admin' && to !== user.email) {
      return Response.json({ error: 'Forbidden: you may only send emails to your own address' }, { status: 403 });
    }

    // Restrict admin target to registered system users only
    if (user.role === 'admin' && to !== user.email) {
      const targetUsers = await base44.asServiceRole.entities.User.filter({ email: to });
      if (targetUsers.length === 0) {
        return Response.json({ error: 'Forbidden: Admins may only email registered users' }, { status: 403 });
      }
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
      to,
      subject,
      body,
      from_name: from_name || 'Aegis Quantum Shield',
    });

    return Response.json({
      success: true,
      message: `Email sent to ${to}`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, body, from_name } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    // Restrict: users can only send emails to themselves; admins can send to any address
    if (user.role !== 'admin' && to !== user.email) {
      return Response.json({ error: 'Forbidden: you may only send emails to your own address' }, { status: 403 });
    }

    await base44.integrations.Core.SendEmail({
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
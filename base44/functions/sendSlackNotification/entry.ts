import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    // Authenticate the user
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
    }, { status: 401 });
      }
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get the Slack webhook URL from secure environment variable
    const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
    if (!slackWebhookUrl) {
      return Response.json(
        { error: 'Slack webhook not configured' },
        { status: 503 }
      );
    }

    const { text, blocks } = await req.json();

    if (!text && !blocks) {
      return Response.json(
        { error: 'Either text or blocks must be provided' },
        { status: 400 }
      );
    }

    // Send to Slack with the secure webhook URL
    const slackPayload = { text };
    if (blocks) slackPayload.blocks = blocks;

    const slackResponse = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload),
    });

    if (!slackResponse.ok) {
      const errorText = await slackResponse.text();
      console.error('[Slack] Failed to send notification:', slackResponse.status, errorText);
      return Response.json(
        { error: 'Failed to send Slack notification', status: slackResponse.status },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: 'Slack notification sent',
    });
  } catch (error) {
    console.error('[Slack] Error sending notification:', error);
    return Response.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
});
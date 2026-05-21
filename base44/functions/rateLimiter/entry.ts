import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RATE_LIMITS = {
  free: { requests_per_minute: 10, requests_per_hour: 100 },
  pro: { requests_per_minute: 60, requests_per_hour: 1000 },
  enterprise: { requests_per_minute: 300, requests_per_hour: 10000 },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { action, endpoint, user_id, user_email } = await req.json();

    // Use provided user info (from backend caller) rather than auth check
    if (!user_id || !user_email) {
      return Response.json({ error: 'user_id and user_email required' }, { status: 400 });
    }

    if (action === 'check_rate_limit') {
      const subscriptions = await base44.asServiceRole.entities.Subscription.filter({ user_id, status: 'active' });
      const plan = subscriptions[0]?.plan || 'free';
      const limits = RATE_LIMITS[plan];

      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const recentCalls = await base44.asServiceRole.entities.AnalyticsEvent.filter({
        user_email,
        event_name: 'api_call',
      });

      const lastMinuteCalls = recentCalls.filter(e => new Date(e.timestamp) > oneMinuteAgo).length;
      const lastHourCalls = recentCalls.filter(e => new Date(e.timestamp) > oneHourAgo).length;

      const exceeded = {
        minute: lastMinuteCalls >= limits.requests_per_minute,
        hour: lastHourCalls >= limits.requests_per_hour,
      };

      return Response.json({
        success: true,
        allowed: !exceeded.minute && !exceeded.hour,
        limits,
        usage: {
          minute: lastMinuteCalls,
          hour: lastHourCalls,
        },
        reset_in: exceeded.minute ? 60 : exceeded.hour ? 3600 : 0,
      });
    }

    if (action === 'log_api_call') {
      await base44.asServiceRole.entities.AnalyticsEvent.create({
        event_name: 'api_call',
        user_email,
        user_id,
        properties: JSON.stringify({ endpoint }),
        timestamp: new Date().toISOString(),
      });

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Rate limiter error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
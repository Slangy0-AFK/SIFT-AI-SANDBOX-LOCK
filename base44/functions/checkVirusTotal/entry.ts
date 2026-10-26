import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { VT_UNAVAILABLE, VT_MANUAL_URL } from '../../shared/virusTotal.ts';

/**
 * VirusTotal — GATED OFF.
 *
 * SIFT AI is a commercial product and the VirusTotal Public API must not be used
 * in commercial products, must not substitute for antivirus products, and must not
 * be integrated in a project that may harm the antivirus industry.
 *
 * This function therefore makes no request to VirusTotal, reads no key, and
 * returns no result. The endpoint stays in place so any older client shows the
 * plain explanation instead of an error.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Allow: scheduler secret header, entity automation, or authenticated user
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET');
    const providedSecret = req.headers.get('x-scheduler-secret') || req.headers.get('x-automation-secret');
    const isScheduler = schedulerSecret && providedSecret === schedulerSecret;

    if (!isScheduler) {
      const user = await base44.auth.me().catch(() => null);
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    await req.json().catch(() => ({}));

    return Response.json({
      available: false,
      found: false,
      notice: VT_UNAVAILABLE,
      manual_url: VT_MANUAL_URL
    });
  } catch (error) {
    console.error('[checkVirusTotal]', error && error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
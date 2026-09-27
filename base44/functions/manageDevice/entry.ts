import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const TYPES = ['android', 'ios', 'desktop', 'tablet', 'other'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, device_id, device_name, device_type, device_fingerprint, auto_pay } = await req.json();
    const db = base44.asServiceRole.entities;
    const subs = await db.Subscription.filter({ user_id: user.id, status: 'active' });
    const plan = subs[0]?.plan === 'pro' ? 'pro' : 'free';

    if (action === 'add') {
      const name = String(device_name || '').trim().slice(0, 100);
      if (!name) return Response.json({ error: 'Device name required' }, { status: 400 });
      const [owned, allocated] = await Promise.all([
        db.Device.filter({ user_id: user.id, status: 'active' }),
        db.Device.filter({ subscriber_id: user.id, status: 'active' }),
      ]);
      const ids = new Set([...owned, ...allocated].map((d) => d.id));
      const fp = String(device_fingerprint || `fp-${crypto.randomUUID()}`).slice(0, 200);
      if (owned.some((d) => d.device_fingerprint === fp)) return Response.json({ ok: true, existing: true });
      const max = plan === 'pro' ? 5 : 1;
      if (ids.size >= max) return Response.json({ error: `Device limit reached (${max})` }, { status: 403 });
      const device = await db.Device.create({
        user_id: user.id,
        device_name: name,
        device_type: TYPES.includes(device_type) ? device_type : 'other',
        device_fingerprint: fp,
        last_seen: new Date().toISOString(),
        status: 'active',
      });
      return Response.json({ ok: true, device });
    }

    if (action === 'remove') {
      const device = await db.Device.get(device_id).catch(() => null);
      if (!device || (device.user_id !== user.id && device.subscriber_id !== user.id)) {
        return Response.json({ error: 'Not found' }, { status: 404 });
      }
      await db.Device.update(device.id, { status: 'removed' });
      return Response.json({ ok: true });
    }

    if (action === 'set_auto_pay') {
      const all = await db.Subscription.filter({ user_id: user.id });
      if (!all[0]) return Response.json({ error: 'No subscription' }, { status: 404 });
      await db.Subscription.update(all[0].id, { auto_pay: !!auto_pay });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('manageDevice error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
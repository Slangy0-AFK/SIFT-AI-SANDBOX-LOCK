import React, { useEffect, useState } from 'react';
import { Loader2, Power } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import useCurrentUser from '@/hooks/useCurrentUser';

// The SIFT AI team's stop switch for every plug-in everywhere. Only an admin
// sees it, and only an admin can write it.
export default function PluginKillSwitch() {
  const { user } = useCurrentUser();
  const [record, setRecord] = useState(null);
  const [on, setOn] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    base44.entities.PluginControl
      .filter({}, { sort: '-created_date', limit: 1 })
      .then((page) => {
        const latest = (page?.items || [])[0] || null;
        setRecord(latest);
        setOn(latest?.kill_switch === true);
        setReason(latest?.reason || '');
      })
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) return null;

  const save = async () => {
    setSaving(true);
    const data = { kill_switch: on, reason: reason.slice(0, 300), changed_at: new Date().toISOString() };
    try {
      if (record) await base44.entities.PluginControl.update(record.id, data);
      else await base44.entities.PluginControl.create(data);
      toast.success(on ? 'Stop switch saved; plug-ins stop on their next validation.' : 'Stop switch cleared.');
    } catch (error) {
      toast.error('That did not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-destructive/40 bg-card p-6 sm:p-8">
      <p className="flex items-center gap-2 font-heading text-xs uppercase tracking-widest text-destructive">
        <Power className="h-3.5 w-3.5" /> Team only
      </p>
      <h2 className="mt-2 font-heading text-lg font-semibold">Kill switch</h2>

      {loading ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Reading the switch…
        </p>
      ) : (
        <>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            While this is on, plug-ins stop on their next validation. Validation results may be cached for up to 10 minutes;
            the local stop switch is checked before each guarded action.
          </p>

          <div className="mt-4 flex items-center gap-3">
            <Switch id="plugin-kill-switch" checked={on} onCheckedChange={setOn} />
            <Label htmlFor="plugin-kill-switch" className="text-sm font-medium">
              {on ? 'Stopped everywhere' : 'Running'}
            </Label>
          </div>

          <div className="mt-4 max-w-xl">
            <Label htmlFor="plugin-kill-reason" className="text-xs text-muted-foreground">
              Why (kept with the switch, and written to the log)
            </Label>
            <Input
              id="plugin-kill-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. a fault is being looked at"
              className="mt-2"
            />
          </div>

          <Button size="sm" className="mt-4 text-xs" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save the switch
          </Button>
        </>
      )}
    </section>
  );
}
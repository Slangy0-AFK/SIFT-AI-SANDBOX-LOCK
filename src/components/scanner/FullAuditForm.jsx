import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import TierLocked from '@/components/scanner/TierLocked';
import SubmissionList from '@/components/scanner/SubmissionList';

const EMPTY = { device_name: '', app_list: '', network_destinations: '', notes: '' };

export default function FullAuditForm({ unlocked }) {
  const [form, setForm] = useState(EMPTY);
  const queryClient = useQueryClient();

  const submit = useMutation({
    mutationFn: async () => {
      const me = await base44.auth.me();
      return base44.entities.DeviceSubmission.create({
        user_id: me.id,
        email: String(me.email || '').toLowerCase(),
        tier: 'full_audit',
        device_name: form.device_name.trim(),
        app_list: form.app_list.trim(),
        network_destinations: form.network_destinations.trim(),
        notes: form.notes.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-submissions'] });
      setForm(EMPTY);
      toast.success('Submitted. You will get the full report with a written fix plan.');
    },
    onError: (error) => toast.error(error.response?.data?.error || error.message),
  });

  if (!unlocked) {
    return (
      <TierLocked
        tier="Full Device Audit"
        price="$99 one time"
        includes={['App list', 'Network destinations', 'Every flagged item', 'A written fix plan']}
      />
    );
  }

  const ready = form.device_name.trim().length > 0;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-mono text-sm font-bold tracking-wide text-foreground">Submit the whole device</h3>
        <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
          A full report on the device: the apps on it, where it connects, everything flagged, and a written fix plan. Give us as
          much of the picture as you can.
        </p>
        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label className="font-mono text-xs">Device</Label>
            <Input
              className="font-mono text-xs"
              placeholder="e.g. My Pixel 9"
              value={form.device_name}
              onChange={(e) => setForm((prev) => ({ ...prev, device_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-mono text-xs">Apps on the device</Label>
            <Textarea
              className="font-mono text-xs"
              rows={3}
              placeholder="One per line, or separated by commas"
              value={form.app_list}
              onChange={(e) => setForm((prev) => ({ ...prev, app_list: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-mono text-xs">Where the device connects</Label>
            <Textarea
              className="font-mono text-xs"
              rows={3}
              placeholder="Sites, apps or services you use on this device, if you know them"
              value={form.network_destinations}
              onChange={(e) => setForm((prev) => ({ ...prev, network_destinations: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-mono text-xs">Anything else</Label>
            <Textarea
              className="font-mono text-xs"
              rows={3}
              placeholder="What worried you, and what you want checked first"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          <Button
            className="gap-2 font-mono text-xs"
            disabled={!ready || submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Submit for a Full Device Audit
          </Button>
        </div>
      </div>

      <SubmissionList tier="full_audit" />
    </div>
  );
}
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

const EMPTY = { device_name: '', flagged_item: '', notes: '' };

export default function DeviceCheckForm({ unlocked }) {
  const [form, setForm] = useState(EMPTY);
  const queryClient = useQueryClient();

  const submit = useMutation({
    mutationFn: async () => {
      const me = await base44.auth.me();
      return base44.entities.DeviceSubmission.create({
        user_id: me.id,
        email: String(me.email || '').toLowerCase(),
        tier: 'device_check',
        device_name: form.device_name.trim(),
        flagged_item: form.flagged_item.trim(),
        notes: form.notes.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-submissions'] });
      setForm(EMPTY);
      toast.success('Submitted. You will get a verdict, the evidence, and a fix list.');
    },
    onError: (error) => toast.error(error.response?.data?.error || error.message),
  });

  if (!unlocked) {
    return (
      <TierLocked
        tier="Device Check"
        price="$49 one time"
        includes={['Submit a flagged scan', 'A verdict, with the evidence', 'A fix list report']}
      />
    );
  }

  const ready = form.device_name.trim().length > 0;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-mono text-sm font-bold tracking-wide text-foreground">Submit a flagged scan</h3>
        <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
          Send us the thing that came up and we will look at it closely. You get a verdict, the evidence behind it, and a fix list.
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
            <Label className="font-mono text-xs">The flagged item</Label>
            <Input
              className="font-mono text-xs"
              placeholder="The address, file or scan you want checked"
              value={form.flagged_item}
              onChange={(e) => setForm((prev) => ({ ...prev, flagged_item: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-mono text-xs">What you noticed</Label>
            <Textarea
              className="font-mono text-xs"
              rows={4}
              placeholder="Anything that helps: when it appeared, what you were doing, what it looked like"
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
            Submit for a Device Check
          </Button>
        </div>
      </div>

      <SubmissionList tier="device_check" />
    </div>
  );
}
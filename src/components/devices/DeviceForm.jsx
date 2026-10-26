import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DEVICE_TYPES } from '@/lib/scanLabels';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function DeviceForm({ device, userId, onDone, onCancel }) {
  const [name, setName] = useState(device?.device_name || '');
  const [type, setType] = useState(device?.device_type || 'android');
  const [note, setNote] = useState(device?.description || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    const clean = name.trim();
    if (!clean) {
      setError('Give the device a name you will recognise, such as "My phone" or "Work laptop".');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = { device_name: clean.slice(0, 60), device_type: type, description: note.trim().slice(0, 1000) };
      if (device?.id) {
        await base44.entities.Device.update(device.id, payload);
      } else {
        await base44.entities.Device.create({ ...payload, user_id: userId, status: 'active' });
      }
      toast.success(device?.id ? 'Device updated.' : 'Device added.');
      onDone?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'That did not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-heading text-sm font-bold">{device?.id ? 'Edit this device' : 'Add a device'}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        A name and the kind of device are enough. This is your own list, and nobody else can see it.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="device-name" className="font-mono text-xs">Name</Label>
          <Input
            id="device-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="My phone"
            maxLength={60}
          />
        </div>
        <div className="space-y-2">
          <Label className="font-mono text-xs">What it is</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEVICE_TYPES.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Label htmlFor="device-note" className="font-mono text-xs">Note (optional)</Label>
        <Textarea
          id="device-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Who uses it, or anything you want to remember about it"
        />
      </div>

      {error && <p className="mt-3 font-mono text-xs text-destructive">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={save} disabled={busy} className="gap-2 font-mono text-xs">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {device?.id ? 'Save changes' : 'Add device'}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={busy} className="font-mono text-xs">
          Cancel
        </Button>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HardDrive, Loader2, Monitor, Pencil, ScanLine, Smartphone, Tablet, Trash2 } from 'lucide-react';
import { deviceTypeLabel, formatWhen, verdictOf, VERDICTS, scanTypeLabel } from '@/lib/scanLabels';
import { toast } from 'sonner';

const ICONS = { android: Smartphone, ios: Smartphone, tablet: Tablet, desktop: Monitor, other: HardDrive };

export default function DeviceCard({ device, onEdit, onChanged }) {
  const [removing, setRemoving] = useState(false);
  const Icon = ICONS[device.device_type] || HardDrive;

  // This device's own checks: a count for the headline and the last few for
  // the list underneath, both counted on the server.
  const { data } = useQuery({
    queryKey: ['device-checks', device.id],
    queryFn: async () => {
      const [count, page] = await Promise.all([
        base44.entities.ScanSession.count({ device_id: device.id }),
        base44.entities.ScanSession.filter({ device_id: device.id }, { sort: '-created_date', limit: 4 })
      ]);
      return { count: Number(count || 0), recent: page.items || [] };
    },
    initialData: { count: 0, recent: [] }
  });

  const remove = async () => {
    if (!window.confirm(`Remove "${device.device_name}" from your devices? Your saved checks stay in your history.`)) return;
    setRemoving(true);
    try {
      await base44.entities.Device.delete(device.id);
      toast.success('Device removed.');
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'That did not remove. Try again.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
          <div>
            <h3 className="font-heading text-sm font-bold">{device.device_name}</h3>
            <p className="font-mono text-[11px] text-muted-foreground">
              {deviceTypeLabel(device.device_type)} · added {formatWhen(device.created_date)}
            </p>
            {device.description && <p className="mt-2 text-xs text-muted-foreground">{device.description}</p>}
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => onEdit(device)} aria-label="Edit this device">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={remove} disabled={removing} aria-label="Remove this device">
            {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
        <span>
          {data.count === 0 ? 'No checks filed against it yet' : `${data.count} check${data.count === 1 ? '' : 's'}`}
        </span>
        <span>·</span>
        <span>last check {formatWhen(device.last_seen)}</span>
      </div>

      {data.recent.length > 0 && (
        <ul className="mt-3 space-y-2">
          {data.recent.map((check) => (
            <li key={check.id}>
              <Link
                to={`/check/${check.id}`}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0 hover:text-foreground"
              >
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  {scanTypeLabel(check.scan_type)} · {check.input_value || 'no value saved'}
                </span>
                <Badge variant={VERDICTS[verdictOf(check)].badge} className="font-mono text-[10px]">
                  {VERDICTS[verdictOf(check)].label}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link to={`/scan?device=${device.id}`} className="mt-4 inline-flex items-center gap-2 font-mono text-xs text-primary hover:underline">
        <ScanLine className="h-3.5 w-3.5" /> Check something for this device
      </Link>
    </div>
  );
}
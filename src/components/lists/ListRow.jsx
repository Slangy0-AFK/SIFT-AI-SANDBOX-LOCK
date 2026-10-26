import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2 } from 'lucide-react';
import { formatWhen, listTypeLabel } from '@/lib/scanLabels';
import { toast } from 'sonner';

export default function ListRow({ entry, onRemoved }) {
  const [removing, setRemoving] = useState(false);

  const remove = async () => {
    setRemoving(true);
    try {
      await base44.entities.ListEntry.delete(entry.id);
      toast.success('Removed from the list.');
      onRemoved?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'That did not remove. Try again.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <li className="flex items-start justify-between gap-3 border-b border-border/60 py-3 last:border-0">
      <div className="min-w-0">
        <p className="truncate font-mono text-xs text-foreground">{entry.value}</p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {listTypeLabel(entry.item_type)} · added {formatWhen(entry.created_date)}
        </p>
        {entry.note && <p className="mt-1 text-xs text-muted-foreground">{entry.note}</p>}
        {Number(entry.hits || 0) > 0 && (
          <Badge variant="secondary" className="mt-2 font-mono text-[10px]">
            changed {entry.hits} check{Number(entry.hits) === 1 ? '' : 's'}
          </Badge>
        )}
      </div>
      <Button size="icon" variant="ghost" onClick={remove} disabled={removing} aria-label={`Remove ${entry.value}`}>
        {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </Button>
    </li>
  );
}
import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import { formatWhen, scanTypeLabel, VERDICTS, verdictOf } from '@/lib/scanLabels';

export default function HistoryRow({ check }) {
  const verdict = verdictOf(check);
  const style = VERDICTS[verdict];
  const listNote = check.list_effect === 'block' ? 'your blocklist' : check.list_effect === 'allow' ? 'your allowlist' : '';

  return (
    <li className="border-b border-border/60 last:border-0">
      <Link to={`/check/${check.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-foreground">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-foreground">{check.input_value || 'no value saved'}</p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {formatWhen(check.created_date)} · {scanTypeLabel(check.scan_type)}
            {check.device_name ? ` · ${check.device_name}` : ''}
            {listNote ? ` · set by ${listNote}` : ''}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Badge variant={style.badge} className="font-mono text-[10px]">
            {style.label}
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </Link>
    </li>
  );
}
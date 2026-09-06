import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { formatLocalTime } from '@/lib/utils';

export default function ApiKeyRow({ apiKey, onRevoke }) {
  const copy = (value) => {
    navigator.clipboard.writeText(value);
    toast.success('Copied');
  };
  const revoked = apiKey.status === 'revoked';

  return (
    <div className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 ${revoked ? 'opacity-50' : ''}`}>
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground">{apiKey.name}</span>
          <Badge variant="outline" className={`text-xs ${revoked ? 'text-destructive border-destructive/30' : 'text-green-500 border-green-500/30'}`}>
            {apiKey.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <span className="truncate">Site key: {apiKey.site_key}</span>
          <button onClick={() => copy(apiKey.site_key)} className="hover:text-foreground"><Copy className="w-3 h-3" /></button>
        </div>
        <div className="text-xs font-mono text-muted-foreground">Secret: {apiKey.secret_prefix}…</div>
        <div className="text-xs text-muted-foreground">
          {apiKey.verify_count || 0} verifications · {apiKey.scan_count || 0} scans
          {apiKey.last_used && ` · last used ${formatLocalTime(apiKey.last_used)}`}
          {apiKey.allowed_domains && ` · domains: ${apiKey.allowed_domains}`}
        </div>
      </div>
      {!revoked && (
        <Button size="sm" variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => onRevoke(apiKey.id)}>
          <Ban className="w-3 h-3" /> Revoke
        </Button>
      )}
    </div>
  );
}
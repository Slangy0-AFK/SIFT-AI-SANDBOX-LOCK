import React, { useState } from 'react';
import { Copy, Download, Eye, EyeOff, RefreshCw, Ban, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { downloadLicenseFile } from '@/lib/licenseFile';
import { formatChicagoTime } from '@/lib/utils';

// The buyer's key: masked until they ask to see it, copyable, downloadable, and
// replaceable. The full key only ever comes from the server for this account.
export default function LicenseKeyCard({ license, onRevoke, onRegenerate, busy = false }) {
  const [shown, setShown] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const key = license.key || '';
  const usable = Boolean(key);

  const copy = async () => {
    if (!usable) {
      toast.error('There is no working key to copy. Issue a new one first.');
      return;
    }
    try {
      await navigator.clipboard.writeText(key);
      toast.success('License key copied.');
    } catch (error) {
      toast.error('Copying was blocked. Reveal the key and select it instead.');
    }
  };

  const download = () => {
    if (!usable) {
      toast.error('There is no working key to download. Issue a new one first.');
      return;
    }
    downloadLicenseFile(license, key);
    toast.success('License file downloaded.');
  };

  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-heading text-xs uppercase tracking-widest text-primary">License key</p>
        <span className="text-xs text-muted-foreground">
          {license.activations > 0 ? 'Activated once, in the one setup that used it' : 'Not activated yet'}
        </span>
      </div>

      <p className="mt-3 break-all font-mono text-sm font-bold text-foreground">
        {shown && usable ? key : license.masked_key}
      </p>

      <p className="mt-2 text-xs text-muted-foreground">
        {license.model_name
          ? `Locked to ${license.model_name}${license.deployment_id ? ` · ${license.deployment_id}` : ''}`
          : 'Not locked yet. It locks to the first model that activates it, and cannot be moved after that.'}
      </p>

      {usable && license.expires_at && (
        <p className="mt-2 text-xs text-muted-foreground">
          Works until {formatChicagoTime(license.expires_at)}.
        </p>
      )}

      {!usable && (
        <p className="mt-2 text-xs text-muted-foreground">
          {license.status === 'revoked'
            ? 'Revoked for good. This key never works again and is never bound to another model.'
            : 'This key no longer works. A replacement keeps the same model binding, and the key it replaces stays dead.'}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {usable && (
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-xs"
            onClick={() => setShown((value) => !value)}
          >
            {shown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {shown ? 'Hide' : 'Reveal'}
          </Button>
        )}
        <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={copy} disabled={!usable}>
          <Copy className="h-3.5 w-3.5" /> Copy
        </Button>
        <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={download} disabled={!usable}>
          <Download className="h-3.5 w-3.5" /> Download
        </Button>
        {onRegenerate && license.status !== 'revoked' && (
          <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={onRegenerate} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Replace a lost key
          </Button>
        )}
      </div>

      {onRegenerate && license.status !== 'revoked' && (
        <p className="mt-2 text-xs text-muted-foreground">
          A replacement is for a lost key only. The old key stops working, and the new one stays locked to the same model
          {license.model_name ? ` (${license.model_name})` : ''}. It can never be moved to another one.
        </p>
      )}

      {onRevoke && usable && (
        <div className="mt-3 border-t border-border pt-3">
          {confirming ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-muted-foreground">
                Revoking ends this key forever. It cannot be moved to another model.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="border-destructive/40 text-xs text-destructive"
                onClick={() => {
                  setConfirming(false);
                  onRevoke();
                }}
                disabled={busy}
              >
                Yes, revoke it
              </Button>
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setConfirming(false)}>
                Keep it
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="flex items-center gap-2 text-xs text-muted-foreground underline underline-offset-4 hover:text-destructive"
            >
              <Ban className="h-3.5 w-3.5" /> Revoke this key permanently
            </button>
          )}
        </div>
      )}
    </div>
  );
}
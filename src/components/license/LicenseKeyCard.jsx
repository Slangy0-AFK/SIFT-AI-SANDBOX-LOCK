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

      {usable && license.expires_at && (
        <p className="mt-2 text-xs text-muted-foreground">
          Works until {formatChicagoTime(license.expires_at)}.
        </p>
      )}

      {!usable && (
        <p className="mt-2 text-xs text-muted-foreground">
          This key no longer works. Issue a new one and the old key stays dead.
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
        {onRegenerate && (
          <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={onRegenerate} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Issue a new key
          </Button>
        )}
      </div>

      {onRevoke && usable && (
        <div className="mt-3 border-t border-border pt-3">
          {confirming ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-muted-foreground">
                Revoke this key? It stops working immediately, everywhere.
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
              <Ban className="h-3.5 w-3.5" /> Lost or shared the key? Revoke it
            </button>
          )}
        </div>
      )}
    </div>
  );
}
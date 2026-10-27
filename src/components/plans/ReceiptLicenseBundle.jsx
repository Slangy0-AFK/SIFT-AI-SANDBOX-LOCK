import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import useMyLicense from '@/hooks/useMyLicense';
import { bundleOffered, downloadLicenseBundle } from '@/lib/licenseBundle';

// The same single zip, offered the moment the payment is confirmed. It is shown
// only to the account that owns this order, so a shared receipt link can never
// hand over anyone else's key.
export default function ReceiptLicenseBundle({ orderNumber }) {
  const { data, isLoading } = useMyLicense();
  const [packing, setPacking] = useState(false);

  const mine =
    data?.has_license === true &&
    Boolean(orderNumber) &&
    data.order_number === orderNumber &&
    bundleOffered(data);

  const download = async () => {
    setPacking(true);
    try {
      await downloadLicenseBundle(data);
      toast.success('Your zip is downloading: the license file, the plug-in code, setup, terms and the checklist.');
    } catch (error) {
      toast.error('The zip could not be put together, so nothing was downloaded. Try again.');
    } finally {
      setPacking(false);
    }
  };

  if (isLoading) {
    return (
      <p className="mt-3 flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Looking for your copy…
      </p>
    );
  }

  if (!mine) {
    return (
      <p className="mt-3 font-mono text-xs leading-relaxed text-muted-foreground">
        The whole set — the license file, the plug-in code, the setup instructions, the terms and the test checklist — downloads as
        one zip from{' '}
        <Link to="/settings" className="text-primary underline underline-offset-4">
          Settings &gt; My License
        </Link>
        , under the account that owns this order.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <Button size="sm" className="gap-2 font-mono text-xs" onClick={download} disabled={packing}>
        {packing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        Download everything (.zip)
      </Button>
      <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
        The license file, the plug-in code, the setup instructions, the terms and the test checklist — one zip, nothing separate.
      </p>
    </div>
  );
}
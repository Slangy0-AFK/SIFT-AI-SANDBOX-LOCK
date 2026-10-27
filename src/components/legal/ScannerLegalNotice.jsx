import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

// The plain-language warnings that belong on the scan and results pages. SIFT AI
// is a checker, not an antivirus, and none of this is a promise about a device.
export default function ScannerLegalNotice() {
  return (
    <div className="rounded-xl border border-border bg-secondary/10 p-4">
      <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        <ShieldAlert className="h-3.5 w-3.5" /> Read this before you rely on a result
      </p>
      <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
        <li>
          · SIFT AI is not an antivirus and not a substitute for one. Keep your own antivirus and your device updates in place.
        </li>
        <li>
          · SIFT AI does not guarantee that a device is clean or safe. A result is an indicator only, and an indicator can be wrong.
        </li>
        <li>
          · Do not upload confidential, personal or work files to VirusTotal. If you check an item there yourself, prefer a hash
          look-up. SIFT AI uploads nothing to it for you.
        </li>
        <li>
          · Only check your own device, or an item you had permission to check. Do not check someone else&apos;s device without their
          permission.
        </li>
      </ul>
      <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
        What VirusTotal and OTX are, what SIFT AI stores, and your consent: see the{' '}
        <Link to="/compliance" className="text-primary hover:underline">
          Compliance &amp; legal notes
        </Link>
        .
      </p>
    </div>
  );
}
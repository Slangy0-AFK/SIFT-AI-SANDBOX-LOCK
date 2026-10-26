import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { VT_MANUAL_HINT, VT_MANUAL_URL, VT_UNAVAILABLE } from '@/lib/virusTotalNotice';

// Shown wherever a VirusTotal check used to be. It carries the approved wording,
// one plain link out to virustotal.com for a manual look-up, and nothing else:
// nothing is uploaded to VirusTotal from here.
export default function VirusTotalNotice({ compact = false }) {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
      <p className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wide text-amber-400">
        <AlertTriangle className="h-3.5 w-3.5" /> VirusTotal checks are switched off
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground">{VT_UNAVAILABLE}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        You can still look an item up yourself on{' '}
        <a
          href={VT_MANUAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          virustotal.com <ExternalLink className="h-3 w-3" />
        </a>
        . {VT_MANUAL_HINT}
      </p>
      {!compact && (
        <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
          Your own checks, your lists, your devices, and a Device Check are unaffected. More detail:{' '}
          <Link to="/compliance" className="text-primary hover:underline">
            Compliance &amp; legal notes
          </Link>
          .
        </p>
      )}
    </div>
  );
}
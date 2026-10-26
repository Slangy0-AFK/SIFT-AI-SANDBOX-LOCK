import React from 'react';
import VirusTotalNotice from '@/components/scanner/VirusTotalNotice';

// This panel used to run VirusTotal lookups. VirusTotal is switched off across the
// whole app, so the panel now says so in place and offers the manual route instead
// of a check that must not be offered.
export default function VirusTotalScanner() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-heading text-lg font-bold tracking-tight">VirusTotal threat intelligence</h2>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">Switched off in this app.</p>
      <div className="mt-4">
        <VirusTotalNotice />
      </div>
    </div>
  );
}
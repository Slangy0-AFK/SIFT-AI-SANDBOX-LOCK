import React from 'react';

// This panel used to run VirusTotal lookups. VirusTotal is switched off across the
// whole app, so the panel says so in place of a check that must not be offered.
export default function VirusTotalScanner() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-heading text-lg font-bold tracking-tight">VirusTotal threat intelligence</h2>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">Switched off in this app.</p>
    </div>
  );
}
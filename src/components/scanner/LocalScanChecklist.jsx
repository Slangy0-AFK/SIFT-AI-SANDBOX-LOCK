import React from 'react';
import { Link } from 'react-router-dom';

// The interim file check. SIFT AI cannot run an antivirus engine for you: its
// backend has no access to system programs, so ClamAV and anything like it is not
// run here, and no antivirus result is ever shown. Until a separate ClamAV service
// exists, this is what a person does on their own machine.
const STEPS = [
  'Do not open or run the file while you are deciding about it. Keep it where it is.',
  'Get the file’s SHA-256 hash on your own machine: on Windows run "certutil -hashfile FILE SHA256", on a Mac or Linux run "shasum -a 256 FILE". Paste that hash into the check above — a hash can be looked up without handing over the file itself.',
  'Run your own antivirus on the file, and make sure it is up to date. That result is your antivirus’s, not SIFT AI’s.',
  'If it is an app rather than a file: check the store listing, the publisher, the permissions it asks for, and whether the reviews describe what you are seeing.',
  'If it arrived unasked, or it started on its own, or you did not install it: remove it, then change the passwords you used on that device, starting with email.',
  'If it asks you to turn off your antivirus, or to allow installs from unknown sources, treat that as a warning on its own.'
];

export default function LocalScanChecklist() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground">Local scan checklist (run it yourself)</p>
      <p className="mt-2 text-sm text-muted-foreground">
        SIFT AI runs in a managed sandbox with no access to system programs, so ClamAV and other antivirus engines cannot run inside it.
        No ClamAV result is produced here, and none is ever invented. This is the interim file check until a separate ClamAV service is
        added.
      </p>
      <ol className="mt-4 space-y-2">
        {STEPS.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm text-muted-foreground">
            <span className="font-mono text-xs text-primary">{index + 1}.</span>
            <span className="leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
        More detail on each source and on ClamAV:{' '}
        <Link to="/sources" className="text-primary hover:underline">
          Where these checks come from
        </Link>
        .
      </p>
    </div>
  );
}
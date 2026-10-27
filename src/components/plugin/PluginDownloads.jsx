import React from 'react';
import { Download, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ENDPOINT = 'https://siftai.base44.app/functions/validateLicense';

const FILES = [
  {
    href: '/plugin/sift-guard.js',
    name: 'sift-guard.js',
    note: 'JavaScript — Node 18+, or any runtime with fetch',
    lead: true
  },
  {
    href: '/plugin/sift_guard.py',
    name: 'sift_guard.py',
    note: 'Python 3.7+ — standard library only',
    lead: false
  }
];

const READS = [
  ['SIFT_LICENSE_KEY', 'Your SIFT AI license key. The only one you have to set.'],
  ['SIFT_KILL_SWITCH', 'Optional. On, or unreadable, stops everything before anything else runs.'],
  ['SIFT_AUDIT_LOG', 'Optional. Where the audit entries are written. Defaults to ./sift-guard-audit.log.']
];

// The two files, and what each one needs from the customer's own environment.
export default function PluginDownloads() {
  return (
    <section className="rounded-2xl border border-primary/30 bg-card p-6 sm:p-8">
      <h2 className="font-heading text-lg font-semibold">Get the integration code</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        One file, no dependencies, nothing to install. Both files carry a worked example at the top of the file.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {FILES.map((file) => (
          <div key={file.name} className="rounded-xl border border-border bg-background/60 p-4">
            <p className="font-mono text-sm font-bold text-foreground">{file.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{file.note}</p>
            <a href={file.href} download>
              <Button size="sm" variant={file.lead ? 'default' : 'outline'} className="mt-3 gap-2 text-xs">
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            </a>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-border bg-background/60 p-4">
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-muted-foreground">
          <Lock className="h-3.5 w-3.5 text-primary" /> What leaves your product
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Only the SHA-256 of your key, to this one endpoint. No message, no prompt, no model data and no personal data is ever sent
          with it, and the key itself stays in your own configuration.
        </p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-foreground">
{`POST ${ENDPOINT}
{ "key_hash": "<sha-256 of your license key>" }`}
        </pre>
      </div>

      <dl className="mt-5 space-y-2">
        {READS.map(([name, note]) => (
          <div key={name} className="flex flex-col gap-1 sm:flex-row sm:gap-3">
            <dt className="font-mono text-xs font-bold text-foreground sm:w-48 sm:flex-shrink-0">{name}</dt>
            <dd className="text-xs leading-relaxed text-muted-foreground">{note}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
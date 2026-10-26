import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, AlertTriangle } from 'lucide-react';
import { CLAMAV, COMMERCIAL_LABELS, SOURCE_CATALOG, WORDING_RULES } from '@/lib/sourceCatalog';

// Where the checks come from: every source named, what it covers, its terms, and
// whether its licence position for commercial use is actually settled. An open
// flag here means SIFT AI does not claim that source is commercial-safe.
function Flag({ status }) {
  const tone =
    status === 'ok'
      ? 'border-emerald-400/40 text-emerald-400'
      : status === 'restricted'
        ? 'border-amber-500/40 text-amber-400'
        : 'border-border text-muted-foreground';
  return <span className={`rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${tone}`}>{COMMERCIAL_LABELS[status]}</span>;
}

export default function Sources() {
  useEffect(() => {
    document.title = 'Where the checks come from · SIFT AI';
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-12">
        <Link to="/scan" className="inline-flex items-center gap-2 font-mono text-xs text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to the scanner
        </Link>

        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Where the checks come from</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The open sources behind a check, and the terms position for each one. Nothing here is claimed to be commercial-safe
            until its terms are checked and settled.
          </p>
        </div>

        <section className="space-y-3 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-heading text-lg font-bold tracking-tight">The feeds</h2>
          <ul className="space-y-5">
            {SOURCE_CATALOG.map((source) => (
              <li key={source.id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold text-foreground">{source.name}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{source.operator}</span>
                  <Flag status={source.commercial} />
                </div>
                <p className="text-sm text-muted-foreground">{source.covers}</p>
                <p className="text-sm text-muted-foreground">{source.commercial_note}</p>
                <a
                  href={source.site}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
                >
                  {source.name} site and terms <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight">
            <AlertTriangle className="h-4 w-4 text-amber-400" /> ClamAV cannot run inside SIFT AI
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{CLAMAV.covers}{' '}</p>
          <p className="text-sm leading-relaxed text-foreground">
            SIFT AI’s backend runs in a managed sandbox with no access to system programs, so an antivirus engine such as ClamAV cannot
            run here. No ClamAV result is produced by SIFT AI, and none is ever faked.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Until then, a file is checked by its hash against the feeds above, together with the local scan checklist you run yourself on
            your own machine. A small separate ClamAV service is the next step after launch; it is not built yet.
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {CLAMAV.name} · {CLAMAV.licence} · {COMMERCIAL_LABELS[CLAMAV.commercial]}
          </p>
          <a
            href={CLAMAV.site}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
          >
            ClamAV site and licence <ExternalLink className="h-3 w-3" />
          </a>
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-heading text-lg font-bold tracking-tight">How a verdict is worded</h2>
          <ul className="space-y-2">
            {WORDING_RULES.map((rule) => (
              <li key={rule} className="text-sm text-muted-foreground">
                · {rule}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            SIFT AI is not an antivirus, is not a substitute for one, and does not guarantee that a device is clean. Feed data can be
            wrong, out of date or incomplete. Your own antivirus stays the antivirus.
          </p>
        </section>

        <p className="font-mono text-[11px] text-muted-foreground">
          More:{' '}
          <Link to="/compliance" className="text-primary hover:underline">
            Compliance &amp; legal notes
          </Link>
          {' '}·{' '}
          <Link to="/support" className="text-primary hover:underline">
            Support
          </Link>
        </p>
      </main>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ScanLine } from 'lucide-react';
import HelperAgent from '@/components/scanner/HelperAgent';
import ScannerLegalNotice from '@/components/legal/ScannerLegalNotice';
import OpenSourceResults from '@/components/scanner/OpenSourceResults';
import { formatWhen, scanTypeLabel, VERDICTS, verdictOf } from '@/lib/scanLabels';

function parseResult(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function CheckDetail() {
  const { id } = useParams();
  const [check, setCheck] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'A saved check · SIFT AI';
  }, []);

  useEffect(() => {
    let alive = true;
    base44.entities.ScanSession
      .get(id)
      .then((record) => alive && setCheck(record || null))
      .catch(() => alive && setCheck(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  // A real 404 for crawlers, but only once the lookup has actually finished.
  useEffect(() => {
    if (loading || check) return;
    const meta = document.createElement('meta');
    meta.name = 'prerender-status-code';
    meta.content = '404';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [loading, check]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="mx-auto max-w-3xl px-4 py-16">
          <p className="font-mono text-xs text-muted-foreground">LOADING THIS CHECK…</p>
        </main>
      </div>
    );
  }

  if (!check) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="mx-auto max-w-3xl space-y-5 px-4 py-16">
          <h1 className="font-heading text-xl font-bold">We could not find that check</h1>
          <p className="text-sm text-muted-foreground">
            It may have been removed, or it belongs to a different account. Your own checks are all on your history page.
          </p>
          <Link to="/history">
            <Button variant="outline" className="gap-2 font-mono text-xs">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to your checks
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  const verdict = verdictOf(check);
  const style = VERDICTS[verdict];
  const result = parseResult(check.result);
  const withdrawnVt = String(check.scan_type || '').startsWith('virustotal_');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl space-y-7 px-4 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/history" className="inline-flex items-center gap-2 font-mono text-xs text-primary hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> All your checks
          </Link>
          <Badge variant={style.badge} className="font-mono text-[10px]">
            {style.label}
          </Badge>
        </div>

        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">{check.input_value || 'Saved check'}</h1>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
            {scanTypeLabel(check.scan_type)} · {formatWhen(check.created_date)}
            {check.device_name ? ` · ${check.device_name}` : ''}
          </p>
        </div>

        {withdrawnVt && (
          <>
            <p className="font-mono text-xs leading-relaxed text-muted-foreground">
              This record is from before VirusTotal checks were switched off here, so it is shown for your records only. No VirusTotal
              result is kept for it any more.
            </p>
          </>
        )}

        {(check.list_effect === 'block' || check.list_effect === 'allow') && (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
            <p className="font-mono text-xs font-bold text-primary">YOUR OWN LIST SET THIS ANSWER</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {check.list_effect === 'block'
                ? 'You had put this item on your blocklist, so it comes back flagged.'
                : 'You had put this item on your allowlist, so your list treats it as approved.'}{' '}
              Remove it from the list and the check goes back to what the outside checkers say. You can change that on the{' '}
              <Link to="/allow-block" className="text-primary hover:underline">
                Allowlist &amp; Blocklist
              </Link>{' '}
              page.
            </p>
          </div>
        )}

        <div className={`rounded-2xl border bg-secondary/20 p-5 ${style.tone}`}>
          <p className="font-mono text-xs uppercase tracking-wide">{style.label}</p>
          <p className="mt-3 text-sm font-semibold text-foreground">{result?.headline || 'The headline was not saved for this one.'}</p>
          {result?.lines?.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {result.lines.map((line) => (
                <li key={line} className="text-sm text-muted-foreground">
                  · {line}
                </li>
              ))}
            </ul>
          )}
          {result?.next && <p className="mt-4 text-sm text-foreground">{result.next}</p>}
        </div>

        {result?.sources?.length > 0 && (
          <OpenSourceResults sources={result.sources} value={check.input_value} showVerdict={false} />
        )}

        {check.error_message && <p className="font-mono text-xs text-destructive">{check.error_message}</p>}

        <ScannerLegalNotice />

        <div className="flex flex-wrap gap-3">
          <Link to="/scan">
            <Button className="gap-2 font-mono text-xs">
              <ScanLine className="h-3.5 w-3.5" /> Check something else
            </Button>
          </Link>
          <Link to="/allow-block">
            <Button variant="outline" className="font-mono text-xs">
              Allow or block it
            </Button>
          </Link>
        </div>
      </main>

      <HelperAgent page="A saved check (/check)" />
    </div>
  );
}
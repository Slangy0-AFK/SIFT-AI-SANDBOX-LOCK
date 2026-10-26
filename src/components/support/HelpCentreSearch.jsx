import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, Loader2, Search, Wrench } from 'lucide-react';
import { VT_MANUAL_URL } from '@/lib/virusTotalNotice';

// A fix step that names virustotal.com gets a real link, so the manual route is one
// tap away. Nothing here sends anything to VirusTotal.
function StepText({ step }) {
  if (!step.includes(VT_MANUAL_URL)) return <>{step}</>;
  const [before, after] = step.split(VT_MANUAL_URL);
  return (
    <>
      {before}
      <a href={VT_MANUAL_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
        virustotal.com
      </a>
      {after}
    </>
  );
}

// The searchable help centre. It answers from the same articles the in-app helper,
// the automatic ticket reply and the support agent use, and it costs nothing: the
// search runs on the server as plain text matching, with no model and no outside
// service.
export default function HelpCentreSearch() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (value) => {
    setBusy(true);
    setError('');
    try {
      const { data: result } = await base44.functions.invoke('supportAutomation', { action: 'search', query: value });
      setData(result);
    } catch (err) {
      setError('The help centre is not answering right now. Try again, or open a ticket below.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    run('');
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">Help centre</h2>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Search the SIFT AI help articles for the everyday questions: what a verdict means, what to do about a flagged item, what a
        browser can and cannot check, permissions, paying and unlocking, and your own data.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') run(query);
          }}
          placeholder="For example: flagged app, unlock, permissions"
          className="text-sm"
        />
        <Button className="gap-2 font-mono text-xs sm:w-auto" onClick={() => run(query)} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          Search
        </Button>
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      {data && (
        <div className="mt-5 space-y-3">
          {!data.matched_your_words && (
            <p className="font-mono text-[11px] text-muted-foreground">Nothing matched those exact words, so here is what people ask about most.</p>
          )}
          {data.results?.map((article) => (
            <div key={article.title} className="rounded-xl border border-border bg-secondary/10 p-4">
              <p className="font-mono text-xs font-bold text-foreground">{article.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{article.text}</p>
              {!!article.fix_steps?.length && (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
                    <Wrench className="h-3 w-3" /> Likely fix steps
                  </p>
                  <ul className="mt-2 space-y-1">
                    {article.fix_steps.map((step) => (
                      <li key={step} className="font-mono text-xs text-foreground">
                        <StepText step={step} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
          <p className="font-mono text-[11px] text-muted-foreground">
            Still stuck? Use the ticket form at the top of this page, or the Help / Ask button in the corner.
          </p>
        </div>
      )}
    </section>
  );
}
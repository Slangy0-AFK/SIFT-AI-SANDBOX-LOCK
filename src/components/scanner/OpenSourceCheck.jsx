import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Loader2, ScanLine } from 'lucide-react';
import OpenSourceResults from '@/components/scanner/OpenSourceResults';
import RogueAiChecklist from '@/components/scanner/RogueAiChecklist';
import LocalScanChecklist from '@/components/scanner/LocalScanChecklist';
import { applyList } from '@/lib/listVerdict';

export default function OpenSourceCheck({ isAuthed, devices = [], deviceId = '' }) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [savedId, setSavedId] = useState('');
  const [checklist, setChecklist] = useState({ hit: false, score: 0, marked: [] });

  const run = async () => {
    const value = input.trim();
    setError('');
    if (!value) {
      setError('Paste the link, domain, IP address or file hash first.');
      return;
    }
    if (!isAuthed) {
      setError('Create the free account first (the buttons above), then the check runs and your history stays yours.');
      return;
    }

    setBusy(true);
    setResult(null);
    setSavedId('');
    try {
      const { data } = await base44.functions.invoke('openSourceScan', { value, checklistHit: checklist.hit });
      if (data?.error) throw new Error(data.error);

      let verdict = data.verdict;

      // The person's own lists decide the final answer on their account. The exact
      // item is passed as the value so an allowlist entry for it can match, and as
      // text so a blocked entry is caught too. If the list check cannot run, the
      // feed result stands on its own.
      const listHit = await base44.functions
        .invoke('scannerHelper', { action: 'list_check', value, text: value })
        .then((res) => res.data || null)
        .catch(() => null);
      if (listHit?.match) verdict = applyList(verdict, listHit);

      setResult({ ...data, verdict });

      const me = await base44.auth.me().catch(() => null);
      if (me?.id) {
        const chosen = devices.find((device) => device.id === deviceId) || null;
        const threatLevel = verdict.level === 'flagged' ? 'high' : verdict.level === 'unknown' ? 'warning' : 'safe';
        const saved = await base44.entities.ScanSession.create({
          user_id: me.id,
          scan_type: 'open_source',
          status: 'complete',
          input_value: String(data.value || value).slice(0, 300),
          result: JSON.stringify({
            headline: verdict.headline,
            lines: verdict.lines,
            next: verdict.next,
            list: verdict.list || null,
            kind: data.kind,
            sources: data.sources
          }).slice(0, 4000),
          threat_level: threatLevel,
          is_threat: verdict.level === 'flagged',
          list_effect: verdict.list ? verdict.list.kind : '',
          device_id: chosen?.id || '',
          device_name: chosen?.device_name || ''
        });
        setSavedId(saved?.id || '');
        if (chosen) {
          await base44.entities.Device.update(chosen.id, { last_seen: new Date().toISOString() }).catch(() => {});
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'The check did not finish.');
    } finally {
      setBusy(false);
    }
  };

  const chosenDevice = devices.find((device) => device.id === deviceId) || null;

  return (
    <div className="space-y-5">
      <div>
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={2}
          placeholder="Paste a link, a domain, an IP address or a file hash (SHA-256)"
          className="font-mono text-xs"
        />
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          Only the item itself is looked up. Nothing is uploaded and no file leaves your machine.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={run} disabled={busy} className="gap-2 font-mono text-xs">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanLine className="h-3.5 w-3.5" />}
          {busy ? 'Checking the feeds…' : 'Check it against the feeds'}
        </Button>
        {chosenDevice && <span className="font-mono text-[11px] text-muted-foreground">Saved to {chosenDevice.device_name}</span>}
        {!isAuthed && (
          <span className="font-mono text-[11px] text-muted-foreground">Free, and it needs an account so the history stays yours.</span>
        )}
      </div>

      {error && <p className="font-mono text-xs text-destructive">{error}</p>}

      {result && (
        <div className="space-y-3">
          <OpenSourceResults value={result.value} sources={result.sources} verdict={result.verdict} />
          {savedId && (
            <Link
              to={`/check/${savedId}`}
              className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
            >
              Open the saved record <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}

      <RogueAiChecklist onChange={setChecklist} />
      <LocalScanChecklist />
    </div>
  );
}
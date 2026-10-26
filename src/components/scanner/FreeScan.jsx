import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Loader2, ScanLine, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';

const MODES = [
  { id: 'item', label: 'A link, domain or file hash' },
  { id: 'text', label: 'A message or an email' }
];

const NO_DEVICE = 'none';

const VERDICT_STYLES = {
  flagged: { icon: ShieldAlert, tone: 'text-destructive border-destructive/40', label: 'Flagged' },
  unknown: { icon: ShieldQuestion, tone: 'text-amber-400 border-amber-400/40', label: 'Unknown' },
  approved: { icon: ShieldCheck, tone: 'text-emerald-400 border-emerald-400/40', label: 'Approved' }
};

function classifyItem(raw) {
  const value = raw.trim();
  if (/^[a-f0-9]{32,64}$/i.test(value)) return { type: 'hash', value };
  if (/^https?:\/\//i.test(value)) return { type: 'url', value };
  const host = value.replace(/^www\./i, '');
  if (/^[^\s/]+\.[^\s/]{2,}$/.test(host)) return { type: 'domain', value: host };
  return null;
}

function itemVerdict(result) {
  if (!result || result.found === false) {
    return {
      level: 'unknown',
      headline: 'No record of this yet',
      lines: ['Nothing is on file for this item, which is not the same as it being fine. Treat it as unproven.'],
      next: 'Watch it: keep it for now and check again in a few days, or paste something else you are unsure about.'
    };
  }
  const malicious = Number(result.maliciousCount || 0);
  const suspicious = Number(result.suspiciousCount || 0);
  const scanned = Number(result.scannedBy || 0);
  if (malicious > 0 || suspicious > 0) {
    return {
      level: 'flagged',
      headline: `${malicious + suspicious} of ${scanned} checkers flagged this`,
      lines: [
        `${malicious} called it harmful and ${suspicious} called it suspicious.`,
        'The full list is on file with the check; the short version is that something is known against it.'
      ],
      next: 'Block it or remove it if you do not recognise it. If it is an app you need, open a Device Check and we will look closely.'
    };
  }
  return {
    level: 'approved',
    headline: `Nothing known against it (${scanned} checkers)`,
    lines: [
      'None of the checkers that know this item called it harmful or suspicious today.',
      'That is today, on the record we have. It is not a promise about tomorrow.'
    ],
    next: 'Allow it if you recognise it. If it asks for permissions that do not fit what it does, come back and check that too.'
  };
}

function textVerdict(analysis) {
  if (!analysis || analysis.is_scam === undefined) {
    return {
      level: 'unknown',
      headline: 'We could not reach a conclusion',
      lines: ['The check did not finish properly. Try again in a moment.'],
      next: 'If it keeps failing, open a support ticket from the Help button.'
    };
  }
  if (analysis.is_scam) {
    return {
      level: 'flagged',
      headline: `Reads like a ${String(analysis.scam_type || 'scam').replace(/_/g, ' ')} (${analysis.confidence || 0}% confidence)`,
      lines: (analysis.red_flags || []).slice(0, 5),
      next: analysis.recommendation || 'Do not reply, do not click the link, and delete the message.'
    };
  }
  return {
    level: 'approved',
    headline: 'Nothing in this matched the usual scam patterns',
    lines: ['That is not a promise that the sender is who they say they are.'],
    next: 'Reply only if you were expecting it, and never send codes, passwords or card details.'
  };
}

// The person's own allowlist and blocklist get the last word, and the result
// says so out loud either way.
function applyList(verdict, hit) {
  const note = hit.entry?.note ? ` Your note on it: ${hit.entry.note}` : '';
  if (hit.kind === 'block') {
    return {
      ...verdict,
      level: 'flagged',
      headline: 'On your blocklist',
      lines: [
        `You put ${hit.entry.value} on your blocklist, so it comes back flagged here.`,
        `The checker on its own said: ${verdict.headline}.`
      ],
      next: `Take it off the list if you have changed your mind about it.${note}`,
      list: { kind: 'block', value: hit.entry.value }
    };
  }
  return {
    ...verdict,
    level: 'approved',
    headline: 'On your allowlist',
    lines: [
      `You put ${hit.entry.value} on your allowlist, so your list treats it as approved.`,
      `The checker's own finding, stated plainly: ${verdict.headline}.`
    ],
    next: `Watch it anyway. Your list decides what happens here, not whether the item is genuinely safe.${note}`,
    list: { kind: 'allow', value: hit.entry.value }
  };
}

export default function FreeScan({ isAuthed, onSignIn }) {
  const [mode, setMode] = useState('item');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [verdict, setVerdict] = useState(null);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState('');
  const [savedId, setSavedId] = useState('');

  // The account's own devices, so a check can be filed against one. Arriving
  // from "Check something for this device" preselects that device.
  useEffect(() => {
    if (!isAuthed) return;
    const wanted = new URLSearchParams(window.location.search).get('device') || '';
    base44.entities.Device
      .filter({ status: 'active' }, { sort: '-created_date', limit: 50 })
      .then((page) => {
        const list = page.items || [];
        setDevices(list);
        if (wanted && list.some((device) => device.id === wanted)) setDeviceId(wanted);
      })
      .catch(() => {});
  }, [isAuthed]);

  const run = async () => {
    const text = input.trim();
    setError('');
    if (!text) {
      setError(mode === 'item' ? 'Paste a link, a domain or a file hash first.' : 'Paste the message or the email first.');
      return;
    }
    if (!isAuthed) {
      setError('Create the free account first (the buttons just above), then the check runs and your history stays yours.');
      return;
    }

    setBusy(true);
    setVerdict(null);
    setSavedId('');
    try {
      let next;
      let scanType;
      let listPayload;

      if (mode === 'item') {
        const item = classifyItem(text);
        if (!item) {
          setBusy(false);
          setError('That does not look like a link, a domain or a file hash. Switch to "A message or an email" if it is text.');
          return;
        }
        const { data } = await base44.functions.invoke('checkVirusTotal', { type: item.type, value: item.value });
        if (data?.error) throw new Error(data.error);
        next = { ...itemVerdict(data), item: item.value };
        scanType = `virustotal_${item.type}`;
        listPayload = { action: 'list_check', item_type: item.type, value: item.value };
      } else {
        const { data } = await base44.functions.invoke('analyzeTextThreat', { text });
        if (data?.error) throw new Error(data.error);
        next = { ...textVerdict(data), item: text.slice(0, 120) };
        scanType = 'message';
        listPayload = { action: 'list_check', item_type: 'message', text };
      }

      // The person's own lists decide the final answer on their account. If the
      // list check cannot run, the plain check result stands.
      const listHit = await base44.functions
        .invoke('scannerHelper', listPayload)
        .then((res) => res.data || null)
        .catch(() => null);
      if (listHit?.match) next = applyList(next, listHit);

      setVerdict(next);

      // Keep the history for a signed-in account. A guest sees the result but
      // has nowhere to file it, and we say so on the page.
      const me = await base44.auth.me().catch(() => null);
      if (me?.id) {
        const chosen = devices.find((device) => device.id === deviceId) || null;
        const threatLevel = next.level === 'flagged' ? 'high' : next.level === 'unknown' ? 'warning' : 'safe';
        const saved = await base44.entities.ScanSession.create({
          user_id: me.id,
          scan_type: scanType,
          status: 'complete',
          input_value: next.item.slice(0, 300),
          result: JSON.stringify({
            headline: next.headline,
            lines: next.lines,
            next: next.next,
            list: next.list || null
          }).slice(0, 4000),
          threat_level: threatLevel,
          is_threat: next.level === 'flagged',
          list_effect: next.list ? next.list.kind : '',
          device_id: chosen?.id || '',
          device_name: chosen?.device_name || ''
        });
        setSavedId(saved?.id || '');
        if (chosen) {
          await base44.entities.Device
            .update(chosen.id, { last_seen: new Date().toISOString() })
            .catch(() => {});
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'The check did not finish.');
    } finally {
      setBusy(false);
    }
  };

  const style = verdict ? VERDICT_STYLES[verdict.level] : null;
  const chosenDevice = devices.find((device) => device.id === deviceId) || null;

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap gap-2">
        {MODES.map((option) => (
          <Button
            key={option.id}
            size="sm"
            variant={mode === option.id ? 'default' : 'outline'}
            className="font-mono text-xs"
            onClick={() => {
              setMode(option.id);
              setVerdict(null);
              setError('');
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <Textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        rows={mode === 'item' ? 2 : 5}
        placeholder={
          mode === 'item'
            ? 'Paste the link, the domain or the file hash here'
            : 'Paste the message or the email here'
        }
        className="mt-4 font-mono text-xs"
      />

      {isAuthed && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">File this check under</span>
          {devices.length === 0 ? (
            <Link to="/devices" className="font-mono text-xs text-primary hover:underline">
              Add a device first →
            </Link>
          ) : (
            <Select value={deviceId || NO_DEVICE} onValueChange={(value) => setDeviceId(value === NO_DEVICE ? '' : value)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_DEVICE}>No device</SelectItem>
                {devices.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.device_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {chosenDevice && (
            <span className="font-mono text-[11px] text-muted-foreground">Saved to {chosenDevice.device_name}</span>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={run} disabled={busy} className="gap-2 font-mono text-xs">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanLine className="h-3.5 w-3.5" />}
          {busy ? 'Checking…' : 'Check it now'}
        </Button>
        <span className="font-mono text-[11px] text-muted-foreground">
          {isAuthed ? 'Saved to your own history.' : 'Free, and it needs an account so the history stays yours.'}
        </span>
      </div>

      {error && <p className="mt-4 font-mono text-xs text-destructive">{error}</p>}

      {verdict && (
        <div className={`mt-6 rounded-xl border bg-secondary/20 p-5 ${style.tone}`}>
          <div className="flex items-center gap-2">
            <style.icon className="h-4 w-4" />
            <span className="font-mono text-xs uppercase tracking-wide">{style.label}</span>
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground">{verdict.headline}</p>
          <ul className="mt-3 space-y-1.5">
            {verdict.lines.map((line) => (
              <li key={line} className="text-sm text-muted-foreground">
                · {line}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-foreground">{verdict.next}</p>
          {verdict.list && (
            <p className="mt-4 font-mono text-[11px] text-foreground">
              {verdict.list.kind === 'block'
                ? 'Your blocklist affected this answer.'
                : 'Your allowlist affected this answer.'}
            </p>
          )}
        </div>
      )}

      {verdict && (
        <div className="mt-4 flex flex-wrap items-center gap-4 font-mono text-xs">
          {savedId && (
            <Link to={`/check/${savedId}`} className="text-primary hover:underline">
              Open the saved record
            </Link>
          )}
          <Link to="/history" className="inline-flex items-center gap-1 text-primary hover:underline">
            All your checks <ArrowRight className="h-3 w-3" />
          </Link>
          <Link to="/allow-block" className="text-primary hover:underline">
            Allow or block this
          </Link>
        </div>
      )}

      {verdict?.level === 'flagged' && (
        <Link to="/plans" className="mt-4 inline-block font-mono text-xs text-primary hover:underline">
          Want a person to look at this closely? See Device Check →
        </Link>
      )}
    </div>
  );
}
import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';

const LEVELS = {
  flagged: { icon: ShieldAlert, tone: 'text-destructive border-destructive/40', label: 'Flagged' },
  unknown: { icon: ShieldQuestion, tone: 'text-amber-400 border-amber-400/40', label: 'Unknown' },
  approved: { icon: ShieldCheck, tone: 'text-emerald-400 border-emerald-400/40', label: 'Approved' }
};

const NOT_FOUND = 'Not found in these feeds';

function statusOf(source) {
  if (source.status === 'hit') {
    return { tag: 'Hit', text: source.family || source.threat || 'Listed by this feed', tone: 'text-destructive' };
  }
  if (source.status === 'none') {
    return { tag: 'No match', text: source.note || NOT_FOUND, tone: 'text-muted-foreground' };
  }
  if (source.status === 'unavailable') {
    return { tag: 'Unavailable', text: `Source unavailable — ${source.reason}`, tone: 'text-muted-foreground' };
  }
  return { tag: 'No answer', text: `This source did not answer — ${source.reason || 'no response'}`, tone: 'text-muted-foreground' };
}

// Every source shown on its own, then the combined rule. Used by the scanner and
// by a saved check, so a stored check reads exactly like a fresh one.
/**
 * @param {{
 *   sources?: Array<{ id?: string, name: string, status?: string, family?: string, threat?: string, note?: string, reason?: string, first_seen?: string, tags?: string[], detail_url?: string, operator?: string }>,
 *   verdict?: { level?: string, headline?: string, lines?: string[], next?: string },
 *   value?: string,
 *   showVerdict?: boolean
 * }} props
 */
export default function OpenSourceResults({ sources = [], verdict, value, showVerdict = true }) {
  const level = LEVELS[verdict?.level] || LEVELS.unknown;
  return (
    <div className="space-y-4">
      {showVerdict && (
        <div className={`rounded-xl border bg-secondary/20 p-5 ${level.tone}`}>
          <div className="flex items-center gap-2">
            <level.icon className="h-4 w-4" />
            <span className="font-mono text-xs uppercase tracking-wide">{level.label}</span>
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground">{verdict?.headline}</p>
          {verdict?.lines?.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {verdict.lines.filter(Boolean).map((line) => (
                <li key={line} className="text-sm text-muted-foreground">
                  · {line}
                </li>
              ))}
            </ul>
          )}
          {verdict?.next && <p className="mt-4 text-sm text-foreground">{verdict.next}</p>}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Each source on its own{value ? ` · ${value}` : ''}
        </p>
        <ul className="mt-2 divide-y divide-border">
          {sources.map((source) => {
            const line = statusOf(source);
            const stamps = [
              source.first_seen ? `first seen ${String(source.first_seen).slice(0, 10)}` : '',
              source.family ? `family ${source.family}` : '',
              (source.tags || []).length ? `tags ${source.tags.slice(0, 6).join(', ')}` : ''
            ].filter(Boolean);
            return (
              <li key={`${source.id}-${source.name}`} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">{source.name}</span>
                  <span className={`font-mono text-[11px] ${line.tone}`}>{line.tag}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{line.text}</p>
                {stamps.length > 0 && <p className="mt-1 font-mono text-[11px] text-muted-foreground">{stamps.join(' · ')}</p>}
                {source.detail_url && (
                  <a
                    href={source.detail_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
                  >
                    see it at {source.operator || source.name} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
          “Not found in these feeds” is not the same as clean. SIFT AI is not an antivirus, is not a substitute for one, and does not
          guarantee a device is clean.{' '}
          <Link to="/sources" className="text-primary hover:underline">
            Where these checks come from
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
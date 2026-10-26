import React from 'react';
import moment from 'moment';
import VerdictBadge from './VerdictBadge';

const TOOL_LABELS = {
  http_get: 'Fetch a web page',
  read_file: 'Read a file',
  db_read: 'Read a database',
  send_email: 'Send an email',
  file_write: 'Write a file',
  db_write: 'Write to a database',
  shell_command: 'Run a shell command',
  deploy: 'Deploy a change',
  payment: 'Move money',
  other: 'A tool not on the list'
};

export default function RunList({ runs, loading }) {
  if (loading) return <p className="text-sm text-muted-foreground">Loading your runs...</p>;

  if (!runs.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Nothing here yet. Run an action through the Governor Demo while logged in, and it shows up here.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {runs.map((run) => (
        <li key={run.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <VerdictBadge verdict={run.verdict} />
            <p className="text-sm font-medium">{TOOL_LABELS[run.tool] || run.tool}</p>
            {run.target && <p className="text-sm text-muted-foreground">on {run.target}</p>}
            <span className="ml-auto text-xs text-muted-foreground">
              {moment(run.created_date).format('MMM D, YYYY HH:mm')}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{run.reason}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Gate: {run.gate} · ${Number(run.amount || 0).toFixed(2)} · entry {String(run.entry_hash || '').slice(0, 12)}...
          </p>
        </li>
      ))}
    </ul>
  );
}
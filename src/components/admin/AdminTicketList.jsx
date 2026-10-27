import React from 'react';
import moment from 'moment';
import { Inbox } from 'lucide-react';

const STATUS_LABEL = {
  open: 'Open',
  waiting_on_user: 'Waiting on them',
  waiting_on_team: 'Waiting on us',
  resolved: 'Resolved',
  closed: 'Closed'
};

const PRIORITY_LABEL = {
  payment_unlock: 'Payment or unlock',
  safety_flagged: 'Flagged item',
  scan_problem: 'Scanning',
  account_login: 'Account or login',
  other: 'Other'
};

const STATUS_CLASS = {
  open: 'text-primary',
  waiting_on_user: 'text-muted-foreground',
  waiting_on_team: 'text-amber-400',
  resolved: 'text-emerald-400',
  closed: 'text-muted-foreground'
};

// The queue on the left of the console: one line per ticket, in the state the
// server returned it.
export default function AdminTicketList({ tickets, selectedId, onSelect, busy }) {
  if (!tickets?.length) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <Inbox className="h-5 w-5 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">{busy ? 'Reading the queue...' : 'Nothing in this view right now.'}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {tickets.map((ticket) => (
        <button
          key={ticket.id}
          type="button"
          onClick={() => onSelect(ticket)}
          className={`block w-full px-4 py-3 text-left transition-colors ${
            selectedId === ticket.id ? 'bg-primary/10' : 'hover:bg-secondary/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold tracking-wide">{ticket.ticket_number || 'SIFT-?'}</span>
            <span className={`font-mono text-[10px] uppercase tracking-wider ${STATUS_CLASS[ticket.status] || 'text-muted-foreground'}`}>
              {STATUS_LABEL[ticket.status] || ticket.status || 'Open'}
            </span>
            {ticket.escalated && <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400">Escalated</span>}
          </div>
          <p className="mt-1 truncate text-sm text-foreground">{ticket.title || 'Support ticket'}</p>
          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
            {PRIORITY_LABEL[ticket.priority] || 'Other'} · {ticket.requester_email || 'no reply address on the ticket'}
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            {moment(ticket.last_activity_at || ticket.created_date).format('MMM D, HH:mm')}
          </p>
        </button>
      ))}
    </div>
  );
}
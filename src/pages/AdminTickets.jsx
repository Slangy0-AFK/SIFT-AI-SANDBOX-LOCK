import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import AdminTicketList from '@/components/admin/AdminTicketList';
import AdminTicketThread from '@/components/admin/AdminTicketThread';

// The queue the team works from. Every ticket in the app is here, whoever opened
// it and whether or not they had an account, newest first. The server decides
// what this account may read and write; this page is for admins only.
const FILTERS = [
  { id: 'waiting_on_team', label: 'Waiting on us', query: { status: 'waiting_on_team' } },
  { id: 'open', label: 'Open', query: { status: 'open' } },
  { id: 'waiting_on_user', label: 'Waiting on them', query: { status: 'waiting_on_user' } },
  { id: 'resolved', label: 'Resolved', query: { status: 'resolved' } },
  { id: 'closed', label: 'Closed', query: { status: 'closed' } },
  { id: 'all', label: 'Everything', query: {} }
];

export default function AdminTickets() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('waiting_on_team');
  const [tickets, setTickets] = useState([]);
  const [counts, setCounts] = useState({ open: 0, onTeam: 0, onUser: 0 });
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadCounts = useCallback(async () => {
    const [open, onTeam, onUser] = await Promise.all([
      base44.entities.SupportTicket.count({ status: 'open' }),
      base44.entities.SupportTicket.count({ status: 'waiting_on_team' }),
      base44.entities.SupportTicket.count({ status: 'waiting_on_user' })
    ]);
    setCounts({ open, onTeam, onUser });
  }, []);

  const loadTickets = useCallback(async (filterId) => {
    const chosen = FILTERS.find((item) => item.id === filterId) || FILTERS[0];
    setBusy(true);
    try {
      const page = await base44.entities.SupportTicket.filter(chosen.query, { sort: '-created_date', limit: 50 });
      setTickets(page.items || []);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me().catch(() => null);
      setUser(me);
      if (me?.role === 'admin') {
        await Promise.all([loadCounts(), loadTickets('waiting_on_team')]);
      }
      setLoading(false);
    })();
  }, [loadCounts, loadTickets]);

  // After a reply or a close: the list, the counters and the open ticket are
  // re-read, so what is on screen is what is on the ticket.
  const refresh = useCallback(
    async (ticketId) => {
      await Promise.all([loadCounts(), loadTickets(filter)]);
      if (ticketId) {
        const fresh = await base44.entities.SupportTicket.get(ticketId).catch(() => null);
        setSelected(fresh);
      }
    },
    [filter, loadCounts, loadTickets]
  );

  if (loading) {
    return (
      <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading tickets...
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-6">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="font-heading text-base font-semibold">Admins only</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Support tickets carry people's own reports, so this queue is limited to the app's admins.
            </p>
            <Link to="/" className="mt-4 inline-block">
              <Button variant="outline">Back to the app</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="font-heading text-xs uppercase tracking-widest text-primary">Admin</p>
      <div className="mt-3 flex flex-wrap items-inline justify-between gap-3">
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">Support tickets.</h1>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 font-mono text-xs"
          onClick={() => refresh(selected?.id)}
          disabled={busy}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Every ticket opened from the app or the public form lands here. Open one to read the thread, reply as the SIFT AI team, or close it
        with what was done. Closing sends the person their closing notice on the address the ticket carries.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Open</p>
          <p className="mt-1 font-heading text-2xl font-bold">{counts.open ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Waiting on the team</p>
          <p className="mt-1 font-heading text-2xl font-bold">{counts.onTeam ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Waiting on the person</p>
          <p className="mt-1 font-heading text-2xl font-bold">{counts.onUser ?? 0}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setFilter(item.id);
              loadTickets(item.id);
            }}
            className={`rounded-lg border px-3 py-2 font-mono text-xs transition-colors ${
              filter === item.id ? 'border-primary/50 bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <AdminTicketList
          tickets={tickets}
          busy={busy}
          selectedId={selected?.id}
          onSelect={(ticket) => setSelected(ticket)}
        />
        {selected ? (
          <AdminTicketThread key={selected.id} ticket={selected} onChanged={() => refresh(selected.id)} />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Pick a ticket from the list to read it and answer it.
          </div>
        )}
      </div>
    </div>
  );
}
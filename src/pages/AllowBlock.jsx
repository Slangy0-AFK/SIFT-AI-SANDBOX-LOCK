import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import useCurrentUser from '@/hooks/useCurrentUser';
import ListEntryForm from '@/components/lists/ListEntryForm';
import ListRow from '@/components/lists/ListRow';
import HelperAgent from '@/components/scanner/HelperAgent';

export default function AllowBlock() {
  const { user, isLoading: loadingUser } = useCurrentUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.title = 'Allowlist & Blocklist · SIFT AI';
  }, []);

  // Only this account's own list entries are asked for.
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['list-entries', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const page = await base44.entities.ListEntry.filter({ user_id: user.id }, { sort: '-created_date', limit: 200 });
      return page.items || [];
    }
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['list-entries', user?.id] });
  const blocked = entries.filter((entry) => entry.kind === 'block');
  const allowed = entries.filter((entry) => entry.kind === 'allow');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-12">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Allowlist &amp; Blocklist</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Your own two lists. Put an item you do not trust on the blocklist and it comes back flagged every time. Put an item you
            recognise on the allowlist and your list treats it as approved. Both lists are private to your account.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-mono text-xs font-bold tracking-wide">WHAT A LIST ACTUALLY DOES</p>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
            <li>· A blocked item is flagged wherever it turns up, including inside a message you paste in.</li>
            <li>· An allowed item is cleared when you check that exact item. A whole message is never cleared by an allowlist.</li>
            <li>· The result always says which of your lists changed the answer, so nothing is hidden.</li>
            <li>· Your lists do not change what the outside checkers say. They decide what SIFT AI does with it for you.</li>
          </ul>
        </div>

        <ListEntryForm userId={user?.id} onAdded={refresh} />

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-destructive/40 bg-card p-5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <h2 className="font-mono text-xs font-bold tracking-wide">BLOCKED ({blocked.length})</h2>
            </div>
            {isLoading || loadingUser ? (
              <p className="mt-4 font-mono text-xs text-muted-foreground">LOADING…</p>
            ) : blocked.length === 0 ? (
              <p className="mt-4 text-xs text-muted-foreground">
                Nothing blocked yet. Add a domain, link, app name or file hash you never want to see come back clear.
              </p>
            ) : (
              <ul className="mt-2">
                {blocked.map((entry) => (
                  <ListRow key={entry.id} entry={entry} onRemoved={refresh} />
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-emerald-400/40 bg-card p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <h2 className="font-mono text-xs font-bold tracking-wide">ALLOWED ({allowed.length})</h2>
            </div>
            {isLoading || loadingUser ? (
              <p className="mt-4 font-mono text-xs text-muted-foreground">LOADING…</p>
            ) : allowed.length === 0 ? (
              <p className="mt-4 text-xs text-muted-foreground">
                Nothing allowed yet. Add something you trust and recognise, so you are not asked about it again.
              </p>
            ) : (
              <ul className="mt-2">
                {allowed.map((entry) => (
                  <ListRow key={entry.id} entry={entry} onRemoved={refresh} />
                ))}
              </ul>
            )}
          </section>
        </div>

        <p className="font-mono text-xs leading-relaxed text-muted-foreground">
          Your lists affect your own checks only. See them in action on the{' '}
          <Link to="/scan" className="text-primary hover:underline">
            Phone Scanner
          </Link>
          , and everything you have run in{' '}
          <Link to="/history" className="text-primary hover:underline">
            your history
          </Link>
          .
        </p>
      </main>

      <HelperAgent page="Allowlist & Blocklist (/allow-block)" />
    </div>
  );
}
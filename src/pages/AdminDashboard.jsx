import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import moment from 'moment';
import { Inbox, Loader2, ShieldAlert } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PriceAdminForm from '@/components/kit/PriceAdminForm';
import AdminLicenseList from '@/components/admin/AdminLicenseList';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [settings, setSettings] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const me = await base44.auth.me().catch(() => null);
      setUser(me);
      if (me?.role === 'admin') {
        const accountList = await base44.entities.User.list();
        setAccounts(Array.isArray(accountList) ? accountList : accountList.items || []);
        const purchasePage = await base44.entities.KitPurchase.filter({}, { sort: '-created_date', limit: 100 });
        setPurchases(purchasePage.items || []);
        const settingsPage = await base44.entities.KitSettings.list({ limit: 1 });
        setSettings((settingsPage.items || [])[0] || null);
      }
      setLoading(false);
    })();
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-4xl items-center justify-center px-4 py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
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
              This page shows signups and paid status, so it is limited to the app's admins.
            </p>
            <Link to="/" className="mt-4 inline-block">
              <Button variant="outline">Back to the kit</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const paidCount = purchases.filter((purchase) => purchase.status === 'paid').length;
  const pendingCount = purchases.filter((purchase) => purchase.status === 'pending').length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <p className="font-heading text-xs uppercase tracking-widest text-primary">Admin</p>
      <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Signups and paid status.</h1>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link to="/admin/tickets">
          <Button className="gap-2 font-mono text-xs">
            <Inbox className="h-3.5 w-3.5" /> Field support tickets
          </Button>
        </Link>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Accounts</p>
          <p className="mt-1 font-heading text-2xl font-bold">{accounts.length}</p>
          <p className="text-xs text-muted-foreground">first page of the account list</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Paid</p>
          <p className="mt-1 font-heading text-2xl font-bold">{paidCount}</p>
          <p className="text-xs text-muted-foreground">from the last 100 purchase records</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Waiting on Stripe</p>
          <p className="mt-1 font-heading text-2xl font-bold">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">checkout started, not confirmed yet</p>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="font-heading text-base">Paid tier price</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            You set the price. Nothing is charged until a price is saved and checkout is open. Stripe does not accept charges below
            0.50.
          </p>
          <PriceAdminForm settings={settings} onSaved={() => setRefreshKey((key) => key + 1)} />
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="font-heading text-base">Purchases</CardTitle>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchases yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {purchases.map((purchase) => (
                <li key={purchase.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <span className="font-medium">{purchase.email || 'guest checkout'}</span>
                  <span className={purchase.status === 'paid' ? 'text-emerald-400' : 'text-muted-foreground'}>{purchase.status}</span>
                  <span className="text-muted-foreground">
                    {((purchase.amount_total || purchase.price_cents || 0) / 100).toFixed(2)} {String(purchase.currency || 'usd').toUpperCase()}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {moment(purchase.paid_at || purchase.created_date).format('MMM D, YYYY HH:mm')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AdminLicenseList />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="font-heading text-base">Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {accounts.map((account) => (
                <li key={account.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <span className="font-medium">{account.email}</span>
                  <span className="text-muted-foreground">{account.role || 'user'}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {moment(account.created_date).format('MMM D, YYYY')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="mt-8 text-sm text-muted-foreground">
        Purchases and demo runs stay private to each account. This view shows the account list and payment status only.
      </p>
    </div>
  );
}
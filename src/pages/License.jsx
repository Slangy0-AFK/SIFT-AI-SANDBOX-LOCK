import React from 'react';
import { Link } from 'react-router-dom';
import { Key, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useMyLicense from '@/hooks/useMyLicense';
import LicenseKeyCard from '@/components/license/LicenseKeyCard';
import LicenseOrderSummary from '@/components/license/LicenseOrderSummary';
import LicenseHowTo from '@/components/license/LicenseHowTo';
import LicenseTerms from '@/components/license/LicenseTerms';
import { licenseBadgeClass } from '@/lib/licenseStatus';

// The buyer's own license: their key, the receipt and order confirmation that
// came with it, how to apply it, and the terms. Nothing here is ever another
// person's key.
export default function License() {
  const { data, isLoading, revoke, regenerate } = useMyLicense();
  const busy = revoke.isPending || regenerate.isPending;
  const hasLicense = data?.has_license === true;

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <p className="flex items-center gap-2 font-heading text-xs uppercase tracking-widest text-primary">
        <Key className="h-3.5 w-3.5" /> My license
      </p>
      <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Your license key.</h1>
      <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
        One key for testing the SIFT AI governor and hardening filter in your own model and environment. It is applied to
        your account automatically — this page is where your own copy lives.
      </p>

      {isLoading && (
        <div className="mt-8 flex items-center gap-3 rounded-xl border border-border bg-card p-6">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading your license…</span>
        </div>
      )}

      {!isLoading && !hasLicense && (
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="font-heading text-lg font-semibold">No license yet</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            A key comes with a paid plan, and the first 50 accounts get one free with a founding place. Once you have one it
            appears here, and only ever for your own account.
          </p>
          <Link to="/plans">
            <Button className="mt-5 text-xs">See plans</Button>
          </Link>
        </div>
      )}

      {!isLoading && hasLicense && (
        <div className="mt-8 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${licenseBadgeClass(data.status_label)}`}>
              {data.status_label}
            </span>
            <span className="font-mono text-xs text-muted-foreground">Order {data.order_number}</span>
          </div>

          <LicenseKeyCard
            license={data}
            busy={busy}
            onRevoke={() => revoke.mutate()}
            onRegenerate={() => regenerate.mutate()}
          />

          <LicenseOrderSummary license={data} />

          <LicenseHowTo instructions={data.instructions} endpoint={data.endpoint} />

          <LicenseTerms unlocks={data.unlocks} terms={data.terms} />
        </div>
      )}
    </main>
  );
}
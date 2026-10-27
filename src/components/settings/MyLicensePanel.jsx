import React from 'react';
import { Link } from 'react-router-dom';
import { Key, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import useMyLicense from '@/hooks/useMyLicense';
import LicenseKeyCard from '@/components/license/LicenseKeyCard';
import { licenseBadgeClass } from '@/lib/licenseStatus';
import { formatChicagoTime } from '@/lib/utils';

// The Settings section: this account's own license, and nobody else's. A person
// with no license is told so, and pointed at the plans.
export default function MyLicensePanel() {
  const { data, isLoading, revoke, regenerate } = useMyLicense();
  const busy = revoke.isPending || regenerate.isPending;
  const hasLicense = data?.has_license === true;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Key className="h-4 w-4 text-primary" /> My License
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your license…
          </p>
        )}

        {!isLoading && !hasLicense && (
          <div>
            <p className="text-sm font-medium">No license yet</p>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              A key comes with a paid plan, and the first 50 accounts get one free with a founding place. It is applied to
              your account automatically, so there is nothing to paste in here.
            </p>
            <Link to="/plans">
              <Button variant="outline" className="mt-4 text-xs">
                See plans
              </Button>
            </Link>
          </div>
        )}

        {!isLoading && hasLicense && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${licenseBadgeClass(data.status_label)}`}>
                {data.status_label}
              </span>
              <span className="font-mono text-xs text-muted-foreground">Order {data.order_number}</span>
              {data.issued_at && (
                <span className="text-xs text-muted-foreground">
                  {data.source === 'founding' ? 'Granted' : 'Bought'} {formatChicagoTime(data.issued_at)}
                </span>
              )}
            </div>

            <LicenseKeyCard
              license={data}
              busy={busy}
              onRevoke={() => revoke.mutate()}
              onRegenerate={() => regenerate.mutate()}
            />

            <p className="text-sm text-muted-foreground">{data.unlocks}</p>

            <Link to="/license">
              <Button variant="outline" className="text-xs">
                Open my license
              </Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
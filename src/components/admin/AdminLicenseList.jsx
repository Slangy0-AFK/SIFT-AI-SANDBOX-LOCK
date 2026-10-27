import React, { useEffect, useState } from 'react';
import moment from 'moment';
import { Key, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { licenseBadgeClass } from '@/lib/licenseStatus';

// The team's view of the licenses: status and order numbers, the masked hint,
// and the two actions that matter. A key is never shown in full here.
export default function AdminLicenseList() {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [confirmId, setConfirmId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('licenseKey', { action: 'admin_list' });
      setLicenses(res.data?.licenses || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'The license list could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (license, action) => {
    setBusyId(license.id);
    setConfirmId('');
    try {
      const res = await base44.functions.invoke('licenseKey', { action, id: license.id });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(
        action === 'admin_revoke'
          ? `${license.order_number} is revoked for good: the key is dead and is never bound to another model.`
          : `A new key for ${license.order_number} was issued for the same model and emailed to the buyer.`
      );
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'That did not go through.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-base">
          <Key className="h-4 w-4 text-primary" /> Licenses
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Status and order numbers for the license keys issued with purchases and founding places. A key is never shown in
          full here, and the buyer is the only person who can read their own. Reissue replaces a lost key and keeps its model
          binding; revoking is final, so a revoked key is never replaced or re-bound.
        </p>

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading licenses…
          </p>
        ) : licenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No licenses issued yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {licenses.map((license) => (
              <li key={license.id} className="flex flex-wrap items-center gap-3 py-4 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{license.email || 'guest checkout, not yet claimed'}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {license.order_number} · {license.masked_key} · {license.plan_label || license.source}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {license.model_name
                      ? `locked to ${license.model_name}${license.deployment_id ? ` / ${license.deployment_id}` : ''}`
                      : 'not locked to a model yet'}
                  </p>
                </div>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${licenseBadgeClass(license.status_label)}`}>
                  {license.status_label}
                </span>
                {license.flagged_at && (
                  <span className="rounded-full border border-amber-400/40 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                    Flagged — a second binding was refused
                    {license.last_conflict_binding ? ` (${license.last_conflict_binding})` : ''}
                    {license.binding_conflicts > 1 ? ` ×${license.binding_conflicts}` : ''}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {license.activations > 0 ? 'activated' : 'not activated'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {license.issued_at ? moment(license.issued_at).format('MMM D, YYYY') : 'not recorded'}
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  {license.status === 'revoked' ? (
                    <span className="text-xs text-muted-foreground">revoked for good: never re-activated, re-bound or reissued</span>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        disabled={busyId === license.id}
                        onClick={() => act(license, 'admin_reissue')}
                      >
                        {busyId === license.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Reissue'}
                      </Button>
                      {confirmId === license.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive/40 text-xs text-destructive"
                            disabled={busyId === license.id}
                            onClick={() => act(license, 'admin_revoke')}
                          >
                            Confirm revoke
                          </Button>
                          <Button size="sm" variant="ghost" className="text-xs" onClick={() => setConfirmId('')}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-xs" onClick={() => setConfirmId(license.id)}>
                          Revoke
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
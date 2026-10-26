import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Shield, Smartphone } from 'lucide-react';
import useCurrentUser from '@/hooks/useCurrentUser';
import DeviceForm from '@/components/devices/DeviceForm';
import DeviceCard from '@/components/devices/DeviceCard';
import HelperAgent from '@/components/scanner/HelperAgent';
import { BROWSER_LIMIT } from '@/lib/scanLabels';

export default function MyDevices() {
  const { user, isLoading: loadingUser } = useCurrentUser();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    document.title = 'My Devices · SIFT AI';
  }, []);

  // Only this account's own devices are ever asked for, so the page cannot show
  // somebody else's list even by accident.
  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['my-devices', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const page = await base44.entities.Device.filter({ user_id: user.id }, { sort: '-created_date', limit: 50 });
      return page.items || [];
    }
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['my-devices', user?.id] });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-12">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">My Devices</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Keep your own list of the devices you care about, and file each check against the device it belongs to. This is your
            private list: nobody else can see it, and it is free.
          </p>
          <Button
            className="mt-5 gap-2 font-mono text-xs"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Add a device
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Tracking devices and their checks is free for everyone. Pro adds reusable scan profiles, re-checks of items that were
              flagged, and PDF reports: see{' '}
              <Link to="/scanner" className="text-primary hover:underline">
                your device tools
              </Link>{' '}
              and{' '}
              <Link to="/plans" className="text-primary hover:underline">
                the plans
              </Link>
              .
            </p>
          </div>
        </div>

        {(showForm || editing) && (
          <DeviceForm
            device={editing}
            userId={user?.id}
            onDone={() => {
              setShowForm(false);
              setEditing(null);
              refresh();
            }}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        )}

        {isLoading || loadingUser ? (
          <p className="font-mono text-xs text-muted-foreground">LOADING YOUR DEVICES…</p>
        ) : devices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
            <Smartphone className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-3 font-heading text-sm font-bold">No devices yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Add the phone, tablet or laptop you want to keep an eye on. Then check a link, a hash or a message and file it
              against that device, so its checks stay together in one place.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {devices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                onEdit={(entry) => {
                  setEditing(entry);
                  setShowForm(false);
                }}
                onChanged={refresh}
              />
            ))}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-mono text-xs leading-relaxed text-muted-foreground">{BROWSER_LIMIT}</p>
        </div>

        <p className="font-mono text-xs text-muted-foreground">
          Looking for every check you have run?{' '}
          <Link to="/history" className="text-primary hover:underline">
            Open your history
          </Link>
          .
        </p>
      </main>

      <HelperAgent page="My devices (/devices)" />
    </div>
  );
}
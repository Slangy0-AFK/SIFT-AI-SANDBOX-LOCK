import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { CalendarOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/errorMessage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';

// Stopping Pro. The person is asked first, and told plainly what happens: the plan
// stops renewing now, the license key stops with it, and the month they are in
// stays paid. It only appears when there is a renewing plan to stop — a founding
// place and a year paid upfront have nothing to cancel.
export default function CancelProPanel() {
  const queryClient = useQueryClient();
  const [asking, setAsking] = useState(false);

  const { data: rows = [] } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: () => base44.entities.Subscription.list('-created_date', 10),
  });

  const cancel = useMutation({
    mutationFn: async () => (await base44.functions.invoke('cancelSubscription', {})).data,
    onSuccess: (data) => {
      setAsking(false);
      toast.success(data?.message || 'Your plan is cancelled and your key has stopped working.');
      queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['my-license'] });
    },
    onError: (error) => {
      const code = getApiErrorMessage(error, '');
      toast.error(
        code === 'nothing_to_cancel'
          ? 'There is no renewing plan on this account to cancel.'
          : code === 'stripe_not_connected'
          ? 'Payments are not switched on yet, so this cannot go through from here.'
          : error.message || 'That did not go through. Please try again.'
      );
    }
  });

  const renewing = rows.find(
    (row) => row.status === 'active' && String(row.stripe_subscription_id || '')
  );
  if (!renewing) return null;

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <CalendarOff className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <div>
          <p className="font-mono text-xs font-semibold text-foreground">Pro renews every month</p>
          <p className="mt-1 max-w-xl font-mono text-xs leading-relaxed text-muted-foreground">
            Cancelling stops the plan straight away and your license key stops with it. The month you are in stays paid
            — cancelling takes nothing off it — and you can buy Pro again whenever you like.
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="font-mono text-xs"
        disabled={cancel.isPending}
        onClick={() => setAsking(true)}
      >
        {cancel.isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cancelling…
          </>
        ) : (
          'Cancel Pro'
        )}
      </Button>

      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Pro?</AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              Are you sure? Your plan stops renewing now and your license key stops working at the same moment. The month
              you are in is not refunded. You can buy Pro again whenever you like.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancel.isPending} className="font-mono text-xs">
              Keep my plan
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={cancel.isPending}
              className="font-mono text-xs"
              onClick={(event) => {
                // Kept open while the request runs, so a second click cannot send a
                // second cancel; it closes when the answer comes back.
                event.preventDefault();
                cancel.mutate();
              }}
            >
              Yes, cancel Pro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
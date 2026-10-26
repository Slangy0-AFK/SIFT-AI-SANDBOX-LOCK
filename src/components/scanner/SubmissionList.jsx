import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock } from 'lucide-react';
import { formatChicagoTime } from '@/lib/utils';

const STATUS_LABEL = {
  submitted: 'Submitted',
  in_review: 'Being looked at',
  delivered: 'Report delivered',
};

export default function SubmissionList({ tier }) {
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['device-submissions', tier],
    queryFn: async () => {
      const page = await base44.entities.DeviceSubmission.filter(
        { tier },
        { sort: '-created_date', limit: 20 }
      );
      return page.items || [];
    },
  });

  if (isLoading) return null;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="font-mono text-xs tracking-wider">YOUR SUBMISSIONS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {submissions.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">Nothing submitted yet.</p>
        ) : (
          submissions.map((submission) => (
            <div key={submission.id} className="rounded-lg border border-border/60 bg-secondary/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-foreground">{submission.device_name}</span>
                <Badge variant={submission.status === 'delivered' ? 'default' : 'outline'} className="gap-1 font-mono text-xs">
                  {submission.status === 'delivered' ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  {STATUS_LABEL[submission.status] || submission.status}
                </Badge>
              </div>
              {submission.flagged_item && (
                <p className="mt-2 font-mono text-xs text-muted-foreground">Flagged item: {submission.flagged_item}</p>
              )}
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Sent {submission.created_date ? formatChicagoTime(submission.created_date) : ''}
              </p>
              {submission.status === 'delivered' && (
                <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                  {submission.verdict && (
                    <p className="font-mono text-xs text-foreground">Verdict: {submission.verdict}</p>
                  )}
                  {submission.report_notes && (
                    <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">
                      {submission.report_notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
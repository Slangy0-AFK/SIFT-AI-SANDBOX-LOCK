import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatChicagoTime } from '@/lib/utils';

export default function ProReport() {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const { jsPDF } = await import('jspdf');
      const [me, sessions, submissions] = await Promise.all([
        base44.auth.me(),
        base44.entities.ScanSession.list('-created_date', 50),
        base44.entities.DeviceSubmission.list('-created_date', 20),
      ]);

      const doc = new jsPDF();
      let y = 20;
      doc.setFontSize(18);
      doc.text('SiftAI device report', 20, y);
      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(110);
      doc.text(`Generated ${formatChicagoTime(new Date().toISOString())}`, 20, y);
      y += 6;
      doc.text(`Account: ${me?.email || 'unknown'}`, 20, y);
      y += 12;

      doc.setTextColor(0);
      doc.setFontSize(12);
      doc.text(`Recent scans (${sessions.length})`, 20, y);
      y += 7;
      doc.setFontSize(9);
      if (sessions.length === 0) {
        doc.setTextColor(120);
        doc.text('No scans recorded yet.', 25, y);
        y += 7;
      }
      sessions.slice(0, 25).forEach((session) => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.setTextColor(0);
        doc.text(`- ${String(session.input_value || '').slice(0, 60)}`, 25, y);
        y += 5;
        doc.setTextColor(120);
        doc.text(`  ${session.scan_type} / ${session.status} / ${session.threat_level || 'not flagged'}`, 25, y);
        y += 7;
      });

      y += 6;
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setTextColor(0);
      doc.setFontSize(12);
      doc.text(`Paid submissions (${submissions.length})`, 20, y);
      y += 7;
      doc.setFontSize(9);
      if (submissions.length === 0) {
        doc.setTextColor(120);
        doc.text('No Device Check or Full Audit submissions yet.', 25, y);
        y += 7;
      }
      submissions.forEach((submission) => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.setTextColor(0);
        doc.text(`- ${submission.tier} / ${submission.device_name} / ${submission.status}`, 25, y);
        y += 7;
      });

      y += 8;
      if (y > 275) { doc.addPage(); y = 20; }
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text('No guaranteed detection and no guaranteed results. A scan is a check, not a certificate.', 20, y);

      doc.save(`siftai-device-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      toast.error(error.message || 'The report could not be built.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="font-mono text-xs tracking-wider">PDF REPORTS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-mono text-xs leading-relaxed text-muted-foreground">
          A PDF of your recent scans and paid submissions, for your own records.
        </p>
        <Button className="gap-2 font-mono text-xs" onClick={download} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
          Download PDF report
        </Button>
      </CardContent>
    </Card>
  );
}
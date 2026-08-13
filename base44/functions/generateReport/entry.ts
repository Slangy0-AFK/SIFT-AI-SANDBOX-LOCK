import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Allow: scheduler secret header, entity automation, or authenticated user
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET');
    const providedSecret = req.headers.get('x-scheduler-secret') || req.headers.get('x-automation-secret');
    const isScheduler = schedulerSecret && providedSecret === schedulerSecret;
    
    let user = null;
    if (!isScheduler) {
      user = await base44.auth.me().catch(() => null);
      if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }, { status: 401 });
      }
    }

    const { dateRange = '7days' } = await req.json();

    const now = new Date();
    let startDate = new Date();
    
    if (dateRange === '7days') startDate.setDate(now.getDate() - 7);
    else if (dateRange === '30days') startDate.setDate(now.getDate() - 30);
    else if (dateRange === '90days') startDate.setDate(now.getDate() - 90);
    else startDate.setDate(now.getDate() - 7);

    // Only fetch data for the current user
    const [threats, events, anomalies, honeypots] = await Promise.all([
      base44.entities.Threat.filter({ created_by: user.email }),
      base44.entities.SecurityEvent.filter({ created_by: user.email }),
      base44.entities.ZeroDayAnomaly.filter({ created_by: user.email }),
      base44.entities.HoneypotSession.filter({ created_by: user.email }),
    ]);

    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.setTextColor(0, 123, 255);
    doc.text('AEGIS QUANTUM SHIELD', 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text('Security Report', 20, 28);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 20, 35);
    doc.text(`Period: Last ${dateRange.replace('days', ' days')}`, 20, 40);
    doc.text(`User: ${user.email}`, 20, 45);

    // Summary Statistics
    let y = 55;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('SUMMARY STATISTICS', 20, y);
    y += 10;

    doc.setFontSize(10);
    const stats = [
      `Total Threats: ${threats.length}`,
      `Active Threats: ${threats.filter(t => !['locked', 'destroyed', 'cleared'].includes(t.status)).length}`,
      `Threats Destroyed: ${threats.filter(t => t.status === 'destroyed').length}`,
      `Zero-Day Anomalies: ${anomalies.length}`,
      `Honeypot Sessions: ${honeypots.length}`,
      `Security Events: ${events.length}`,
    ];

    stats.forEach(stat => {
      doc.text(stat, 20, y);
      y += 6;
    });

    // Threat Breakdown
    y += 10;
    doc.setFontSize(14);
    doc.text('THREAT BREAKDOWN', 20, y);
    y += 10;

    const threatByLevel = {
      critical: threats.filter(t => t.threat_level === 'critical').length,
      high: threats.filter(t => t.threat_level === 'high').length,
      medium: threats.filter(t => t.threat_level === 'medium').length,
      low: threats.filter(t => t.threat_level === 'low').length,
    };

    Object.entries(threatByLevel).forEach(([level, count]) => {
      doc.text(`• ${level.toUpperCase()}: ${count}`, 25, y);
      y += 6;
    });

    // Recent Critical Threats
    y += 10;
    doc.setFontSize(14);
    doc.text('RECENT CRITICAL THREATS', 20, y);
    y += 10;

    const criticalThreats = threats.filter(t => t.threat_level === 'critical').slice(0, 10);
    
    if (criticalThreats.length === 0) {
      doc.setTextColor(100);
      doc.text('No critical threats detected', 25, y);
      y += 6;
    } else {
      criticalThreats.forEach(threat => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setTextColor(0);
        doc.setFontSize(9);
        doc.text(`• ${threat.source_ip} - ${threat.status?.toUpperCase()}`, 25, y);
        y += 5;
        doc.setTextColor(100);
        doc.text(`  ${threat.notes?.substring(0, 80) || ''}${threat.notes?.length > 80 ? '...' : ''}`, 25, y);
        y += 7;
      });
    }

    // Zero-Day Anomalies
    y += 10;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(14);
    doc.text('ZERO-DAY ANOMALIES', 20, y);
    y += 10;

    if (anomalies.length === 0) {
      doc.setTextColor(100);
      doc.text('No anomalies detected', 25, y);
      y += 6;
    } else {
      anomalies.slice(0, 10).forEach(anomaly => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setTextColor(0);
        doc.setFontSize(9);
        doc.text(`• ${anomaly.anomaly_type?.toUpperCase()} - ${anomaly.severity?.toUpperCase()}`, 25, y);
        y += 5;
        doc.setTextColor(100);
        doc.text(`  Confidence: ${anomaly.confidence_score || 'N/A'}%`, 25, y);
        y += 7;
      });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount}`, 100, 290);
      doc.text('© 2026 Aegis Quantum Shield - Confidential', 20, 290);
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="security-report-${now.toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
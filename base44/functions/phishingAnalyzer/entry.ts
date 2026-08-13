import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Known phishing/malicious indicators
const PHISHING_KEYWORDS = [
  'verify your account', 'confirm your password', 'unusual activity', 'suspended account',
  'click here immediately', 'urgent action required', 'limited time offer', 'you have won',
  'wire transfer', 'bank account details', 'social security', 'update your billing',
  'your account will be closed', 'login immediately', 'reset your password now',
  'congratulations you have been selected', 'nigerian prince', 'inheritance funds',
  'IRS refund', 'cryptocurrency investment', 'free gift card', 'claim your prize'
];

const SUSPICIOUS_DOMAINS = [
  'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd', 'buff.ly',
  'adf.ly', 'shorte.st', 'linkbucks.com'
];

const SPOOFED_BRANDS = [
  'paypal', 'amazon', 'google', 'microsoft', 'apple', 'netflix', 'bank of america',
  'chase', 'wells fargo', 'irs', 'fedex', 'ups', 'dhl', 'coinbase', 'binance'
];

function extractUrls(text) {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  return text.match(urlRegex) || [];
}

function analyzeEmailContent(subject, body, sender) {
  const findings = [];
  let riskScore = 0;

  const fullText = `${subject} ${body}`.toLowerCase();
  const senderLower = (sender || '').toLowerCase();

  // 1. Phishing keyword check
  const matchedKeywords = PHISHING_KEYWORDS.filter(kw => fullText.includes(kw.toLowerCase()));
  if (matchedKeywords.length > 0) {
    riskScore += matchedKeywords.length * 15;
    findings.push({
      type: 'phishing_keywords',
      severity: matchedKeywords.length >= 3 ? 'critical' : 'high',
      detail: `Phishing keywords detected: ${matchedKeywords.slice(0, 5).join(', ')}`,
    });
  }

  // 2. URL shortener check
  const urls = extractUrls(`${subject} ${body}`);
  const shortUrls = urls.filter(u => SUSPICIOUS_DOMAINS.some(d => u.includes(d)));
  if (shortUrls.length > 0) {
    riskScore += 25;
    findings.push({
      type: 'url_shortener',
      severity: 'high',
      detail: `Suspicious shortened URLs found: ${shortUrls.slice(0, 3).join(', ')}`,
    });
  }

  // 3. Brand spoofing check
  const spoofedBrand = SPOOFED_BRANDS.find(brand => fullText.includes(brand));
  if (spoofedBrand && !senderLower.includes(spoofedBrand.replace(' ', ''))) {
    riskScore += 30;
    findings.push({
      type: 'brand_spoofing',
      severity: 'critical',
      detail: `Possible brand spoofing: "${spoofedBrand}" mentioned but sender domain doesn't match`,
    });
  }

  // 4. Urgency/pressure tactics
  const urgencyWords = ['urgent', 'immediately', 'within 24 hours', 'act now', 'expires today', 'last chance'];
  const urgencyMatches = urgencyWords.filter(w => fullText.includes(w));
  if (urgencyMatches.length >= 2) {
    riskScore += 20;
    findings.push({
      type: 'urgency_tactics',
      severity: 'medium',
      detail: `Psychological pressure tactics detected: ${urgencyMatches.join(', ')}`,
    });
  }

  // 5. Mismatched sender domain
  if (senderLower.includes('@') && senderLower.includes('.')) {
    const senderDomain = senderLower.split('@')[1];
    const hasSuspiciousDomain = /\d{3,}/.test(senderDomain) || senderDomain.split('.').length > 3;
    if (hasSuspiciousDomain) {
      riskScore += 20;
      findings.push({
        type: 'suspicious_sender',
        severity: 'high',
        detail: `Suspicious sender domain pattern: ${senderDomain}`,
      });
    }
  }

  // 6. Attachment threat indicators
  const attachmentExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js', '.jar', '.zip', '.rar'];
  const attachmentMatches = attachmentExtensions.filter(ext => fullText.includes(ext));
  if (attachmentMatches.length > 0) {
    riskScore += 35;
    findings.push({
      type: 'malicious_attachment',
      severity: 'critical',
      detail: `Potentially malicious attachment types referenced: ${attachmentMatches.join(', ')}`,
    });
  }

  // 7. No findings = clean
  if (findings.length === 0) {
    findings.push({ type: 'clean', severity: 'info', detail: 'No phishing indicators detected.' });
  }

  const clampedScore = Math.min(riskScore, 100);
  const verdict = clampedScore >= 70 ? 'PHISHING' : clampedScore >= 40 ? 'SUSPICIOUS' : 'CLEAN';

  return { riskScore: clampedScore, verdict, findings, urlsFound: urls };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    // Allow: scheduler secret header, entity automation, or authenticated user
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET');
    const providedSecret = req.headers.get('x-scheduler-secret') || req.headers.get('x-automation-secret');
    const isScheduler = schedulerSecret && providedSecret === schedulerSecret;
    
    let user = null;
    if (!isScheduler) {
      user = await base44.auth.me().catch(() => null);
      if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
      }
    }

    const body = await req.json();
    const { action, subject, body: emailBody, sender, url } = body;

    // ── Analyze Email ──────────────────────────────────────────────────────────
    if (action === 'analyze_email') {
      if (!emailBody && !subject) {
        return Response.json({ error: 'Provide subject and/or body to analyze' }, { status: 400 });
      }

      const result = analyzeEmailContent(subject || '', emailBody || '', sender || '');

      // Log as security event if suspicious
      if (result.verdict !== 'CLEAN') {
        await base44.asServiceRole.entities.SecurityEvent.create({
          event_type: 'threat_locked',
          severity: result.verdict === 'PHISHING' ? 'critical' : 'warning',
          details: `Phishing analysis: ${result.verdict} (score: ${result.riskScore}/100). Sender: ${sender || 'unknown'}. Findings: ${result.findings.map(f => f.detail).join(' | ')}`,
          environment: 'production',
        }).catch(() => {});

        if (result.verdict === 'PHISHING') {
          await base44.asServiceRole.entities.ZeroDayAnomaly.create({
            anomaly_signature: `phishing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            anomaly_type: 'behavioral',
            severity: 'critical',
            status: 'detected',
            source_ip: sender || 'email',
            confidence_score: result.riskScore,
            mitigation_applied: 'Email flagged and quarantined',
            notes: `Phishing email detected. Subject: "${subject}". Risk score: ${result.riskScore}/100`,
          }).catch(() => {});
        }
      }

      return Response.json({ success: true, ...result });
    }

    // ── Analyze URL ────────────────────────────────────────────────────────────
    if (action === 'analyze_url') {
      if (!url) return Response.json({ error: 'Provide a URL to analyze' }, { status: 400 });

      const findings = [];
      let riskScore = 0;

      // Check for shortened URL
      if (SUSPICIOUS_DOMAINS.some(d => url.includes(d))) {
        riskScore += 40;
        findings.push({ type: 'url_shortener', severity: 'high', detail: 'URL uses a shortening service — destination unknown' });
      }

      // Check for IP-based URLs (no domain)
      if (/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url)) {
        riskScore += 50;
        findings.push({ type: 'ip_url', severity: 'critical', detail: 'URL uses raw IP address instead of domain — highly suspicious' });
      }

      // Check for typosquatting of known brands
      const typosquat = SPOOFED_BRANDS.find(brand => {
        const b = brand.replace(' ', '');
        return url.toLowerCase().includes(b) && !url.toLowerCase().includes(`${b}.com`) && !url.toLowerCase().includes(`www.${b}`);
      });
      if (typosquat) {
        riskScore += 45;
        findings.push({ type: 'typosquatting', severity: 'critical', detail: `Possible typosquatting of "${typosquat}"` });
      }

      // Check for excessive subdomains
      try {
        const parsed = new URL(url);
        const subdomains = parsed.hostname.split('.').length - 2;
        if (subdomains > 2) {
          riskScore += 25;
          findings.push({ type: 'excessive_subdomains', severity: 'medium', detail: `Suspicious subdomain depth: ${parsed.hostname}` });
        }

        // Non-HTTPS
        if (parsed.protocol === 'http:') {
          riskScore += 15;
          findings.push({ type: 'no_https', severity: 'medium', detail: 'URL does not use HTTPS — data transmitted in plaintext' });
        }
      } catch {}

      if (findings.length === 0) {
        findings.push({ type: 'clean', severity: 'info', detail: 'No URL threat indicators detected.' });
      }

      const clampedScore = Math.min(riskScore, 100);
      const verdict = clampedScore >= 70 ? 'MALICIOUS' : clampedScore >= 40 ? 'SUSPICIOUS' : 'CLEAN';

      return Response.json({ success: true, url, riskScore: clampedScore, verdict, findings });
    }

    return Response.json({ error: 'Invalid action. Use: analyze_email, analyze_url' }, { status: 400 });

  } catch (error) {
    console.error('[PHISHING-ANALYZER] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
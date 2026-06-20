import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Device Threat Scan
 *
 * Receives client-side device signals collected by the browser (permissions,
 * network anomalies, UA fingerprint, suspicious patterns) and runs server-side
 * threat analysis against them.
 *
 * NO personal files or file content are stored — only threat signatures and
 * event metadata. Work agents (standard User-Agent strings with legit patterns)
 * are NOT flagged.
 */

const THREAT_SIGNATURES = [
  // Hidden injected scripts / malware patterns
  { pattern: /eval\s*\(\s*atob\s*\(/i, label: 'Obfuscated eval injection', severity: 'critical' },
  { pattern: /document\.write\s*\(\s*unescape/i, label: 'DOM write obfuscation', severity: 'high' },
  { pattern: /<script[^>]+src=["']data:/i, label: 'Data-URI script injection', severity: 'critical' },
  { pattern: /fromCharCode\(\d+,\d+,\d+,\d+,\d+/i, label: 'CharCode payload encoding', severity: 'high' },
  { pattern: /window\[['"][a-z]{1,3}['"]\]\s*\(/i, label: 'Obfuscated window property call', severity: 'high' },
  { pattern: /String\.prototype\.\w+\s*=\s*function/i, label: 'Native prototype hijack', severity: 'critical' },
  { pattern: /fetch\s*\(\s*['"]https?:\/\/(?!.*(?:googleapis|cloudflare|amazonaws))/i, label: 'Suspicious outbound fetch', severity: 'medium' },
  // Crypto mining
  { pattern: /CoinHive|coinhive|cryptonight|cpu-miner|webminer/i, label: 'Crypto mining script', severity: 'critical' },
  // Keylogger / credential harvesting
  { pattern: /addEventListener\s*\(\s*['"]keydown['"]/i, label: 'Keydown listener (possible keylogger)', severity: 'medium' },
  { pattern: /navigator\.credentials/i, label: 'Credential API access', severity: 'medium' },
];

// Legitimate work agent patterns — these are NOT flagged
const LEGIT_AGENT_PATTERNS = [
  /Mozilla\/5\.0/i, /Chrome\/\d+/i, /Safari\/\d+/i, /Firefox\/\d+/i,
  /Edg\/\d+/i, /Postman/i, /curl\/\d+/i, /axios/i, /python-requests/i,
  /Googlebot/i, /Slackbot/i, /Twitterbot/i, /LinkedInBot/i,
];

function isLegitWorkAgent(userAgent) {
  return LEGIT_AGENT_PATTERNS.some(p => p.test(userAgent));
}

function analyzeUserAgent(userAgent) {
  const findings = [];
  if (!userAgent || userAgent.length === 0) {
    findings.push({ label: 'Missing User-Agent header', severity: 'medium' });
    return findings;
  }
  // Suspiciously short or randomised UA
  if (userAgent.length < 10) {
    findings.push({ label: 'Abnormally short User-Agent', severity: 'medium' });
  }
  // Null-byte or binary injection in UA
  if (/[\x00-\x08\x0b\x0e-\x1f\x7f]/.test(userAgent)) {
    findings.push({ label: 'Control characters in User-Agent (injection attempt)', severity: 'critical' });
  }
  return findings;
}

function scanPayloadStrings(strings = []) {
  const hits = [];
  for (const str of strings) {
    if (typeof str !== 'string') continue;
    for (const sig of THREAT_SIGNATURES) {
      if (sig.pattern.test(str)) {
        hits.push({ label: sig.label, severity: sig.severity, matched: str.slice(0, 80) });
        break;
      }
    }
  }
  return hits;
}

function analyzePermissions(permissions = {}) {
  const warnings = [];
  if (permissions.clipboard === 'granted') warnings.push({ label: 'Clipboard read access granted', severity: 'medium' });
  if (permissions.camera === 'granted') warnings.push({ label: 'Camera access granted', severity: 'low' });
  if (permissions.microphone === 'granted') warnings.push({ label: 'Microphone access granted', severity: 'low' });
  if (permissions.notifications === 'denied') warnings.push({ label: 'Push notifications blocked by user', severity: 'info' });
  return warnings;
}

function analyzeHardware(hardware = {}) {
  const findings = [];
  // Zero CPU cores = headless/VM
  if (hardware.cpu_cores === 0 || hardware.cpu_cores === 1) {
    findings.push({ label: `Suspicious CPU core count: ${hardware.cpu_cores} (possible headless/VM)`, severity: 'medium' });
  }
  // Headless browsers report 0 color depth
  if (hardware.color_depth === 0) {
    findings.push({ label: 'Zero color depth — headless browser indicator', severity: 'high' });
  }
  // SwiftShader or LLVMpipe = headless rendering (no real GPU)
  if (hardware.webgl_renderer && /SwiftShader|llvmpipe|ANGLE|Mesa|softpipe/i.test(hardware.webgl_renderer)) {
    findings.push({ label: `Software/virtual GPU detected: ${hardware.webgl_renderer.slice(0, 80)}`, severity: 'high' });
  }
  // Battery nearly dead while "charging" = desktop VM (always full or always draining)
  if (hardware.battery_level !== undefined && hardware.battery_level < 0.05 && !hardware.battery_charging) {
    findings.push({ label: 'Battery critically low during scan — device may be compromised or VM', severity: 'low' });
  }
  // Zero touch points on a declared mobile UA = spoofed UA
  if (hardware.touch_points === 0 && /Android|iPhone|iPad/i.test(hardware.platform || '')) {
    findings.push({ label: 'Mobile platform declared but no touch support — spoofed User-Agent', severity: 'medium' });
  }
  return findings;
}

function analyzeStorage(storage = {}) {
  const findings = [];
  // Storage usage > 80% can indicate malware caching large payloads
  if (storage.usage_pct > 80) {
    findings.push({ label: `Storage ${storage.usage_pct}% full (${storage.usage_mb}MB) — possible malware cache`, severity: 'medium' });
  }
  // Unusually large usage for a browser origin
  if (storage.usage_mb > 500) {
    findings.push({ label: `Abnormally large origin storage: ${storage.usage_mb}MB — review cached data`, severity: 'medium' });
  }
  return findings;
}

function analyzeNetworkSignals(network = {}) {
  const findings = [];
  if (network.onLine === false) {
    findings.push({ label: 'Device offline during scan (possible network isolation attack)', severity: 'medium' });
  }
  if (network.tor === true) {
    findings.push({ label: 'Tor exit node detected', severity: 'high' });
  }
  if (network.vpn_anomaly === true) {
    findings.push({ label: 'VPN/proxy anomaly detected', severity: 'medium' });
  }
  return findings;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      notifyOnThreat = true,
      suspicious_strings = [],
      permissions = {},
      network = {},
      hardware = {},
      storage = {},
      user_agent = req.headers.get('user-agent') || '',
    } = body;

    const startTime = Date.now();
    const scanId = `SCAN-${Date.now().toString(36).toUpperCase()}`;

    // Analyse signals
    const uaFindings = analyzeUserAgent(user_agent);
    const sigFindings = scanPayloadStrings(suspicious_strings);
    const permWarnings = analyzePermissions(permissions);
    const netFindings = analyzeNetworkSignals(network);
    const hwFindings = analyzeHardware(hardware);
    const storageFindings = analyzeStorage(storage);

    const allFindings = [...uaFindings, ...sigFindings, ...netFindings, ...hwFindings, ...storageFindings];
    const allWarnings = [...permWarnings];

    const criticalCount = allFindings.filter(f => f.severity === 'critical').length;
    const highCount = allFindings.filter(f => f.severity === 'high').length;
    const totalThreats = criticalCount + highCount;
    const totalWarnings = allFindings.filter(f => f.severity === 'medium').length + allWarnings.length;
    const isClean = allFindings.length === 0;

    // Log scan event — no personal file data, just threat metadata
    await base44.asServiceRole.entities.SecurityEvent.create({
      event_type: 'base_chain_compute',
      severity: totalThreats > 0 ? 'critical' : totalWarnings > 0 ? 'warning' : 'info',
      details: JSON.stringify({
        scan_id: scanId,
        threats: totalThreats,
        warnings: totalWarnings,
        findings_count: allFindings.length,
        duration_ms: Date.now() - startTime,
      }),
      environment: 'production',
      base_chain_step: 'base1',
    });

    // Create threat record if threats found
    if (totalThreats > 0) {
      await base44.asServiceRole.entities.Threat.create({
        user_id: user.id,
        source_ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        threat_level: criticalCount > 0 ? 'critical' : 'high',
        status: 'detected',
        agent_type: isLegitWorkAgent(user_agent) ? 'human' : 'unknown',
        environment: 'production',
        notes: `Device scan ${scanId}: ${allFindings.map(f => f.label).join('; ')}`,
        obfuscation_detected: sigFindings.length > 0,
      });

      if (notifyOnThreat) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: user.email,
          subject: '🚨 AEGIS — Hidden Threat Detected on Your Device',
          body: `Hi ${user.full_name || user.email},\n\nAEGIS detected hidden threats on your device during a full in-depth scan.\n\nScan ID: ${scanId}\nThreats found: ${totalThreats}\nWarnings: ${totalWarnings}\n\nFindings:\n${allFindings.map(f => `• [${f.severity.toUpperCase()}] ${f.label}`).join('\n')}\n\nDevice Info:\n• CPU Cores: ${hardware.cpu_cores ?? 'N/A'}\n• GPU: ${hardware.webgl_renderer ?? 'N/A'}\n• Storage Usage: ${storage.usage_mb ?? 0}MB / ${storage.quota_mb ?? 0}MB (${storage.usage_pct ?? 0}%)\n• Platform: ${hardware.platform ?? 'N/A'}\n• Network: ${network.connection_type ?? 'N/A'} (${network.timezone ?? 'N/A'})\n\nLog in to your AEGIS dashboard to view full details.\n\n— AEGIS Security`,
        }).catch(() => {});
      }
    }

    return Response.json({
      success: true,
      scan_id: scanId,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      summary: {
        threats: totalThreats,
        warnings: totalWarnings,
        clean: isClean,
      },
      findings: allFindings,
      warnings: allWarnings,
      notification_sent: notifyOnThreat && totalThreats > 0,
    });

  } catch (error) {
    console.error('[DEVICE SCAN] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
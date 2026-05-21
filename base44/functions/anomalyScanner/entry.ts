import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Anomaly Scanner — Scheduled every 5 minutes
 * 
 * Scans all active threat/anomaly data for patterns:
 * - Repeated IPs across multiple threats
 * - Stale threats stuck in intermediate states
 * - High-severity anomalies not yet contained
 * - Burst detection (many threats from same subnet)
 * - Generates ZeroDayAnomaly records for suspicious patterns
 */

// ── AI / Claude Code Leak & Prompt Injection Signatures ──────────────────
const AI_ATTACK_SIGNATURES = [
  // Claude / LLM prompt injection & exfiltration patterns
  'ignore previous instructions',
  'ignore all previous',
  'disregard your instructions',
  'you are now',
  'act as',
  'jailbreak',
  'dan mode',
  'developer mode',
  'system prompt',
  'reveal your instructions',
  'repeat everything above',
  'print your instructions',
  'what are your instructions',
  'leak your context',
  'ignore the above',
  'new instructions:',
  'override instructions',
  'bypass filter',
  'bypass safety',
  'disable safety',
  // Claude-specific leak patterns being exploited in the wild
  'human: assistant:',
  '<human>',
  '<assistant>',
  'anthropic',
  'claude.ai',
  'model: claude',
  'claude-3',
  'claude-4',
  'claude sonnet',
  'claude opus',
  // Prompt exfiltration / data leak probes
  'base64 encode',
  'encode the following',
  'exfiltrate',
  'extract training data',
  'training data',
  'system message',
  'context window',
  // AI-assisted recon / code injection
  'write a script to',
  'generate exploit',
  'create a payload',
  'write malware',
  'write ransomware',
  'bypass authentication',
  'sql injection payload',
  'xss payload',
  '"><script>',
  "'; drop table",
  'union select',
  // Autonomous AI agent fingerprints
  'langchain',
  'autogpt',
  'babyagi',
  'agentgpt',
  'openai.com/v1',
  'gpt-4',
  'gpt-3',
];

function detectAIAttack(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const sig of AI_ATTACK_SIGNATURES) {
    if (lower.includes(sig.toLowerCase())) {
      return sig;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled/system calls via service token, or require admin user
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const base44Service = base44.asServiceRole;
    
    console.log('[AEGIS SCANNER] Starting anomaly scan cycle...');
    
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    
    // Fetch data in parallel
    const [allThreats, allAnomalies, recentEvents] = await Promise.all([
      base44Service.entities.Threat.list('-created_date', 200),
      base44Service.entities.ZeroDayAnomaly.list('-created_date', 100),
      base44Service.entities.SecurityEvent.list('-created_date', 50),
    ]);
    
    let detectedCount = 0;
    let escalatedCount = 0;
    let cleanedCount = 0;
    
    // ── 0. AI / Claude Code Leak & Prompt Injection Auto-Reject ─────────────
    // Scan all threat notes/payloads for AI attack signatures — instant block
    const aiScanTargets = allThreats.filter(t =>
      !['destroyed', 'cleared'].includes(t.status) &&
      (t.notes || t.paradox_response || t.base_chain_signature)
    );

    for (const threat of aiScanTargets) {
      const combined = [threat.notes, threat.paradox_response, threat.base_chain_signature].join(' ');
      const matchedSig = detectAIAttack(combined);

      if (matchedSig) {
        // Check if already flagged as ai_adversarial anomaly
        const alreadyFlagged = allAnomalies.find(
          a => a.source_ip === threat.source_ip && a.anomaly_type === 'ai_adversarial' && a.status !== 'neutralized'
        );

        if (!alreadyFlagged) {
          // Immediately lock the threat
          await base44Service.entities.Threat.update(threat.id, {
            status: 'locked',
            threat_level: 'critical',
            base_chain_signature: `AI-REJECT-${Date.now().toString(36).toUpperCase()}`,
            notes: (threat.notes || '') + ` | AUTO-REJECTED: AI attack signature detected — "${matchedSig}"`,
          });

          // Log as ai_adversarial zero-day anomaly
          await base44Service.entities.ZeroDayAnomaly.create({
            anomaly_signature: `AI-ATTACK-${threat.source_ip.replace(/\./g, '-')}-${Date.now().toString(36)}`,
            anomaly_type: 'ai_adversarial',
            severity: 'critical',
            status: 'contained',
            source_ip: threat.source_ip,
            confidence_score: 98,
            mitigation_applied: 'Auto-rejected and locked by Aegis AI attack detector',
            notes: `AI/LLM attack pattern detected from ${threat.source_ip}. Matched signature: "${matchedSig}". Threat immediately locked.`,
            environment: threat.environment || 'production',
          });

          await base44Service.entities.SecurityEvent.create({
            event_type: 'threat_locked',
            threat_id: threat.id,
            severity: 'critical',
            details: `AI ATTACK AUTO-REJECTED: ${threat.source_ip} matched signature "${matchedSig}" — Claude/LLM prompt injection or code leak attempt blocked.`,
            environment: threat.environment || 'production',
            base_chain_step: 'base0',
          });

          // Also create firewall block
          await base44Service.entities.FirewallLog.create({
            rule_id: 'ai-attack-auto-block',
            rule_name: 'Aegis AI Attack Blocker',
            action_taken: 'blocked',
            source_ip: threat.source_ip,
            threat_level: 'critical',
            blocked_reason: `AI/LLM attack signature: "${matchedSig}"`,
            direction: 'inbound',
            protocol: 'tcp',
          });

          detectedCount++;
          console.log(`[AEGIS SCANNER] AI ATTACK BLOCKED: ${threat.source_ip} | Signature: "${matchedSig}"`);
        }
      }
    }

    // ── 1. Burst Detection: same IP with 3+ threats ────────────────────────
    const ipCounts = {};
    for (const t of allThreats) {
      if (t.source_ip) {
        ipCounts[t.source_ip] = (ipCounts[t.source_ip] || 0) + 1;
      }
    }
    
    for (const [ip, count] of Object.entries(ipCounts)) {
      if (count >= 3) {
        // Check if we already have an anomaly for this IP recently
        const existing = allAnomalies.find(
          a => a.source_ip === ip && a.anomaly_type === 'behavioral' && a.status !== 'neutralized'
        );
        
        if (!existing) {
          await base44Service.entities.ZeroDayAnomaly.create({
            anomaly_signature: `BURST-${ip.replace(/\./g, '-')}-${Date.now().toString(36)}`,
            anomaly_type: 'behavioral',
            severity: count >= 6 ? 'fatal' : count >= 5 ? 'critical' : 'warning',
            status: 'detected',
            source_ip: ip,
            confidence_score: Math.min(95, 50 + count * 8),
            notes: `Burst attack pattern: ${count} threats from ${ip}. Auto-detected by Aegis Scanner.`,
            environment: 'production',
          });
          
          console.log(`[AEGIS SCANNER] Burst detected from ${ip}: ${count} threats`);
          detectedCount++;
        }
      }
    }
    
    // ── 2. Subnet Sweep Detection: /24 subnet with 5+ different IPs ─────────
    const subnetCounts = {};
    for (const t of allThreats) {
      if (t.source_ip) {
        const subnet = t.source_ip.split('.').slice(0, 3).join('.');
        if (!subnetCounts[subnet]) subnetCounts[subnet] = new Set();
        subnetCounts[subnet].add(t.source_ip);
      }
    }
    
    for (const [subnet, ips] of Object.entries(subnetCounts)) {
      if (ips.size >= 5) {
        const existingSubnet = allAnomalies.find(
          a => a.notes?.includes(subnet) && a.anomaly_type === 'behavioral' && a.status !== 'neutralized'
        );
        
        if (!existingSubnet) {
          await base44Service.entities.ZeroDayAnomaly.create({
            anomaly_signature: `SUBNET-SWEEP-${subnet.replace(/\./g, '-')}-${Date.now().toString(36)}`,
            anomaly_type: 'behavioral',
            severity: 'critical',
            status: 'detected',
            source_ip: subnet + '.0',
            confidence_score: 85,
            notes: `Subnet sweep detected: ${ips.size} unique IPs from ${subnet}.0/24. Possible coordinated attack.`,
            environment: 'production',
          });
          
          console.log(`[AEGIS SCANNER] Subnet sweep: ${subnet}.0/24 — ${ips.size} IPs`);
          detectedCount++;
        }
      }
    }
    
    // ── 3. Stale Threat Escalation ─────────────────────────────────────────
    // Threats stuck in intermediate states for > 1 hour get auto-locked
    const staleStatuses = ['challenged', 'cycle_1', 'cycle_2', 'cycle_3'];
    const staleThreats = allThreats.filter(t => 
      staleStatuses.includes(t.status) && 
      t.updated_date && new Date(t.updated_date) < new Date(oneHourAgo)
    );
    
    for (const threat of staleThreats.slice(0, 10)) {
      await base44Service.entities.Threat.update(threat.id, {
        status: 'locked',
        base_chain_signature: `STALE-LOCK-${Date.now().toString(36).toUpperCase()}`,
        notes: (threat.notes || '') + ' | Auto-locked: stale threat exceeded 1hr window.',
      });
      
      await base44Service.entities.SecurityEvent.create({
        event_type: 'threat_locked',
        threat_id: threat.id,
        severity: 'warning',
        details: `Stale threat auto-locked: ${threat.source_ip} was stuck in ${threat.status} for >1hr`,
        environment: threat.environment || 'production',
        base_chain_step: 'base1',
      });
      
      escalatedCount++;
      console.log(`[AEGIS SCANNER] Stale threat locked: ${threat.id} | IP: ${threat.source_ip}`);
    }
    
    // ── 4. Escalate uncontained critical anomalies ─────────────────────────
    const urgentAnomalies = allAnomalies.filter(
      a => (a.severity === 'critical' || a.severity === 'fatal') && 
           a.status === 'detected' &&
           a.updated_date && new Date(a.updated_date) < new Date(fiveMinAgo)
    );
    
    for (const anomaly of urgentAnomalies.slice(0, 5)) {
      await base44Service.entities.ZeroDayAnomaly.update(anomaly.id, {
        status: 'escalated',
        mitigation_applied: 'Escalated by automated scanner — manual review required',
      });
      
      await base44Service.entities.SecurityEvent.create({
        event_type: 'honeypot_trigger',
        severity: 'critical',
        details: `Critical anomaly escalated: ${anomaly.anomaly_signature} (${anomaly.anomaly_type}) — uncontained >5min`,
        environment: anomaly.environment || 'production',
        base_chain_step: 'base12',
      });
      
      escalatedCount++;
      console.log(`[AEGIS SCANNER] Escalated anomaly: ${anomaly.id} | Type: ${anomaly.anomaly_type}`);
    }
    
    // ── 5. Auto-deploy Honeypots & Tarpits for mirror-environment threats ────
    // These are permanently active — any threat in mirror/honeypot env gets a session
    const mirrorThreats = allThreats.filter(t =>
      (t.environment === 'mirror' || t.environment === 'honeypot') &&
      (t.status === 'challenged' || t.status === 'cycle_1' || t.status === 'cycle_2' || t.status === 'cycle_3')
    );
    
    for (const threat of mirrorThreats.slice(0, 5)) {
      // Check if there's already an active session for this IP
      const existingSessions = await base44Service.entities.HoneypotSession.filter({ source_ip: threat.source_ip });
      const hasActiveSession = existingSessions.some(s => s.status === 'active');
      
      if (!hasActiveSession) {
        const sessionType = threat.environment === 'honeypot' ? 'honeypot' : 'tarpit';
        await base44Service.entities.HoneypotSession.create({
          session_type: sessionType,
          source_ip: threat.source_ip,
          duration_seconds: 0,
          interactions: 0,
          data_captured: sessionType === 'honeypot'
            ? `Auto-deployed: capturing tools, techniques, and intent from ${threat.source_ip}`
            : `Auto-deployed: throttling connection from ${threat.source_ip} to 1 byte/sec`,
          status: 'active',
          threat_id: threat.id,
        });
        
        await base44Service.entities.SecurityEvent.create({
          event_type: sessionType === 'honeypot' ? 'honeypot_trigger' : 'tarpit_engage',
          threat_id: threat.id,
          severity: 'warning',
          details: `Auto-deployed ${sessionType} for threat ${threat.source_ip} in mirror environment`,
          environment: sessionType,
          base_chain_step: 'base12',
        });
        
        console.log(`[AEGIS SCANNER] Auto-deployed ${sessionType} for ${threat.source_ip}`);
        detectedCount++;
      }
    }
    
    // ── 6. Keep QRNG active: advance any cycle_1/2/3 threats that haven't moved ──
    const stuckCycles = allThreats.filter(t =>
      ['cycle_1', 'cycle_2'].includes(t.status) &&
      t.updated_date && new Date(t.updated_date) < new Date(fiveMinAgo)
    );
    
    for (const threat of stuckCycles.slice(0, 10)) {
      const nextStatus = threat.status === 'cycle_1' ? 'cycle_2' : 'cycle_3';
      await base44Service.entities.Threat.update(threat.id, {
        status: nextStatus,
        qrng_cycle: (threat.qrng_cycle || 1) + 1,
      });
      await base44Service.entities.SecurityEvent.create({
        event_type: 'qrng_cycle',
        threat_id: threat.id,
        severity: 'warning',
        details: `QRNG auto-advanced: ${threat.source_ip} → ${nextStatus}`,
        environment: threat.environment || 'production',
        base_chain_step: 'qrng',
      });
      console.log(`[AEGIS SCANNER] QRNG advanced: ${threat.source_ip} → ${nextStatus}`);
    }
    
    // ── 7. Auto-clear low-risk old cleared threats ─────────────────────────
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const oldCleared = allThreats.filter(
      t => t.status === 'cleared' && t.updated_date && new Date(t.updated_date) < new Date(oneDayAgo)
    );
    // Just log the count, don't delete — preserve audit trail
    cleanedCount = oldCleared.length;
    
    // ── 8. Log scanner heartbeat ───────────────────────────────────────────
    await base44Service.entities.SecurityEvent.create({
      event_type: 'qrng_cycle',
      severity: 'info',
      details: `Anomaly scanner cycle complete: ${detectedCount} new anomalies, ${escalatedCount} escalated, ${cleanedCount} old cleared threats`,
      environment: 'production',
      base_chain_step: 'qrng',
    });
    
    console.log(`[AEGIS SCANNER] Scan complete: +${detectedCount} detected, +${escalatedCount} escalated`);
    
    return Response.json({
      success: true,
      scan_time: now.toISOString(),
      stats: {
        new_anomalies_detected: detectedCount,
        threats_escalated: escalatedCount,
        old_cleared_threats: cleanedCount,
        total_active_threats: allThreats.filter(t => !['cleared', 'destroyed'].includes(t.status)).length,
        total_open_anomalies: allAnomalies.filter(a => !['neutralized'].includes(a.status)).length,
      }
    });
    
  } catch (error) {
    console.error('[AEGIS SCANNER] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
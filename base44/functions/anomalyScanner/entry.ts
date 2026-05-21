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

// ── AI Attack Detection Signatures (loaded at runtime) ────────────────────
// These signatures are loaded from environment variable to avoid hardcoding
function getAIAttackSignatures() {
  const sigsEnv = Deno.env.get('AI_ATTACK_SIGNATURES');
  if (sigsEnv) {
    try {
      return JSON.parse(sigsEnv);
    } catch {
      console.warn('[ANOMALY SCANNER] Failed to parse AI_ATTACK_SIGNATURES from env');
    }
  }
  // Fallback signatures if env var not set
  return [
    'ignore previous instructions', 'ignore all previous', 'disregard your instructions',
    'you are now', 'act as', 'jailbreak', 'dan mode', 'developer mode', 'system prompt',
    'reveal your instructions', 'repeat everything above', 'print your instructions',
    'what are your instructions', 'leak your context', 'ignore the above', 'new instructions:',
    'override instructions', 'bypass filter', 'bypass safety', 'disable safety',
    'human: assistant:', '<human>', '<assistant>', 'anthropic', 'claude.ai',
    'model: claude', 'claude-3', 'claude-4', 'claude sonnet', 'claude opus',
    'base64 encode', 'encode the following', 'exfiltrate', 'extract training data',
    'training data', 'system message', 'context window', 'write a script to',
    'generate exploit', 'create a payload', 'write malware', 'write ransomware',
    'bypass authentication', 'sql injection payload', 'xss payload', '"><script>',
    "'; drop table", 'union select', 'langchain', 'autogpt', 'babyagi',
    'agentgpt', 'openai.com/v1', 'gpt-4', 'gpt-3',
  ];
}

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

    // Require authenticated user with admin role
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const AI_ATTACK_SIGNATURES = getAIAttackSignatures();
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

    // ── 1. IP Reputation Scoring — Track repeat offenders ───────────────────
    // Build reputation scores based on historical behavior across all threats
    const ipReputation = {};
    for (const t of allThreats) {
      if (t.source_ip) {
        if (!ipReputation[t.source_ip]) {
          ipReputation[t.source_ip] = {
            totalThreats: 0,
            criticalCount: 0,
            daysActive: 0,
            firstSeen: new Date(t.created_date),
            lastSeen: new Date(t.created_date),
            threatLevels: new Set(),
            environments: new Set(),
          };
        }
        const rep = ipReputation[t.source_ip];
        rep.totalThreats++;
        if (t.threat_level === 'critical' || t.threat_level === 'high') rep.criticalCount++;
        rep.threatLevels.add(t.threat_level);
        if (t.environment) rep.environments.add(t.environment);
        const created = new Date(t.created_date);
        if (created < rep.firstSeen) rep.firstSeen = created;
        if (created > rep.lastSeen) rep.lastSeen = created;
      }
    }
    
    // Calculate reputation scores and flag high-risk IPs
    for (const [ip, rep] of Object.entries(ipReputation)) {
      rep.daysActive = Math.max(1, (rep.lastSeen - rep.firstSeen) / (1000 * 60 * 60 * 24));
      const threatsPerDay = rep.totalThreats / rep.daysActive;
      
      // Reputation score: lower = more dangerous
      let reputationScore = 100;
      if (rep.totalThreats >= 5) reputationScore -= 20;
      if (rep.totalThreats >= 10) reputationScore -= 15;
      if (rep.criticalCount >= 3) reputationScore -= 25;
      if (threatsPerDay >= 2) reputationScore -= 20;
      if (rep.threatLevels.has('critical')) reputationScore -= 10;
      if (rep.environments.size >= 2) reputationScore -= 10; // Multi-environment attacker
      
      rep.reputationScore = Math.max(0, reputationScore);
      rep.threatsPerDay = threatsPerDay;
    }

    // ── 2. AI-Powered Burst Detection: same IP with 3+ threats ───────────────
    const ipCounts = {};
    for (const t of allThreats) {
      if (t.source_ip) {
        ipCounts[t.source_ip] = (ipCounts[t.source_ip] || 0) + 1;
      }
    }
    
    for (const [ip, count] of Object.entries(ipCounts)) {
      if (count >= 3) {
        const existing = allAnomalies.find(
          a => a.source_ip === ip && a.anomaly_type === 'behavioral' && a.status !== 'neutralized'
        );
        
        if (!existing) {
          const rep = ipReputation[ip] || { reputationScore: 100, totalThreats: count, daysActive: 1 };
          
          // Auto-escalate severity for low-reputation IPs
          let baseSeverity = count >= 6 ? 'fatal' : count >= 5 ? 'critical' : 'warning';
          if (rep.reputationScore < 50) baseSeverity = 'critical';
          if (rep.reputationScore < 30) baseSeverity = 'fatal';
          
          // AI-powered burst analysis
          try {
            const burstAnalysisPrompt = `Analyze this burst attack pattern in real-time.
            
IP Address: ${ip}
Number of Threats: ${count}
Time Window: Last 5 minutes
IP Reputation Score: ${rep.reputationScore}/100 (lower = more dangerous)
Total Historical Threats: ${rep.totalThreats || count}
Days Active: ${rep.daysActive?.toFixed(1) || 'N/A'}

Assess:
1. Is this a coordinated attack, botnet activity, or false positive?
2. What is the attack sophistication level (1-10)?
3. Should this be escalated to critical/fatal immediately?

Return JSON:
{
  "attack_type": "coordinated" | "botnet" | "scanner" | "false_positive",
  "sophistication_level": number (1-10),
  "should_escalate": boolean,
  "confidence_score": number (0-100),
  "analysis": string
}`;

            const aiBurstAnalysis = await base44.integrations.Core.InvokeLLM({
              prompt: burstAnalysisPrompt,
              response_json_schema: {
                type: "object",
                properties: {
                  attack_type: { type: "string" },
                  sophistication_level: { type: "number" },
                  should_escalate: { type: "boolean" },
                  confidence_score: { type: "number" },
                  analysis: { type: "string" }
                },
                required: ["attack_type", "sophistication_level", "should_escalate", "confidence_score", "analysis"]
              }
            });

            const burstAI = JSON.parse(burstAnalysisPrompt);
            const severity = burstAI.should_escalate || rep.reputationScore < 40 ? 'fatal' : baseSeverity;
            
            await base44Service.entities.ZeroDayAnomaly.create({
              anomaly_signature: `BURST-${ip.replace(/\./g, '-')}-${Date.now().toString(36)}`,
              anomaly_type: 'behavioral',
              severity: severity,
              status: 'detected',
              source_ip: ip,
              confidence_score: burstAI.confidence_score || Math.min(95, 50 + count * 8 + (100 - rep.reputationScore) / 5),
              notes: `AI-Powered Burst Analysis: ${burstAI.analysis}. Attack type: ${burstAI.attack_type}, Sophistication: ${burstAI.sophistication_level}/10. Total threats: ${count}. IP Reputation: ${rep.reputationScore}/100 (repeat offender: ${rep.totalThreats || count} threats over ${rep.daysActive?.toFixed(1) || '?'} days).`,
              environment: 'production',
              obfuscation_level: Math.min(10, Math.floor(burstAI.sophistication_level)),
            });
            
            console.log(`[AEGIS SCANNER] AI Burst Analysis: ${ip} | ${count} threats | Rep: ${rep.reputationScore}/100 | Type: ${burstAI.attack_type} | Confidence: ${burstAI.confidence_score}%`);
            detectedCount++;
          } catch (aiError) {
            // Fallback to heuristic analysis with reputation
            await base44Service.entities.ZeroDayAnomaly.create({
              anomaly_signature: `BURST-${ip.replace(/\./g, '-')}-${Date.now().toString(36)}`,
              anomaly_type: 'behavioral',
              severity: severity,
              status: 'detected',
              source_ip: ip,
              confidence_score: Math.min(95, 50 + count * 8 + (100 - rep.reputationScore) / 5),
              notes: `Burst attack pattern: ${count} threats from ${ip}. IP Reputation: ${rep.reputationScore}/100. Auto-detected by Aegis Scanner.`,
              environment: 'production',
            });
            console.log(`[AEGIS SCANNER] Burst detected from ${ip}: ${count} threats | Rep: ${rep.reputationScore}/100 (heuristic)`);
            detectedCount++;
          }
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
    
    // ── 3. Reputation-Based Auto-Lock — Low-rep IPs get instant scrutiny ────
    // Any new threat from IP with reputation < 40 gets auto-locked
    const lowRepThreats = allThreats.filter(t => 
      !['destroyed', 'cleared', 'locked'].includes(t.status) &&
      t.source_ip &&
      ipReputation[t.source_ip] &&
      ipReputation[t.source_ip].reputationScore < 40
    );
    
    for (const threat of lowRepThreats.slice(0, 10)) {
      const rep = ipReputation[threat.source_ip];
      await base44Service.entities.Threat.update(threat.id, {
        status: 'locked',
        threat_level: rep.reputationScore < 20 ? 'critical' : 'high',
        base_chain_signature: `REP-LOCK-${Date.now().toString(36).toUpperCase()}`,
        notes: (threat.notes || '') + ` | Auto-locked: IP reputation ${rep.reputationScore}/100 (${rep.totalThreats} historical threats).`,
      });
      
      await base44Service.entities.SecurityEvent.create({
        event_type: 'threat_locked',
        threat_id: threat.id,
        severity: 'warning',
        details: `Reputation-based auto-lock: ${threat.source_ip} (Rep: ${rep.reputationScore}/100, ${rep.totalThreats} threats over ${rep.daysActive?.toFixed(1)} days)`,
        environment: threat.environment || 'production',
        base_chain_step: 'base0',
      });
      
      console.log(`[AEGIS SCANNER] Reputation lock: ${threat.source_ip} | Rep: ${rep.reputationScore}/100`);
      escalatedCount++;
    }
    
    // ── 4. Stale Threat Escalation ─────────────────────────────────────────
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
    
    // ── 5. Escalate uncontained critical anomalies ─────────────────────────
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
    
    // ── 6. Auto-deploy Honeypots & Tarpits for mirror-environment threats ────
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
    
    // ── 7. Keep QRNG active: advance any cycle_1/2/3 threats that haven't moved ──
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
    
    // ── 8. Auto-clear low-risk old cleared threats ─────────────────────────
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const oldCleared = allThreats.filter(
      t => t.status === 'cleared' && t.updated_date && new Date(t.updated_date) < new Date(oneDayAgo)
    );
    // Just log the count, don't delete — preserve audit trail
    cleanedCount = oldCleared.length;
    
    // ── 9. Log scanner heartbeat ───────────────────────────────────────────
    await base44Service.entities.SecurityEvent.create({
      event_type: 'qrng_cycle',
      severity: 'info',
      details: `Anomaly scanner cycle complete: ${detectedCount} new anomalies, ${escalatedCount} escalated, ${cleanedCount} old cleared threats`,
      environment: 'production',
      base_chain_step: 'qrng',
    });
    
    console.log(`[AEGIS SCANNER] Scan complete: +${detectedCount} detected, +${escalatedCount} escalated`);
    
    // Build reputation summary for logging
    const lowRepIPs = Object.entries(ipReputation)
      .filter(([_, rep]) => rep.reputationScore < 50)
      .map(([ip, rep]) => `${ip} (${rep.reputationScore}/100, ${rep.totalThreats} threats)`)
      .slice(0, 5);
    
    if (lowRepIPs.length > 0) {
      console.log(`[AEGIS SCANNER] Low-reputation IPs flagged: ${lowRepIPs.join(', ')}`);
    }
    
    return Response.json({
      success: true,
      scan_time: now.toISOString(),
      stats: {
        new_anomalies_detected: detectedCount,
        threats_escalated: escalatedCount,
        old_cleared_threats: cleanedCount,
        total_active_threats: allThreats.filter(t => !['cleared', 'destroyed'].includes(t.status)).length,
        total_open_anomalies: allAnomalies.filter(a => !['neutralized'].includes(a.status)).length,
        ip_reputation_tracked: Object.keys(ipReputation).length,
        low_reputation_ips: lowRepIPs.length,
      }
    });
    
  } catch (error) {
    console.error('[AEGIS SCANNER] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});